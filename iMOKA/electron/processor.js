const electron = require('electron');
const fs = require('fs');
const os = require('os');
const node_ssh = require('node-ssh');
const child_process = require('child_process');
const { Observable } = require('rxjs');
const iMOKA = require('./iMOKA.js')
const rimraf = require("rimraf");
const ClusterQueue = require("./clusterQueue.js");
const SimCry = require("simple-crypto-js").default;

const secret_key="TwoNo7esShyOfAn0ct4ve";
let imoka =new iMOKA();
let crypt = new SimCry(secret_key);
const {download} = require('electron-dl');


const clusterCommands = {
		"slurm" : {
			"exec" : "sbatch ", 
			"check_job" : "squeue -o \"%i\t%P\t%j\t%u\t%T\t%M\t%l\t%D\t%C\t%m\t%Q\t%R\t%g\t%S\"  -j ",
			"check_all" : "squeue -o \"%i\t%P\t%j\t%u\t%T\t%M\t%l\t%D\t%C\t%m\t%Q\t%R\t%g\t%S\" | grep $USER ",
			"check_completed_job" : "sacct --format=JobID,partition,state,time,start,end,elapsed,nodelist -j " ,
			"completed_job_parse" : (stdout)=>{
				let tmp= stdout.split("\n");
				if (tmp.length >= 3){
					let out = [];
					let header = tmp[0].split(/\s+/);
					for ( let i = 2; i < tmp.length ; i+=3){
						let out_i={raw : {}}
						tmp[i]=tmp[i].trim().split(/\s+/);
						for (let j=0; j< header.length; j++){
							if (header[j] && header[j].length > 0 ){
								out_i.raw[header[j]]=tmp[i][j]
							}
						}
						out_i.state = out_i.raw.State;
						if ( out_i.state == "RUNNING" ){
							out_i.type ="running"
						} else if (out_i.state == "COMPLETED" ){
							out_i.type ="completed"
						} else {
							out_i.type ="queue"
						}
						out_i.uid = out_i.raw.JobID;
						out_i.times = {completed : Date.parse(out_i.raw.End) , 
								started : Date.parse(out_i.raw.Start) };
						out.push(out_i);
					}
					return out;
				} else {
					return undefined;
				}
			},
			"stderr" : "-e ", 
			"stdout" : "-o ",
			"timeLim" : "-t ",
			"partition" : "-p ",
			"tasks" : "-c ",
			"memory" : "--mem=", 
			"wd" : "-D ",
			"parse_job_number" : (stdout)=>{
				let tmp=stdout.split(" ");
				return parseInt(tmp[tmp.length-1]);
			},
			"parse_jobs" : (stdout)=>{
				let tmp= stdout.split("\n");
				if (tmp.length >= 2){
					let out = [];
					let header = tmp[0].split("\t");
					for ( let i = 1; i < tmp.length ; i++){
						let out_i={raw : {}}
						tmp[i]=tmp[i].split("\t");
						for (let j=0; j< header.length; j++){
							out_i.raw[header[j]]=tmp[i][j]
						}
						out_i.running = out_i.raw.STATE != "PENDING"  ;
						out_i.running_time = out_i.raw.TIME;
						if ( out_i.raw.START_TIME != "N/A" ) {
							out_i.started = Date.parse(out_i.raw.START_TIME);
						}
						out_i.state= out_i.raw.STATE;
						if ( out_i.state == "RUNNING" ){
							out_i.type ="running"
						} else if (out_i.state == "COMPLETED" ){
							out_i.type ="completed"
						} else {
							out_i.type ="queue"
						}
						out_i.info = out_i.raw["NODELIST(REASON)"];
						out_i.uid = out_i.raw.JOBID;
						out.push(out_i);
					}

					return out;
				} else {
					return undefined;
				}
			}, 
			"formatMemoryFromGb" : (memGb)=>{
				return memGb*1000 ; 
			}
		}
}


class Processor {
	error_message;
	warning_message="";
	options=undefined;
	blocked=false;
	queue;
	tmp_dir;
	constructor(opts, mess) {
		this.setOptions(opts).catch((err)=>{
			console.log(err)
		});
		this.mess = mess;
	}

	setQueue(que){
		this.queue=que;
		this.queue.messanger = this.mess;
	}
	getQueue(){
		return new Promise((resolve, reject)=>{
			if ( this.queue){
				this.queue.getQueue().then((res)=>{
					resolve(res)
				}).catch(err=>{
					reject(err);  
				})
			} else {
				reject("No queue present");
			}
		})
	}

	setOptions(opts){
		return new Promise((resolve, reject)=>{
			if ( this.options ){
				reject("Options already present")
			} else {
				if ( ! opts ){
					reject("Options given are empty");
				} else {
					this.options = opts;
					if (this.options.connection_type=="cluster"){
						this.getSSH().then((ssh)=>{
							this.queue = new ClusterQueue(ssh, clusterCommands[this.options.cluster_type], this.options.id, this.mess );
							resolve();
						}).catch((err)=>{
							console.log(err);
							reject(err);
						});
					} else {
						resolve();
					}
				}
			}
		});
	}

	deleteMatrix(matrix_uid){
		return new Promise((resolve, reject)=>{
			if ( this.isInit()){
				let matrix_dir=this.options.storage_folder+"/experiments/"+matrix_uid;
				if (this.options.connection_type == 'local'){
					if (fs.existsSync(matrix_dir) ){
						rimraf(matrix_dir, (err)=>{ if (err ){
							reject(err)
						} else {
							resolve("Matrix removed")
						} } );
					}else {
						reject("Matrix not found!");
					}
				} else {
					this.getSSH().then((ssh)=>{
						ssh.execCommand("rm -fr "+matrix_dir).then((res)=>{
							if (res.code == 0 ){
								resolve("Matrix removed")
							} else {
								reject(res.stderr)
							}
						}).catch((err)=>{
							reject(err)
						});
					}).catch((err)=>{
						reject(err);
					})
				}
			} else {
				reject("Processor not initialized");
			}
		});
	}

	getAggregated(matrix_uid){
		return new Promise((resolve, reject)=>{
			let matrix_file = this.options.storage_folder+"/experiments/"+matrix_uid+"/aggregated.json";
			if ( this.options.connection_type == 'local') {
				if ( fs.existsSync(matrix_file) ){
					console.log("exists")
					resolve(matrix_file);
				} else {
					reject("File doesn't exists!");
				}
			} else {
				let tmp_file=this.tmp_dir+"/aggregated.tmp.json";
				this.mess.block({message : "Retrieving the remote matrix..."})
				this.getRemoteFile(matrix_file, tmp_file).then(()=>{
					this.mess.block({message : "Downloaded, opening..."})
					let mat=JSON.parse(fs.readFileSync(tmp_file));
					mat.file_name = matrix_file;
					this.mess.release({message : "Completed"})
					resolve(mat);
				}).catch((err)=>{
					this.mess.release({message : "Error!"})
					console.log(err);
					reject(err);
				})
			}    
		});
	}
	
	getSOM(matrix_uid, exp_name, nnodes){
		return new Promise((resolve, reject)=>{
			let fname;
			this.matrices.forEach((mat)=>{
				if ( mat.uid == matrix_uid){
					mat.som.forEach((som)=>{
						if ( som.name == exp_name ){
							som.experiments.forEach((exp)=>{
								if (exp.nsize == nnodes){
									fname=exp.file;
								}
							})
						}
					})
				}
			})
			if (! fname ) {
				reject("File not found");
			}
			if ( this.options.connection_type == 'local') {
				if ( fs.existsSync(fname) ){
					resolve(fname);
				} else {
					reject("File doesn't exists!");
				}
			} else {
				this.mess.block({message : "Retrieving the remote SOM..."})
				this.getSSH().then((ssh)=>{
					ssh.execCommand("cat "+fname).then((res)=>{
						if (res.code == 0){
							let mat=JSON.parse(res.stdout);
							mat.file_name = fname;
							resolve(mat);
						} else {
							reject("File doesn't exists!")
						}
					}).catch((err)=>{reject(err);}).finally(()=>{
						this.mess.release({message : "Done"})
					})
				})

			}    
		});
	}

	getModel(matrix_uid, model_name){
		return new Promise((resolve, reject)=>{
			let model_file = this.options.storage_folder+"/experiments/"+matrix_uid+"/RF/"+model_name+".json";
			if ( this.options.connection_type == 'local') {
				if ( fs.existsSync(model_file) ){
					console.log("exists")
					resolve(model_file);
				} else {
					reject("File doesn't exists!");
				}
			} else {
				this.mess.block({message : "Retrieving the remote Model..."})
				this.getSSH().then((ssh)=>{
					ssh.execCommand("cat "+model_file).then((res)=>{
						if (res.code == 0){
							let mat=JSON.parse(res.stdout);
							mat.file_name = model_file;
							resolve(mat);
						} else {
							reject("File doesn't exists!")
						}
					}).catch((err)=>{reject(err);}).finally(()=>{
						this.mess.release({message : "Done"})
					})
				})

			}    
		});
	}

	getMatrices(update=false){
		return new Promise((resolve, reject)=>{
			if (this.matrices && ! update){
				resolve(this.matrices)
			} else {
				if ( this.isInit()){
					let matrix_dir=this.options.storage_folder+"/experiments/", mod_dir;
					if (this.options.connection_type == 'local'){
						if (! fs.existsSync(matrix_dir) ) fs.mkdirSync(matrix_dir);
						fs.readdir(matrix_dir, {withFileTypes : true}, (err, files)=>{
							if ( err ) reject(err);
							this.matrices = [];
							files.forEach(s_dir =>{
								if ( s_dir.isDirectory() ){
									if (fs.existsSync(matrix_dir+"/"+s_dir.name+"/matrix.json")){
										(s_dir)
										let mat = JSON.parse(fs.readFileSync(matrix_dir+"/"+s_dir.name+"/matrix.json"));
										// TODO: Check that sample of the matrix
										// exists, otherwise give an error
										// message
										if ( fs.existsSync(matrix_dir+"/"+s_dir.name+"/reduced.matrix.json")) {
											mat.reduced = JSON.parse(fs.readFileSync( matrix_dir+"/"+s_dir.name+"/reduced.matrix.json"));
										}
										if (fs.existsSync(matrix_dir+"/"+s_dir.name+"/aggregated.info.json")){
											mat.aggregated = JSON.parse(fs.readFileSync( matrix_dir+"/"+s_dir.name+"/aggregated.info.json"));
										}
										mod_dir = matrix_dir+s_dir.name+"/RF/";
										if (!fs.existsSync(mod_dir) ) fs.mkdirSync(mod_dir);
										let mods= fs.readdirSync(mod_dir, {withFileTypes : true})
										mat.models=[]
										mods.filter((d)=>d.name.includes(".info.json")).forEach((modf)=>{
											let mod= JSON.parse(fs.readFileSync(mod_dir+modf.name));
											mod.name = modf.name.replace(".info.json", "");
											mat.models.push(mod);
										})
										mod_dir = matrix_dir+s_dir.name+"/SOM/";
										if (!fs.existsSync(mod_dir) ) fs.mkdirSync(mod_dir);
										mods= fs.readdirSync(mod_dir, {withFileTypes : true});
										mat.som=[]
										mods.filter((d)=>d.name.includes(".info.json")).forEach((modf)=>{
											let mod= JSON.parse(fs.readFileSync(mod_dir+modf.name));
											mod.message=undefined;
											mod.name = modf.name.replace(".info.json", "");
											if (! mod.experiments ) {
												if ( fs.existsSync(mod_dir+modf.name) ){
													mod.experiments= [];
													mod.nnsize.split(",").forEach((n)=>{
														let fname = mod_dir+mod.name+"/results_"+n+"x"+n+"_lr"+mod.learn_rate+"_it"+mod.iterations+(mod.norm ? "norm/" : "/")+"iMOKA_som.json";
														mod.experiments.push({"nsize": n, "file" : fname })
													})
													fs.writeFileSync(mod_dir+modf.name, JSON.stringify(mod));
												} else {
													mod.message= "In progress";
												}

											}
											if ( mod.experiments ){
												mod.experiments.forEach(exp=>{
													if (!fs.existsSync(exp.file)){
														if (mod.message){
															mod.message+="\n"+exp.file+" doesn't exists";
														} else {
															mod.message=exp.file+" doesn't exists";
														}
													}
												})
											}
											mat.som.push(mod);
										})
										this.matrices.push(mat);
									}
								}
							});
							resolve(this.matrices);
						});
					} else {
						this.getSSH().then((ssh)=>{
							this.getRemoteMatrices(ssh).then((matrices)=>{
								resolve(matrices);
							})
							
						}).catch((err)=>{
							reject(err);  
						})
					}
				} else {
					reject("Processor not initialized");
				}
			}

		});
	}

	async getRemoteMatrices(ssh){
		try {
			this.mess.block({message : "Loading remote matrices..."})
			let matrix_dir=this.options.storage_folder+"/experiments/";
			let res= await ssh.execCommand("mkdir -p "+matrix_dir+" && ls -l "+matrix_dir +" | awk '/^d/ {print $NF}'");
			this.matrices=[];
			if (res.code == 0 && res.stdout.length > 1){
				let muids= res.stdout.split("\n"), muid;
				for (let i=0; i<muids.length; i++){
					muid=muids[i];
					let res = await ssh.execCommand("cat "+matrix_dir+"/"+muid+"/matrix.json");
					if (res.code == 0 && res.stdout.length > 0){
						let curr_matrix = JSON.parse(res.stdout);
						res = await ssh.execCommand("cat "+matrix_dir+"/"+muid+"/reduced.matrix.json");
						if (res.code == 0 && res.stdout.length > 0){
							curr_matrix.reduced = JSON.parse(res.stdout)
						}
						res = await ssh.execCommand("cat "+matrix_dir+"/"+muid+"/aggregated.info.json");
						if ( res.code == 0 && res.stdout.length > 0 ){
							curr_matrix.aggregated = JSON.parse(res.stdout);
						}
						let mod_dir=matrix_dir+muid+"/RF/";
						let cmd="mkdir -p "+mod_dir+" && ls -l "+mod_dir+"*.info.json | awk '{n=split($NF, arr, \"/\"); getline line < $NF;  print arr[n] \"\t\" line}' ";
						res = await ssh.execCommand(cmd)
						curr_matrix.models = [];
						if (res.code == 0 && res.stdout.length > 0 ){
							let mods = res.stdout.split("\n");
							mods.forEach((frf)=>{
								if ( frf.length > 0 ){
									frf=frf.split("\t")
									let mod= JSON.parse(frf[1]);
									mod.name = frf[0].replace(".info.json", "");
									curr_matrix.models.push(mod);
								}
							});
						}
						mod_dir=matrix_dir+muid+"/SOM/";
						cmd="mkdir -p "+mod_dir+" && ls -l "+mod_dir+"*.info.json | awk '{n=split($NF, arr, \"/\"); getline line < $NF;  print arr[n] \"\t\" line}' ";
						res = await ssh.execCommand(cmd)
						curr_matrix.som = [];
						if (res.code == 0 && res.stdout.length > 0 ){
							let mods = res.stdout.split("\n");
							mods.forEach((fsom)=>{
								if ( fsom.length > 0 ){
									fsom =fsom.split("\t"); 
									let mod= JSON.parse(fsom[1]);
									mod.name = fsom[0].replace(".info.json", "");
									mod.experiments= [];
									mod.nnsize.split(",").forEach((n)=>{
										let fname = mod_dir+mod.name+"/results_"+n+"x"+n+"_lr"+mod.learn_rate+"_it"+mod.iterations+(mod.norm ? "norm/" : "/")+"iMOKA_som.json";
										mod.experiments.push({"nsize": n, "file" : fname })
									})
									curr_matrix.som.push(mod);
								}
							});
						}
						this.matrices.push(curr_matrix);
					}
				};
			}
			this.mess.release({message : "Done!"})
			return this.matrices;
		} catch(e){
			throw e
		}
	}

	importKmerList(request){
		return new Promise((resolve, reject)=>{
			let agg = request.info;
			let new_matrix = {k_len  : agg.k_len, name : request.new_name, imported: true , uid : agg.uid , groups : agg.groups, 
					groups_names : agg.groups_names, names : agg.samples_names};
			new_matrix.groups=new_matrix.groups.map((n)=>new_matrix.groups_names[n]);
			let mat_dir =this.options.storage_folder+"/experiments/"+new_matrix.uid;
			if (this.options.connection_type == 'local'){
				fs.mkdirSync(mat_dir);
				fs.writeFileSync(mat_dir+"/matrix.json", JSON.stringify(new_matrix));
				fs.writeFileSync(mat_dir+"/aggregated.info.json", JSON.stringify(agg));
				fs.copyFileSync(request.original_request, mat_dir+"/aggregated.json");
				resolve("Done!");
			} else {
				this.getSSH().then((ssh)=>{
					ssh.execCommand("mkdir -p "+mat_dir).catch((err)=>{
						reject(err)
					}).then((res)=>{
						if (res.code == 0){
							fs.writeFileSync(this.tmp_dir+"/matrix.json", JSON.stringify(new_matrix));
							fs.writeFileSync(this.tmp_dir+"/aggregated.info.json", JSON.stringify(agg));
							this.mess.block({ message : "Importing "+new_matrix.name})
							ssh.putFiles([{local: request.original_request, remote: mat_dir+"/aggregated.json"}, 
								{local:this.tmp_dir+"/matrix.json", remote : mat_dir+"/matrix.json" }, 
								{local : this.tmp_dir+"/aggregated.info.json", remote : mat_dir+"/aggregated.info.json"}]).catch((err)=>{
									reject(err)
								}).then(()=>{
									resolve("Matrix imported correctly.")
									this.mess.sendMessage({type : "action", action :"release", message : "Done!"})
								})
						}else {
							reject(res.stderr);
						}
					});
				});
			}
		});
	}


	setMatrix(matrix){
		return new Promise((resolve, reject)=>{
			if ( this.isInit()){
				this.getMatrices().then(()=>{
					if (this.options.connection_type == 'local'){
						let old_mat = this.matrices.findIndex((mat)=>{
							return mat.uid == matrix.uid;
						});
						if ( old_mat == -1){
							fs.mkdirSync(this.options.storage_folder+"/experiments/"+matrix.uid);
							fs.writeFileSync(this.options.storage_folder+"/experiments/"+matrix.uid+"/matrix.json", JSON.stringify(matrix));
						} else {
							fs.writeFileSync(this.options.storage_folder+"/experiments/"+matrix.uid+"/matrix.json", JSON.stringify(matrix));
							this.matrices[old_mat]=matrix;
						}
						resolve("Matrix "+matrix.name+" saved correctly");
					} else {
						this.getSSH().then((ssh)=>{
							let mat_dir=this.options.storage_folder+"/experiments/"+matrix.uid;
							ssh.execCommand("mkdir -p "+mat_dir).catch((err)=>{
								reject(err);
							}).then((res)=>{
								if (res.code != 0 ){
									reject(res.stderr)
								}else {
									fs.writeFileSync(this.tmp_dir+"/tmp_matrix.json", JSON.stringify(matrix));
									ssh.putFile(this.tmp_dir+"/tmp_matrix.json", mat_dir+"/matrix.json").then((res)=>{
										resolve("Matrix "+matrix.name+" saved correctly");

									}).catch((err)=>{
										reject(err);
									})
								}
							});
						}).catch((err)=>{
							reject(err);
						})

					}
				}).catch(err=>reject(err));
			}  else {
				reject("Processor not initialized");
			}
		});
	}
	
	async getRemoteFile(file, des_file){
		let ssh = await this.getSSH();
		let res = await ssh.getFile(des_file, file);
		return res;
	}

	async setSampleRemote(ssh, samples){
		
		let sam, res, sample_dir, log = samples.length > 5;
		for (let i=0; i< samples.length; i++){
			if ( log ) this.mess.block({ progress : Math.round((i*100)/samples.length) , message : "Saving the samples ("+i+"/"+samples.length+")... Don't close the software!" })
			sam = samples[i];
			sample_dir = this.options.storage_folder+"/samples/"+sam.name;
			res = await ssh.execCommand("ls "+sample_dir)
			if (res.code != 0 || res.stderr.length > 1){
				throw res.stderr
			} 
			sam.predictions = undefined;
			ssh.execCommand("echo '"+JSON.stringify(sam)+"' > "+sample_dir+"/"+sam.name+".metadata.json")
			
		};
		if ( log ) this.mess.sendMessage({type : "action", action :"release", message : "Done!"})
		return true;
	}
	setSample(samples){
		return new Promise((resolve, reject)=>{
			if (this.isInit()){
				let messages = [];
				if (this.options.connection_type == 'local'){
					samples.forEach((sam)=>{
						let sample_dir = this.options.storage_folder+"/samples/"+sam.name;
						if ( fs.existsSync(sample_dir)){
							fs.writeFileSync(sample_dir+"/"+sam.name+".metadata.json", JSON.stringify(sam));
						} else {
							messages.push("Sample "+ sam.name+" not found.")
						}
					});
					if ( messages.length == 0 ){
						resolve("Samples updated correctly");
					} else {
						reject(messages.join("\n"));
					}
				}else {
					this.getSSH().then((ssh)=>{
						this.setSampleRemote(ssh, samples).then(()=>{
							resolve("Samples updated correctly")
						})
					});
				}
			} else {
				reject("Projector not initialized");
			}
		});
	}
	current_samples;
	getSamples(request){
		return new Promise((resolve, reject)=>{
			if ( ! request.update && this.current_samples) {
				resolve(this.current_samples);
			} else {
			if (this.isInit()){
				let samples= [], samples_dir = this.options.storage_folder+"/samples/";
				if (this.options.connection_type == 'local'){
					if (! fs.existsSync(samples_dir) ) fs.mkdirSync(samples_dir);
					fs.readdir(samples_dir, {withFileTypes : true}, (err, files)=>{
						if ( err ) reject(err);
						files.forEach(s_dir =>{
							if (s_dir.isDirectory() ){
								let sample;
								if (fs.existsSync(samples_dir+s_dir.name+"/"+s_dir.name+".metadata.json") ){
									sample= JSON.parse(fs.readFileSync(samples_dir+s_dir.name+"/"+s_dir.name+".metadata.json"));
								}else {
									sample = {name : s_dir.name, libType : "NA", minCount : "NA", metadata : [], source : [], message : "Empty folder"}
								}
								if ( fs.existsSync(samples_dir+s_dir.name+"/"+s_dir.name+".json") ){
									let tmp_j = JSON.parse(fs.readFileSync(samples_dir+s_dir.name+"/"+s_dir.name+".json"));
									sample.count_file = tmp_j.count_files[0];
									sample.prefix_size = tmp_j.prefix_size[0];
									sample.total_count = tmp_j.total_counts[0];
									sample.total_prefix = tmp_j.total_prefix[0];
									sample.total_suffix = tmp_j.total_suffix[0];
									fs.writeFileSync(samples_dir+s_dir.name+"/"+s_dir.name+".metadata.json", JSON.stringify(sample));
									this.removeLocalFile(samples_dir+s_dir.name+"/"+s_dir.name+".json");
								} else {
									sample.message = "In process";
								}
								if ( fs.existsSync(samples_dir+s_dir.name+"/fastqc") ){
									let fqfs = fs.readdirSync(samples_dir+s_dir.name+"/fastqc/").filter((fn)=>{
										return fn.includes(".html");
									})
									if (fqfs.length == 1 ){
										sample.fastqc = "file://"+samples_dir+s_dir.name+"/fastqc/"+fqfs[0]
									}
								}
								if ( fs.existsSync(samples_dir+s_dir.name+"/PRED/") ){
									sample.predictions= [];
									fs.readdirSync(samples_dir+s_dir.name+"/PRED/").forEach((pred)=>{
										sample.predictions.push(JSON.parse(fs.readFileSync(samples_dir+s_dir.name+"/PRED/"+pred)));
									});
								}
								samples.push(sample);
							}
						});
						resolve(samples);
					});
				} else {
					this.getSSH().then((ssh)=>{
						this.getRemoteSamples(ssh).then((samples)=>{
							resolve(samples)
						})
					}).catch((err)=>{
						reject(err);
					})
				}
			} else {
				reject("Projector not initialized");
			}
			}
		});

	}
	
	async getRemoteSamples(ssh){
		
		try {
		let samples= [], samples_dir = this.options.storage_folder+"/samples/";
		let res = await ssh.execCommand("mkdir -p "+samples_dir+" && ls -l "+samples_dir+" | awk '/^d/ {print $NF}' ")
		if ( res.code == 0 ){
			let files=res.stdout.split("\n").filter((fname)=>{return fname.length > 0});
			this.mess.block({message : "Retrieving remote samples 0/"+files.length, progress : 0})
			let meta = await ssh.execCommand("cat "+samples_dir+"/*/*.metadata.json")
			let tot_files= files.length;
			if ( meta.stdout.length > 0 ){
				meta.stdout.replace(/}{/g, "}\n{").split("\n").forEach((el)=>{
					if (el.length > 0 ){
						samples.push(JSON.parse(el));
						if (samples.length % 10 == 0 ) this.mess.block({message : "Retrieving remote samples "+ samples.length+ "/"+ tot_files, progress : Math.round((samples.lenght *100)/ tot_files)})
					}
				})
			}
			files = files.filter((fname)=>{return samples.find((e)=>{return e.name == fname && e.count_file})? false : true;})
			if ( files.length != 0 ){
				let s_dir, n_sam = samples.length - files.length;
				for ( let i=0; i<files.length ; i++){
					s_dir = files[i];
					let fname=samples_dir+s_dir+"/"+s_dir+".json", sample;
					sample = {name : s_dir, libType : "NA", minCount : "NA", metadata : [], source : [], message : "In process"}
					res = await ssh.execCommand("[[ -f "+fname+" ]] &&  cat "+fname)
					if ( res.code == 0 && res.stdout.length > 1){
						let tmp_j = JSON.parse(res.stdout);
						let oSample = samples.find((s)=>{
							return s.name == sample.name; 
						});
						if ( oSample ) sample = oSample;
						sample.count_file = tmp_j.count_files[0];
						sample.prefix_size = tmp_j.prefix_size[0];
						sample.total_count = tmp_j.total_counts[0];
						sample.total_prefix = tmp_j.total_prefix[0];
						sample.total_suffix = tmp_j.total_suffix[0];
						sample.k_len = tmp_j.k_len;
						sample.message = "Imported";
						fname=samples_dir+"/"+s_dir+"/fastqc/"+s_dir+"_fastqc.html"
						res = await ssh.execCommand("[[ -f "+fname+" ]] && ls "+fname)
						if (res.code == 0 &&  res.stdout.length > 1){
							sample.fastqc = "remote://"+fname;
						}
						
						ssh.execCommand("echo '"+JSON.stringify(sample)+"' > "+samples_dir+s_dir+"/"+s_dir+".metadata.json")
					} 
					samples = samples.filter((s)=>{
						return s.name != sample.name;
					});
					
					samples.push(sample);
					this.mess.block({message : "Retrieving remote samples "+ (n_sam + i )+ "/"+ tot_files, progress : Math.round(((n_sam + i ) *100)/ tot_files)})
				};
			}
			let preds = await ssh.execCommand("cat "+samples_dir+"/*/PRED/*.json")
			if ( preds.stdout.length > 0 ){
				preds.stdout.split("}\n").forEach((pr)=>{
					if ( pr.length > 0){
						if (! pr.match(/}$/)) pr+="}";
						let pred = JSON.parse(pr);
						let idx=samples.findIndex((s)=>{return s.name == pred.sample});
						if (! samples[idx].predictions ) samples[idx].predictions=[];
						samples[idx].predictions.push(pred);
					}
				})
			}
			this.mess.release({ message : "Done!"})
			return samples;
		} else {
			return samples;
		}
		}catch (err){
			console.log(err)
			this.mess.release({message : "An error occurred"})
			this.mess.sendMessage({message : err , type : "aler"})
			return [];
		}
	}

	isInit(){
		if ( typeof this.options ==  'undefined'){
			return false;
		}
		return true;
	}
	
	
	
	delJob(uid){
		return new Promise((resolve, reject)=>{
			if ( this.queue){
				this.queue.delJob(uid).then((res)=>{
					resolve(res)
				}).catch(err=>{
					reject(err);
				})
			} else {
				reject("Queue not initialized")
			}
		})
	}

	run(proc){
		return new Promise((resolve, reject)=>{
			if (! this.isInit() ){
				reject({"message" : "Processor not initialized", code : 1});
				return;
			}
			let runJob = (pr)=>{
				return new Promise((res, rej)=>{
					imoka.createJob(pr).then((job)=>{
						pr.data.context = undefined;
						job.original_request = pr;
						if ( job.success ){
							job.wd =this.options.storage_folder + "/jobs/" + job.uid+"/" ;
							job.script = this.createScript(job.commands.join(" && ")+"\n", job)
							this.queue.runJob(job).then(()=>{
								res()
							}).catch((err)=>{
								rej(err);
							});
						} else {
							rej(job.message);
						}
					}).catch((err)=>{
						rej(err);
					});
				});
			}
			let processes = [];
			if (proc.data && proc.data.process && proc.data.process.njobs > 1 ){
				let raw_file_lines= proc.data.source.raw_file.split("\n").filter((l)=>l.length > 0);
				let l_per_file=Math.ceil(raw_file_lines.length / proc.data.process.njobs), procs=[];
				for ( let i=0; i< proc.data.process.njobs - 1 ; i++){
					procs.push(raw_file_lines.slice(i*l_per_file, (i+1)*l_per_file));
				}
				procs.push(raw_file_lines.slice((proc.data.process.njobs - 1)*l_per_file));
				let context = proc.data.context;
				proc.data.context = undefined;
				
				procs.forEach((raw_f, idx) =>{
					let spr = JSON.parse(JSON.stringify(proc));
					spr.data.uid=spr.data.uid+"_"+idx;
					spr.data.source.raw_file=raw_f.join("\n");
					spr.data.context = context;
					processes.push(spr);
				});
				
			} else {
				processes.push(proc);
			}
			try {
				processes.reduce(async (previousPromise, nextProc, idx , src) => {
					await previousPromise;
					if ( idx == src.length-1 ){
						return new Promise((rs)=>{
							runJob(nextProc).then(()=>{
								rs();
								resolve();
							}).catch((err)=>{
								reject(err);
							});
						});
					} else {
						return runJob(nextProc);
					}
					
				}, Promise.resolve());
			} catch (err) {
				reject(err);
			}
		});
	}




	checkSingularityVersion(singularity_version){
		this.singularity_version = singularity_version.split(" ")[2]
		if ( parseInt(this.singularity_version.split(".")[0]) < 3 ){
			this.error_message = "You need a version of Singularity >= 3 "
				return false;
		}
		this.options.singularity_version = singularity_version;
		return true;
	}

	checkOS(){
		if ( this.options.connection_type == "local" ){
			if ( os.type() != "Linux" ){
				this.error_message = "Only Linux OS is currently supported."
					return false;
			}
			try {
				this.checkSingularityVersion(child_process.execSync("singularity --version").toString())
			} catch (err ){
				if (typeof err == "string"){
					this.error_message = err;
				}else {
					this.error_message = JSON.stringify(err.message);
				}
				return false;
			}

			try {
				this.options.os = os.type();
				this.options.max_cpu = os.cpus().length;
				this.options.storage_folder.replace("\n", "");
				let storage_dir= child_process.execSync("mkdir -p "+this.options.storage_folder + "/.singularity/ && realpath "+this.options.storage_folder ).toString();
				this.options.storage_folder=storage_dir.replace("\n", "");
				this.blocked = true;
				if ( !fs.existsSync(this.options.storage_folder+"/.singularity/iMOKA") || this.options.update ){
				if ( this.options.remote_image){
					const win = electron.BrowserWindow.getFocusedWindow();
					console.log("Starting download of "+ this.options.original_image)
					download(win , this.options.original_image, {directory : this.options.storage_folder +"/.singularity/", filename : "iMOKA", onProgress : (prg)=>{
						this.mess.sendMessage({type : "action", action : "block", progress : Math.round(prg.percent*100) , message : "Downloading singularity image "+Math.round(prg.transferredBytes/1000000)+" Mb of "+Math.round(prg.totalBytes/1000000)+" Mb.\n Don't close the software!" })  
					}, onCancel :(it)=>{
						this.mess.sendMessage({type : "action", action :"release", message : "Error! Download was canceled! "})
						this.blocked = false;
					} , onStarted : (it)=>{
						this.mess.sendMessage({type : "action", action :"block", progress : 0 , message : "Downloading singularity image.\n Don't close the software!"})
					}} ).then((it)=>{
						this.mess.sendMessage({type : "action", action :"release", message : "Singularity image downloaded"})
						this.blocked = false;
					}).catch((err)=>{
						this.mess.sendMessage({type : "action", action :"release", message : err})
						this.blocked = false;
					});
				} else {
					let tick = ()=>{
						if (this.blocked){
							this.mess.sendMessage({ type : "action", action :"block", progress : -1 , message : "Copying singularity image.\n Don't close the software!"});
							setTimeout(tick, 1000);
						}	
					};
					tick();
					child_process.exec("cp -f "+this.options.original_image+" "+this.options.storage_folder +"/.singularity/iMOKA" , {} , (err)=>{
						this.mess.sendMessage({type : "action", action :"release", message : "Singularity image copied"})
						this.blocked = false;
					});
				}
				}

			} catch (err){
				this.error_message = err;
				return false;
			}
		} 
		return true;
	}

	encrypt(password){
		return "enc::"+crypt.encrypt(password);
	}
	decrypt(password){
		return crypt.decrypt(password.replace(/^enc::/, ""));
	}

	getSSH(){
		return new Promise((resolve, reject)=>{
			if (this.ssh){
				resolve(this.ssh)
			} else {
				let ssh = new node_ssh(), ssh_prom;
				if ( this.options.ssh_auth == "UsernamePassword"){
					if (! this.options.username ) throw "Username not given";
					if (! this.options.ssh_address ) throw "Host address not given";
					if (! this.options.password ) throw "Password not given";
					let pwd = this.decrypt(this.options.password);
					ssh_prom = ssh.connect({
						host : this.options.ssh_address,
						username :this.options.username,
						password : pwd
					});
				} else if (this.options.ssh_auth == "SshKey" ){
					if (! this.options.username ) throw "Username not given";
					if (! this.options.ssh_address ) throw "Host address not given";
					if (! this.options.private_key ) throw "Private key not given";
					ssh_prom= ssh.connect({
						host : this.options.ssh_address,
						username :this.options.username,
						password : this.options.private_key
					});
				} else {
					if (this.options.ssh_auth ){
						throw ("Authentication method " +  this.options.ssh_auth  + "is undefined." );      
					}else {
						throw ("Authentication method not given")
					}
				}
				ssh_prom.then((ssh)=>{
					this.ssh=ssh;
					resolve(ssh)
				}).catch((err)=>{
					reject(err);
				});
			}

		});
	}

	checkSSH(){
		return new Promise((resolve, reject) =>{
			this.getSSH().then((ssh)=>{
				ssh.execCommand("mkdir -p "+this.options.storage_folder + "/.singularity/ && realpath "+this.options.storage_folder).then((result)=>{
					let promise;
					if ( this.options.update ){
						if ( this.options.remote_image){
							promise=ssh.execCommand("wget "+this.options.original_image+" -O "+this.options.storage_folder + "/.singularity/iMOKA").catch((err)=>{
								console.log("Error copying the singularity image");
								this.mess.sendMessage({type : "action", action :"release", progress : -1 , message : "Error copying the singularity image"})
							})
						} else {
							promise=ssh.putFile(this.options.original_image, this.options.storage_folder + "/.singularity/iMOKA").catch((err)=>{
								console.log("Error copying the singularity image");
								this.mess.sendMessage({type : "action", action :"release", progress : -1 , message : "Error copying the singularity image"})
							});
						}
						this.mess.sendMessage({type : "action", action :"block", progress : -1 , message : "Downloading singularity image on "+this.options.ssh_address+". Don't close the software!"})
						promise.then((res)=>{
							if ( res.code == 0 ){
								this.mess.sendMessage({type : "action", action :"release", progress : -1 , message : "Image copied successfully!"})
							} else {
								this.mess.sendMessage({type : "action", action :"release", progress : -1 , message : "Error copying the image", details : res.stderr})
							}
							
						});
					}
					if (result.code != 0){
						reject(result.stderr);
						return;
					}
					this.options.storage_folder = result.stdout;
					if (! this.options.singularity_version ){
						let result_promise;
						if (this.options.connection_type == "cluster"){
							result_promise = this.execOnCluster("singularity --version", ssh, {}).toPromise();
						} else {
							result_promise = ssh.execCommand("singularity --version");
						}
						result_promise.then((result)=>{
							if ( result.code != 0 ){
								reject(result.stderr)
							};
							if (this.checkSingularityVersion(result.stdout)) {
								resolve();
							} else {
								reject(this.error_message)
							};
						}).catch((err)=>{console.log("Error in version detection");reject(err)});
					} else {
						resolve();
					}
					
				}).catch((err)=>{console.log("Error in environment setup ssh connection"); console.log(err);reject(err)});
			}).catch((err)=>{console.log("Error in getting ssh connection");reject(err)});
		});
	}

	checkOptions(opts){
		if (opts.password && ! opts.password.match(/^enc::/)){
			opts.password = this.encrypt(opts.password);
		}
		this.options=opts
		return new Observable(observer=>{
			console.log("check options")
			if ( ! this.options.storage_folder || this.options.storage_folder.length ==0 ) {
				this.error_message = "You need to specify a storage folder."
					observer.error(this.error_message);
			}
			if (this.options.original_image.match("^/|^file://")){
				this.options.original_image= this.options.original_image.replace(/^file:\//, "");
				if (! fs.existsSync(this.options.original_image) ){
					this.error_message ="File "+this.options.original_image+" doesn't exists." 
					observer.error(this.error_message);
				}
				this.options.remote_image=false;
			} else if (! this.options.original_image.match("^[s]?ftp://|http[s]?://")){
				this.error_message ="File "+this.options.original_image+" not recognized. Uset the full path or the url of the remote location."
				console.log(this.error_message)
				observer.error(this.error_message);
			} else {
				this.options.remote_image=true;
			}
			if (this.error_message){
				observer.complete();
				return;
			}

			if (! this.checkOS() ){
				observer.error(this.error_message) ;
			} else {
				observer.next("Local system settings work correctly");
			}
			if (this.options.connection_type != "local"  ) {
				observer.next("Checking remote configurations...");
				this.checkSSH().then(()=>{
					let message="Remote configuration works fine.";
					if ( this.warning_message ){
						observer.next(message+"<br/>"+this.warning_message)
					} else {
						observer.next(message);  
					}
					console.log("COMPLETED")
					observer.complete();
				}).catch((err)=>{observer.error(err); console.log(err);observer.complete();});
			}else {
				console.log("COMPLETED")
				observer.complete();
			}
		});
	}

	getJobNumber(stdout){
		let setting = clusterCommands[this.options.cluster_type];
		return setting.parse_job_number(stdout);
	}



	removeLocalFile(filename, error_callback){
		fs.unlink(filename, (err)=>{
			if (error_callback){
				error_callback(err)
			} else {
				console.log("Error removing file "+filename)
			}
		});
	}

	// / Execute small jobs on the cluster (use the queue for bigger jobs)
	execOnCluster(command, ssh, job_opts  ){
		return new Observable((observer)=>{
			if (this.options.module_load){
				command=this.options.module_load + "\n" + command; 
			}
			let tmp_file="/.tmp_script_"+Date.now();
			let local_file=electron.app.getPath('userData') + tmp_file;
			let script =this.createScript(command); 
			this.writeFile(script, local_file).then(
					(local_script)=>{
						let remote_script= this.options.storage_folder + tmp_file;
						ssh.putFile(local_script, remote_script).then(()=>{
							this.removeLocalFile(local_file);
							let cluster_command=this.buildClusterCommand(remote_script, job_opts);
							ssh.execCommand( cluster_command ).then((response)=>{
								if (response.code == 0 ){
									let job_n = this.getJobNumber(response.stdout);
									this.observeJob(job_n, remote_script).subscribe(observer);
								} else {
									observer.error(response.stderr);
								}
							}).catch((err)=>{
								console.log("Error in running the command");
								observer.error(err)
							});
						}).catch((err)=>{
							console.log("Error in transferring the file");
							observer.error(err)
						});
					}).catch((err)=>{
						console.log("Error in writing the file");
						observer.error(err)
					});
		});
	}
	// / Also this is for small and single jobs observation
	observeJob(job_n,remote_script ){
		return new Observable(observer=>{
			this.getSSH().then((ssh)=>{
				let setting = clusterCommands[this.options.cluster_type];
				let command=setting["check_job"]+job_n;
				let tick= function() {
					ssh.execCommand(command).then((response)=>{
						if (response.code == 0){
							let result = setting.parse_jobs(response.stdout);
							if ( result ){
								observer.next(result[0]);
								setTimeout(tick, 2000);
							} else {
								ssh.execCommand("sleep 1 && cat "+remote_script+".out && cat "+remote_script+".err >&2 && rm "+remote_script+"*").then((response)=>{
									observer.next(response);
									observer.complete();
								}).catch(observer.error);
							}
						} else {
							observer.error(response.stderr);
						}
					}).catch(observer.error);
				};
				setTimeout(tick, 500);
			}).catch((err)=>{observer.error(err); console.log(err);observer.complete();});
		});
	}

	buildClusterCommand(file, job_opts){
		let setting = clusterCommands[this.options.cluster_type];
		let out= setting["exec"] + " " + setting["stdout"] + file + ".out ";
		out = out + setting["stderr"] + file+ ".err ";
		out = out + setting["wd"] + this.options.storage_folder + " ";
		Object.keys(job_opts).forEach((k)=>{
			if ( setting[k]){
				out = out + setting[k] + job_opts[k] + " ";
			}
		});
		out = out + " " + file;
		return out;
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

	createScript(command,  job_spec){
		let content= "#!/bin/bash\n";
		if ( job_spec ) {
			if (job_spec.memory){
				content+="max_mem_gb="+job_spec.memory+"\n";
				content+="max_mem_mb="+(job_spec.memory*1000)+"\n";
				content+="export IMOKA_MAX_MEM_GB="+job_spec.memory + "\n";
			}
			if (job_spec.threads){
				content+="threads="+job_spec.threads+"\n";
				content+="export OMP_NUM_THREADS="+job_spec.threads+"\n";
			}
			content+="cd "+ job_spec.wd+"\n";
		}
		["~/.bash_profile" , "/etc/profile.d/modules.sh"].forEach((toload)=>{
			content+="if [[ -f "+toload+" ]] ; then source "+toload+" ; fi \n";
		})

		if(this.options.module_load){
			content+=this.options.module_load +"\n";
		}

		content+="singularity_image="+this.options.storage_folder+"/.singularity/iMOKA\n";
		content+="imoka_home="+this.options.storage_folder+"\n";
		content+="export SINGULARITY_BINDPATH=\""+this.options.storage_folder+",$SINGULARITY_BINDPATH\"\n"
		content+=command +"\n";
		return content;
	}

}


module.exports = Processor;

