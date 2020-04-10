const electron = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const child_process = require('child_process');
const { Observable } = require('rxjs');
const Store  = require('./store.js');

class LocalQueue {
	
	tick_time = 5000;
	
	constructor(opts){
		this.options = opts;
		this.current_queue=new Store({configName : "queue", defaults : { queue :[] , running :[] , completed : [] } });
		this.locker=this.current_queue.userDataPath + "/locker/"
		if (! fs.existsSync(this.locker)){
			fs.mkdirSync(this.locker);
		}
		this.isAlive=true;
		this.tick();
	}
	
	destroy(){
		this.current_queue.save();
		this.isAlive=false;
	}
	
	add(job){
		job.times = { added : Date.now() };
		this.current_queue.data.queue.push(job);
		this.tick(true);
	}
	
	delJob(uid){
		return new Promise((resolve, reject)=>{
			let done = false;
			console.log(uid)
			this.current_queue.data.running.forEach((job)=>{
				if ( job.job.uid == uid) {
					done=true;
					child_process.execSync("echo \"###KILLED\" >> "+this.locker + "/" + job.job.uid+".err && kill -9 "+job.pid);
				}
			});
			if ( ! done ){
				this.current_queue.data.completed = this.current_queue.data.completed.filter((job)=>{
					if ( job.job.uid == uid){
						done = true;
						return false;
					}
					return true;
				});
				if  (! done ){
					this.current_queue.data.queue = this.current_queue.data.queue.filter((job)=>{
						if ( job.job.uid == uid){
							done = true;
							return false;
						}
						return true;
					});
				}
				
			}
			this.current_queue.save();
			if (done) {
				resolve("Job removed")
			} else {
				reject("Job not found")
			}
		})
		
	}
	
	writeFile(content, output_file){
		  return new Promise((resolve, reject)=>{
			  var stream = fs.createWriteStream(output_file);
			  stream.once('open', function(fd) {
				  stream.write(content);
				  stream.end();
				  resolve(output_file);
				  
			  });
			  stream.once('error', (err)=>{
				  reject(err);
			  });
		  });
	  }	
	
	runJob(job, observer){
		  let job_dir = job.wd;
		  child_process.exec("mkdir -p "+job_dir, {}, (error, stout, stderr)=>{
			  let promises=[];
			  if ( job.files ) {
				  job.files.forEach((file)=>{
					  promises.push(this.writeFile(file.content, job_dir+file.name));
				  });
			  }
			  if (job.copy_files){
				  job.copy_files.forEach((file)=>{
					 if ( file.copy_file ){
						 promises.push(new Promise((resolve, reject)=>{
							 console.log("cp "+file.origin_file+" "+job_dir+file.destination_file)
							 child_process.exec("cp "+file.origin_file+" "+job_dir+file.destination_file, {}, (err, stdout, stderr)=>{
								 if (err){
									 err.stderr=stderr;
									 err.stdout=stdout;
									 reject(err);
								 } else {
									 resolve();
								 }
							 });
						 }));
					 }  else {
						 promises.push(new Promise((resolve, reject)=>{
						 child_process.exec("ln -s "+file.origin_file+" "+job_dir+file.destination_file, {}, (err, stdout, stderr)=>{
							 if (err){
								 err.stderr=stderr;
								 err.stdout=stdout;
								 reject(err);
							 } else {
								 resolve();
							 }
						 } );
						 }));
					 }
				  });
			  }
			  observer.next({message :  "Setting up the environment" , code : 0 } )
			  Promise.all(promises).then((values)=>{
				  job.files = undefined;
				  let script_file=job_dir+"/runscript.sh"
				  this.writeFile(job.script, script_file).then((local_script)=>{
					  child_process.exec("chmod +x "+local_script, {}, ()=>{
						  this.add({command : local_script  , job : job });
						  observer.next({message: "Job added to the queue" , code : 0});
						  observer.complete();
					  });
				  }).catch((err)=>{
					  observer.error({message : "Error", code : 1 , error: err });
					  observer.complete();
				  })
				  
			  }, (err)=>{
				  observer.error({message : "Error during the environment setup", code : 1 , error: err });
				  child_process.exec("rm -fr "+job_dir)
				  observer.complete();
			  });
		  });
	}
	
	
	
	run(job){
		job.result = "Running";
		console.log("RUNNING!");
		console.log(job);
		let lock=this.locker+"/"+job.job.uid;
		var stream = fs.createWriteStream(lock+".sh");
		stream.once('open', function(fd) {
			stream.write("#!/bin/bash \n> "+lock+"\n"+job.command+ " 2> "+ lock+".err > "+ lock +".out  && rm "+lock+"\ntime_now=$(date +%s) \necho \"###COMPLETED_TIME:${time_now} \" >> "+ lock +".out");
			stream.end();
		});
		stream.once('error', (err)=>{
			console.log(err)
		});
		stream.once('close', ()=>{
			job.times.started = Date.now();
			child_process.execSync("chmod +x "+lock+".sh");
			let subprocess= child_process.spawn(lock+".sh", [], {detached: true, stdio: 'ignore' });
			job.pid = subprocess.pid;
			this.current_queue.data.running.push(job);
			this.current_queue.save();
		});
	}
	
	checkRunningQueue(){
		let avail_cores = os.cpus().length , free_mem = os.freemem() ;
		console.log("There are "+this.current_queue.data.running.length+" running jobs.");
		for ( let i=this.current_queue.data.running.length -1; i>=0; i-- ){
			let job=this.current_queue.data.running[i];
			let lock=this.locker+"/"+job.job.uid;
			let running=child_process.execSync("kill -0 "+job.pid + " &&  echo 'yes' || echo 'no' ", {encoding : "utf8"} );
			if (fs.existsSync(lock+".err")){
				job.stderr=fs.readFileSync(lock+".err", 'utf8');
			}
			if (fs.existsSync(lock+".out")){
				job.stdout=fs.readFileSync(lock+".out", 'utf8');
			}
			if ( running.match(/yes/)){
				console.log("Detected as running")
				avail_cores -= job.job.threads;
			} else {
				console.log("job completed")
				if (fs.existsSync(lock)){
					job.code = 1;
					job.result="ERROR! Job failed: lock is still there";
					this.removeFiles([ lock ]);
				} else {
					job.code = 0;
					job.result= "SUCCESS";
				}
				this.removeFiles([ lock+".err", lock+".out" , lock+".sh"]);
				if ( job.stdout ){
					let res = job.stdout.match(/###COMPLETED_TIME:([0-9]+)/);
					if (res && res[1]){
						job.times.completed = Number(res[1])*1000; /// Time in in seconds, we want ms
					}
				}
				if (! job.times.completed ) {
					job.code = 1 ;
					job.result = "ERROR! Job incomplete."
				}
				if ( job.stderr && job.stderr.match(/###KILLED/)){
					job.result ="Killed by user";
					job.code=1;
				}
				
				this.current_queue.data.completed.push(job);
				console.log("----------- JOB completed -----------");
				console.log(job);
				console.log("----------- JOB completed -----------");
				child_process.exec("rm -fr "+job.job.wd);
				this.current_queue.data.running.splice(i, 1);
				this.current_queue.save();
			}
		}
		
		return { threads :  avail_cores, memory : free_mem/1000000000};
		
	}
	
	removeFiles(fnames){
		fnames.forEach(f=>{
			fs.unlink(f, (err)=>{
				console.log(err);
			});
		})
	}
	getQueue(){
		return new Promise((resolve, reject)=>{
			let out = [], types =["queue", "running", "completed"];
			types.forEach((typ)=>{
				this.current_queue.data[typ].forEach((job)=>{
					job.type= typ;
					out.push(job);
			})});
			resolve(out);
		})
		
	}
	
	tick(soft){
		if ( this.tick_on && soft ){
			console.log("Requested an udesirable update")
			return;
		}
		this.tick_on=true;
		if ( ! this.current_queue.data.queue){
			this.current_queue.data.queue = [];
		}
		if ( this.current_queue.data.queue.length == 0 && this.current_queue.data.running.length == 0){
			this.tick_on=false;
			console.log("nothing to do")
			return;
		} 
		let resources= this.checkRunningQueue();
		if (resources.threads > 0){
			this.current_queue.data.queue = this.current_queue.data.queue.filter((job)=>{
				if ( job.job.threads >= os.cpus().length){
					 job.job.threads=os.cpus().length;
				}
				if ( resources.threads >= job.job.threads ) {
					resources.threads-=job.threads;
					this.run(job);
					return false
				} else {
					job.result = "<strong title=\""+resources.threads+" cpu available, "+ job.job.threads +" required \">Resources</strong>";
					return true;
				}
			});
		}
		if (this.isAlive) { 
			setTimeout(()=>{this.tick()}, this.tick_time);
		}
	}
}



module.exports = LocalQueue;