const electron = require('electron');
const fs = require('fs');
const Store  = require('./store.js');



class ClusterQueue {
	
	tick_time = 5000;
	
	constructor(ssh, settings, name){
		this.ssh = ssh;
		this.current_queue=new Store({configName : "queue_"+name, defaults : { queue :[]  } });
		this.settings=settings;
		this.isAlive=true;
		this.tick();
	}
	
	
	
	destroy(){
		this.isAlive=false;
	}
	
	
	delJob(uid){
		return new Promise((resolve, reject)=>{
			let done=false;
			this.current_queue.data.queue = this.current_queue.data.queue.filter((job)=>{
				if (job.job.uid == uid){
					done=true;
					if (! job.completed ){
						this.ssh.execCommand("scancel "+job.uid+" && rm -fr "+job.job.wd).catch(err=>{
							console.log(err);
						})
					} else {
						this.ssh.execCommand("rm -fr "+job.job.wd).catch(err=>{
							console.log(err);
						})
					}
					return false;
				} else {
					return true;
				}
			});
			this.current_queue.save();
			if (done) {
				resolve("Job removed")
			} else {
				reject("Job not found")
			}
		})
		
	}
	
	writeFile(content, file){
		return new Promise((resolve, reject)=>{
			let tmp_file=electron.app.getPath('userData') +"/.tmp_script_"+Date.now()+"_"+Math.floor(Math.random() * 1000);
			var stream = fs.createWriteStream(tmp_file);
			stream.once('open', (fd)=>{
				  stream.write(content);
				  stream.end();
		    });
			stream.once('error', (err)=>{
				  reject(err);
			  });
			stream.once('finish', ()=>{
				this.ssh.putFile(tmp_file, file).then(()=>{
					  resolve(file);
					  fs.unlink(tmp_file, (err)=>{
						  if (err){
							  console.log(err)
						  }
					  });
				  }).catch((err)=>{
					  console.log(err);
					  reject(err);
				  });
			})
		});
	}
	
	runJob(job, observer){
		  this.ssh.execCommand("mkdir -p "+job.wd).then((result)=>{
			  if ( result.code != 0 ){
				  observer.error(result);
				  observer.complete();
				  return;
			  }
			  let promises=[];
			  if ( job.files ) {
				  let writing_process= job.files.reduce( async (prevPromise,file)=>{
					  await prevPromise;
					  return this.writeFile(file.content, job.wd+file.name)  
				  }, Promise.resolve());
				  promises.push(new Promise((resolve, reject)=>{
					  writing_process.then(()=>{
						  resolve();
					  })
				  }));
			  }
			  if (job.copy_files){
				  let copy_process = job.copy_files.reduce(async (prevPromise, file)=>{
					  await prevPromise;
						 if ( file.copy_file ){
							 return this.ssh.execCommand("cp "+file.origin_file+" "+job.wd+file.destination_file);
						 }  else {
							 return this.ssh.execCommand("ln -s "+file.origin_file+" "+job.wd+file.destination_file);
						 }
					  }, Promise.resolve());
				  promises.push(new Promise((resolve, reject)=>{
					  copy_process.then(()=>{
						  resolve();
					  })
				  }));
			  }
			  observer.next({message :  "Setting up the environment" , code : 0 } )
			  Promise.all(promises).then((values)=>{
				  job.files=undefined; /// save up some space
				  let script_file = job.wd+"/runscript.sh";
				  this.writeFile(job.script, script_file).then((script_file)=>{
					  this.ssh.execCommand("chmod +x "+script_file).then(result=>{
						  this.run({command : script_file  , job : job });
						  observer.next({message: "Job added to the queue" , code : 0});
						  observer.complete(); 
					  });
				  }).catch((err)=>{
					  observer.error({message : "Error", code : 1 , error: err });
					  observer.complete();
				  })
				  
			  }, (err)=>{
				  observer.error({message : "Error during the environment setup", code : 1 , error: err });
				  this.ssh.execCommand("rm -fr "+job.wd).catch((err)=>{
					  console.log(err);
				  })
				  observer.complete();
			  });
		  });
	}
	
	run(job){
		job.times = { added : Date.now() };
		let run_command = this.buildClusterCommand(job.command, job.job);
		this.ssh.execCommand(run_command).then((result)=>{
			if (result.code == 0 && result.stdout && result.stdout.length > 0 ){
				job.uid = this.settings.parse_job_number(result.stdout);
				this.current_queue.data.queue.push(job);
				this.current_queue.save();
			} else {
				throw result.stderr;
			}
		}).catch((err)=>{
			console.log(err);
		});
	}
	
	
	buildClusterCommand(file, job){
    	let out= this.settings["exec"] + " " + this.settings["stdout"] + file + ".out ";
    	out = out + this.settings["stderr"] + file+ ".err ";
    	out = out + this.settings["wd"] + job.wd + " ";
    	if ( this.settings["memory"] && job.memory ){
    		out = out + this.settings["memory"] + this.settings.formatMemoryFromGb(job.memory)+" "; 
    	}
    	if ( this.settings["tasks"] && job.threads ){
    		out = out + this.settings["tasks"] + job.threads+" "; 
    	}
    	out = out + " " + file;
    	return out;
    }
	
	updateQueue(){
		return new Promise((resolve, reject)=>{
			this.ssh.execCommand(this.settings["check_all"]).then((result)=>{
				let queue_cluster = this.settings.parse_jobs(result.stdout);
				this.current_queue.data.queue.forEach((job)=>{
					if ( ! job.completed || job.result == "No info"   ){
						this.ssh.execCommand("cat "+job.job.wd+"runscript.sh.out && cat "+job.job.wd+"runscript.sh.err >&2" ).then((log)=>{
							if ( log.code == 0 ){
								job.stderr= log.stderr;
								job.stdout = log.stdout;
							} else {
								job.stderr="";
								job.stdout ="";
							}
							let c_job;
							if (queue_cluster){
								c_job =queue_cluster.find(cl => {
									return cl.uid == job.uid;
								});
							}
							if (c_job){
								job.cluster_info = c_job;
								job.times.started = c_job.started;
								job.type=job.cluster_info.type;
								job.result=job.cluster_info.info;
								job.completed=false;
							} else {
								this.ssh.execCommand(this.settings.check_completed_job+job.uid).then((response)=>{
									let completed_job_cluster = this.settings.completed_job_parse(response.stdout);
									console.log(completed_job_cluster)
									if (completed_job_cluster && completed_job_cluster.length > 0){
										job.cluster_info = completed_job_cluster[0];
										job.result = job.cluster_info.state ; 
										job.times.completed = job.cluster_info.times.completed;
										job.times.started = job.cluster_info.times.started;
										job.type=job.cluster_info.type;
									} else {
										job.type = "queue";
										job.result = "No info";
										job.code = 1;
									}
									this.current_queue.save();
									if ( job.type == "completed" ){
										job.completed=true;
										this.ssh.execCommand("rm -fr "+job.job.wd +" ").catch(err=>{
											console.log(err);
										});
									}
								}).catch(err=>{
									console.log(err);
								})
								this.current_queue.save();
							}
						}).catch((err)=>{console.log(err)})
					} else {
						job.type="completed";
					}
				});
				resolve();
			}).catch((err)=>{
				reject();
			});
		})
	}
	
	getQueue(){
		return new Promise((resolve, reject)=>{
			let out = JSON.parse(JSON.stringify(this.current_queue.data.queue));
			resolve(out);
		})
		
	}
	
	tick(soft){
		if ( this.tick_on && soft ){
			console.log("Requested an udesirable update")
			return;
		}
		this.tick_on=true;
		this.updateQueue().then(()=>{
			if ( this.current_queue.data.queue.length == 0 ){
				this.tick_on=false;
				console.log("nothing to do")
				return;
			} 
			if (this.isAlive) { 
				setTimeout(()=>{this.tick()}, this.tick_time);
			}
		}).catch(err=>{
			console.log(err);
		});
	}
}



module.exports = ClusterQueue;



