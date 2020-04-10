'use strict';

const Store  = require('./store.js');
const EventEmitter = require('events');
const fs =require('fs');
const Processor  = require('./processor.js');
const LocalQueue = require('./localQueue.js');
const stream = require('stream');
const { Observable } = require('rxjs');

// // imokaBE class constructor

class iMokaBE extends EventEmitter {

	constructor(mess){
		super();
		this.mess=mess;
	}
	
	data={};
	mess;
	alignment_map={};
	processor;
	user_session=new Store({configName : "public-data" , defaults : { profile : { name : "public", picture : "" }} });
	local_queue;
	tmp_dir;
	
	deleteMatrix(request){
		if (this.processor){
			return this.processor.deleteMatrix(request.data);
		} else {
			throw "Processor not loaded";
		}
	}
 
	saveSample(request){
		if (this.processor){
			this.processor.setSample(request.data);
		} else {
			throw "Processor not loaded";
		}
	}

	runJob(request) {
		if (this.processor ){
			request.data.uid= this.makeid(20);
			request.data.context = this;
			return this.processor.run(request);
		} else {
			throw "Processor not loaded";
		}
	}
	
	
	
	setMatrix(request){
		if (this.processor){
			if ( ! request.data.uid ) request.data.uid=this.makeid(10);
			console.log(request)
			return this.processor.setMatrix(request.data);
		} else {
			throw "Processor not loaded";
		}
	}
	
	importKmerList(request){
		console.log(request)
		if (! this.processor){
			throw "Processor not loaded";
		}
		request.info = this.clone(this.data.kmers.info); /// given that the file to import had been already opened
		request.info.uid=this.makeid(10);
		
		return new Promise((resolve, reject)=>{
			console.log("Updating matrices")
			this.processor.importKmerList(request).catch((err)=>{
				reject(err);
			}).then((res)=>{
				resolve(res);
				this.updateMatrices().then(()=>{
					this.sendSession();
				})
				
			})
		}) ;
	}
	
	
	getKmerTable(request = {all : false, file_type : "matrix"} ) {
		let that=this;
		return new stream.Readable({read(){
			   let gene_corr={};
			   for ( let g in that.data.kmers.genes ){
			       gene_corr[that.data.kmers.genes[g].name]=that.data.kmers.genes[g].gene_id 
			   }
			   if (! request.file_type ) request.file_type="matrix";
			       let line="", obj;
			       if ( request.file_type=="matrix" || request.file_type=="matrix_raw" ) {
			           line= "\t"+that.data.kmers.info.samples_names.join("\t")+"\ngroup"
			           that.data.kmers.info.groups.forEach((g)=>{
			               line=line + "\t"+that.data.kmers.info.groups_names[g];  
			           });
			           this.push(line+"\n");
			           for ( let order=0; order < that.data.kmers.orders_idxs.kmers.length; order++ ){
			               let i = that.data.kmers.orders_idxs.kmers[order];
			               if (request.all || ! that.data.kmers.masks.kmers || that.data.kmers.masks.kmers[i] ){
			            	   that.data.kmers.kmers[i].idx=i;
			                   obj=that.regenerate(that.data.kmers.kmers[i])
			                   line = obj.kmer;
			                   obj.counts.forEach((c, cidx)=>{
			                       if (request.file_type=="matrix_raw" ){
			                           line= line +"\t"+c;
			                       }else {
			                           line = line +"\t"+(c/that.data.kmers.info.count_normalization[cidx]);
			                       }
			                   });
			                   this.push(line+"\n");
			               }
			           }
			       } else {
			           let obj, gene_name, gene_id, aln_pos;
			           this.push("Gene\tGeneName\tEvent\t"+this.data.kmers.info.predictors.join("\t")+"\tkmer\talignment"+"\n");
			           for ( let order=0; order < that.data.kmers.orders_idxs.kmers.length; order++ ){
			               i = that.data.kmers.orders_idxs.kmers[order];
			               if (! that.data.kmers.masks.kmers || that.data.kmers.masks.kmers[i]){
			            	   that.data.kmers.kmers[i].idx=i;
			                   obj=that.regenerate(that.data.kmers.kmers[i]);
			                   if (obj.alignments && obj.alignments.length > 0 ){
			                	   aln_pos="";
			                	   obj.alignments.forEach((el, idx)=>{
			                		   if ( idx > 0 ){
			                			   aln_pos+=";";
			                		   } 
			                		   aln_pos+=el.chromosome + ":" + el.start + "-" + el.end;
			                	   })
			                   }else {
			                	   aln_pos="NA"
			                   }
			                   for ( let e in obj.events ){
			                       for (let g in obj.events[e].gene){
			                           if (obj.events[e].gene[g] && gene_corr[obj.events[e].gene[g]]){
			                               gene_name=obj.events[e].gene[g]; 
			                               gene_id=gene_corr[obj.events[e].gene[g]];
			                           }else {
			                               gene_name="NA"; 
			                               gene_id="NA";
			                           }
			                           line =gene_id+"\t"+gene_name+"\t"+obj.events[e].type+"\t"+obj.values.join("\t")+"\t"+obj.kmer+"\t"+aln_pos+"\n";
			                           this.push(line);
			                       }
			                   }
			               } 
			           }
			       }
			       this.push(null);
		}});
			
		};
		
	
	getSamples(request){
		return new Promise((resolve, reject)=>{
			if (this.processor){
				this.processor.getSamples().then( samples  =>{
					resolve({ "message": "SUCCESS", code: 0, data : samples , draw : request.draw, 
						recordsTotal : samples.length, recordsFiltered : samples.length, stats : {}}
					);
				} ).catch(err=>{
					reject(err)
				})
				
			} else {
				reject("Processor not loaded" );
			}
		})
		
	}
	
	updateSession(){
		this.updateMatrices().then(()=>{
			this.sendSession();
		}).catch((err)=>{
			this.mess.sendMessage(err);
		})
	}
	updateMatrices(){
		console.log("Updating matrices")
		return new Promise((resolve, reject)=>{
			if ( this.processor){
				this.processor.getMatrices().then((matrices)=>{
					if (this.user_session.data.files.kmers && this.user_session.data.files.kmers.original_request){
						let curr_mat=this.user_session.data.files.kmers.original_request;
						matrices.forEach((mat)=>{
							if (mat.uid == curr_mat){
								mat.isOpen=true;
							}
						});
					}
					this.user_session.data.matrices=matrices;
					this.user_session.save();
					resolve()
				}).catch((err)=>{
					reject(err);
				})
			} else {
				reject({ "message": "Processor not loaded" , code:1} );
			}
		})
	}
	
	getMatrices(request){
		return new Promise((resolve, reject)=>{
			this.updateMatrices().then(()=>{
				resolve( { "message": "SUCCESS", code: 0, data : this.user_session.data.matrices , draw : request.draw, 
						recordsTotal : this.user_session.data.matrices.length, recordsFiltered : this.user_session.data.matrices.length, stats : {}}
					);
			}).catch((err)=>{reject(err);})
		})
	}
	
	
	queueAction(request){
		if ( request.subaction == "delete"){
			return this.processor.delJob(request.uid);
		} else {
			return new Promise((resolve, reject)=>{
				reject("Subaction "+request.subaction+" unknown.")
			});
		}
		
	}
	
	
	
	
	
	closeData(request){
		return new Promise((resolve, reject)=>{
			if ( this.data[request.file_type] ){
		        delete this.data[request.file_type];
		        let fname=this.user_session.data.files[request.file_type];
		        delete this.user_session.data.files[request.file_type];
		        this.user_session.save();
		        resolve(fname)
		        this.sendSession();
		    } else {
		    	delete this.user_session.data.files[request.file_type];
		    	this.user_session.save();
		    	this.sendSession();
		    	reject()	
		    }
		});
	    
	}
	
	initBestScores(){
		let ranks=[];
		this.data.kmers.info.predictors.forEach(()=>{
			ranks.push([...Array(this.data.kmers.kmers.length).keys()]);
		});
		
		for ( let i =0 ; i < ranks.length; i++){
			ranks[i].sort((a,b)=>{
				return this.data.kmers.kmers[a].values[i] > this.data.kmers.kmers[b].values[i] ? -1 : 1;
			});
		};
		
		this.data.kmers.kmers.forEach((el, ix)=>{
			el.best_rank=ranks[0].indexOf(ix);
			for ( let i = 1 ; i < ranks.length ; i++){
				if ( el.best_rank > ranks[i].indexOf(ix)){
					el.best_rank=ranks[i].indexOf(ix);
				};
			}
		});
	}
	
	initEvents(){
		this.data.kmers.info.events=[];
		this.data.kmers.info.genes=[];
		let events = {} , genes = {}, dat, masked;
		this.data.kmers.kmers.forEach((el, idx)=>{
			dat = this.regenerate(el)
			masked="filtered";
			if(! this.data.kmers.masks || ! this.data.kmers.masks.kmers || this.data.kmers.masks.kmers[idx]) masked = "visible";
	        if ( dat.events ){
	       		dat.ev_types.forEach(ev =>{
	       			if ( ! events[ev] ) events[ev]={visible : 0 , filtered : 0};
	       			events[ev][masked]=events[ev][masked]+1;
	       		});
	       		dat.genes.forEach(g=>{
	       				if (! genes[g] ) genes[g]={visible : 0 , filtered : 0};
	       				genes[g][masked]=genes[g][masked]+1;
	    		});
	        }
	    });
		Object.keys(events).forEach(k=>this.data.kmers.info.events.push({name:k , visible : events[k].visible, filtered :events[k].filtered }));
		Object.keys(genes).forEach(k=>this.data.kmers.info.genes.push({name:k , visible : genes[k].visible , filtered : genes[k].filtered }));
	}

	checkFileMatrix(file_name) {
		console.log("File_name: "+file_name)
		return new Promise((resolve, reject)=>{
			if ( this.processor ){
				console.log("opening matrices")
				this.processor.getMatrices(false).then((matrices)=>{
					let mat_i = matrices.findIndex(mat=>{
						return file_name.includes(mat.uid);
					});
					if ( mat_i == -1 ){
						resolve(file_name);
					} else {
						if (file_name.includes(" ") ){
							let names=file_name.split(" ");
							if ( names[1] == "RF"){
								this.processor.getModel(names[0], names[2]).then((model)=>{
									resolve(model)
								}).catch((err)=>{
									reject(err);
								});
							} else {
								reject(file_name+" not valid");
							}
						} else {
							this.processor.getAggregated(file_name).then((local_mat)=>{
								console.log("resolving with " +local_mat )
								resolve(local_mat);
							}).catch((err)=>{
								reject(err);
							})
						}
						
					}
				}).catch(err=>{
					console.log(err)
					reject(err);
				});
			} else {
				resolve(file_name);
			}
			
		});
	}
	
	openNewData(new_data, infos){
		return new Promise((resolve, reject)=>{
			let file_type = this.checkDataType(new_data)
	        if (file_type){
	            this.data[file_type]=new_data;
	            this.user_session.data.files[file_type]=infos;
	            this.user_session.data.files[file_type].info=this.data[file_type].info;
	            this.user_session.save();
	            if ( file_type == "kmers"){
	         	   this.data[file_type].kmers.forEach((n, idx) =>{
	         		  n.fc.forEach((v, idy)=>{
	         			  if ( typeof v != "number" ){
	         				  this.data[file_type].kmers[idx].fc[idy]=Infinity;
	         			  }
	         		  }) 
	         	   });
	         	  this.data.kmers.info.final_kmers = this.data.kmers.kmers.length;
	               this.initAlignmentMaps();
	               this.initEvents();
	               this.initBestScores();
	            } else if (file_type == "models" ) {
	               this.initModelsMaps();
	            }
	            this.sendSession();
	            resolve("File of type "+ file_type+" open correctly");
	        } else {
	        	reject("File not recognized.")
	        }
		})
	}
	
	openData(request) {
		return new Promise((resolve, reject)=>{
			this.checkFileMatrix(request.file_name).then((file_name)=>{
				
				if (typeof file_name != typeof "string" ){
					this.openNewData(file_name, {"file" : file_name.file_name , "original_request" : request.file_name } ).then((res)=>{
						resolve(res);
					}).catch((err)=>{
						reject(err);
					})
				} else {
					fs.readFile( file_name, 'utf-8', (err, content)=>{
						console.log(file_name)
				        if (err){
				            reject(err);
				            return;
				        } else {
				            try {
				            	this.openNewData(JSON.parse(content), {"file" : file_name , "original_request" : request.file_name}).then((res)=>{
				    				resolve(res);
				    			}).catch((err)=>{
				    				reject(err);
				    			})
				            } catch(err){
				                console.log(err);
				                reject(err)
				            }
				        }
				    });
				}
			});
		})
		
	    
	}


	openKmerMatrix(content){
	    this.data["kmers"]={info : {groups : [], groups_names : [] , samples_names : [] , events : []} , kmers : [] };
	    if (content[0]=="\t" && content.length > 2){
	        content=content.split("\n");
	        let line= content[0].split("\t");
	        this.data.kmers.info.samples_name= line.slice(1);
	        line = content[1].split("\t").slice(1);
	        this.data.kmers.info.groups_names= [... new Set(line)];
	        this.data.kmers.info.sample_per_grp = new Array(this.data.kmers.info.groups.length).fill(0);
	        line.forEach((v)=>{
	            this.data.kmers.info.groups.push(this.data.kmers.info.groups_names.indexOf(v));
	            this.data.kmers.info.sample_per_grp[this.data.kmers.info.groups[this.data.kmers.info.groups.length-1]]+=1;
	        });
	        for ( let i=2; i < content.length; i++){
	            line = content[i].split("\t");
	            let dat={kmer:line[0] , counts : []};
	            line.slice(1).forEach((v, vi)=>{
	                dat.counts.push(parseFloat(v));
	            });
	            this.data.kmers.kmers.push(dat);
	        }
	        return true;
	    }
	    throw "Not implemented yet";
	}
	
	
	
	
	
	getSOMnodeImportance(request){
		return new Promise((resolve, reject)=>{
			console.log("getSOMnodeImportance");
			if ( ! this.data.som) reject("SOM file not opened");
		    // console.log(data);
			console.log(this.data.som.nodefeatureimpotance);
		    let  data_to_send = [];
		
		    data_to_send.push({"projSOM":this.regenerate(this.data.som.nodefeatureimpotance)});
			projSOMnormalize(data_to_send[0],"raw");
			data_to_send.push({"projSOM":this.regenerate(this.data.som.nbKmerBynode)});
		    projSOMnormalize(data_to_send[1],"raw");
		    resolve({ "data" : data_to_send,  "message": "SUCCESS" ,"draw" : request.draw , code : 0} );
		})
	    
	};
	getSOMaverageclass( request){
		return new Promise((resolve, reject)=>{
			if (! this.data.som) reject("SOM file not opened");
			console.log("getSOMaverageclass");
		    if (! this.data.som.averageclass)
		        this.data.som.averageclass={};
		    // console.log(data);
			// console.log(this.data.som.averageclass);
		    let  data_to_send = [];
			for ( let i=0; i < this.data.som.meanbycat.length; i++ ){
		    	data_to_send.push({"projSOM":this.regenerate(this.data.som.meanbycat[i].meanmatrix),"labelsamples":"Mean "+this.data.som.meanbycat[i].classname,"classori":this.data.som.meanbycat[i].classname,"classnumber":this.data.som.meanbycat[i].classid});
				projSOMnormalize(data_to_send[i],request.norm);
			}
		    resolve({ "data" : data_to_send,  "message": "SUCCESS" ,"draw" : request.draw, code : 0} );
		})
	    
	};
	
	getSOMclusters(request){
		return new Promise((resolve, reject)=>{
			if ( ! this.data.som){
				reject("SOM file not opened correctly");
			}
			console.log("getSOMclusters");
		    if (! this.data.som.samplesSOM)
		        this.data.som.samplesSOM={};
		    console.log(data);   
			console.log(this.data.som.samplesSOM[0]);
		    let  data_to_send = [];
		
		    for ( let i=0; i < this.data.som.samplesSOM.length; i++ ){
		        data_to_send.push(this.regenerate(this.data.som.samplesSOM[i]));
		        this.projSOMnormalize(data_to_send[data_to_send.length-1],request.norm);
		
		    }
			resolve({ "data" : data_to_send,  "message": "SUCCESS" ,"draw" : request.draw, code : 0});
		});
	};
	getSOMkmers( request){
		return new Promise((resolve, reject)=>{
			if (!this.data.som) reject("SOM file not opened");
			console.log("getSOMkmers");
			console.log(request);
			 let  data_to_send = {};
			kmerindex=[];
			nodesindexint=[]
			console.log(this.data.som.kmerbmu);
			request.nodesIds.forEach(function(elem, index, array) {
		         nodesindexint.push(parseInt(elem));
		      })
			this.data.som.kmerbmu.forEach(function(elem, index, array) {
			    if (nodesindexint.includes(elem)) {
			    	console.log(elem);
			    	console.log(index);
			    	kmerindex.push(this.clone((index)));}
			
			})
			console.log("kmerindex length");
			console.log(kmerindex.length)
			console.log(this.data.kmers.length)
			data_to_send["listKmersIndex"]=kmerindex;
			data_to_send["kmers"]=[];
			for(var i = 0; i < kmerindex.length; i++)
		  		data_to_send["kmers"].push(this.clone(this.data.kmers.kmers[kmerindex[i]]));
			
			// console.log(this.data.kmers);
			
			console.log(data_to_send);
			/*
			 * console.log(this.data.kmers.kmers[0].genes);
			 * console.log(Object.keys(this.data.kmers));
			 * console.log(this.data.kmers.kmers.length);
			 * console.log(Object.keys(this.data.kmers.kmers[0]));
			 * console.log(this.data.kmers.kmers[0].genes);
			 */
			resolve({ "data" : data_to_send,  "message": "SUCCESS" ,"draw" : request.draw, code : 0} );
		});
		
	};

	getSOMmap(event, id, request){
		return new Promise((resolve, reject)=>{
			if (! this.data.som) reject("SOM file not opened correctly.")
			console.log("getSOMmap");
		    if (! this.data.som.samplesSOM)
		        this.data.som.samplesSOM={};
		    let  data_to_send = [];
		    data_to_send.push(this.clone(this.data.som.samplesSOM[request.idmap]));
			this.projSOMnormalize(data_to_send[0],request.norm);
		    resolve({ "data" : data_to_send,  "message": "SUCCESS" ,"draw" : request.draw, code:0} );
		});
	    
	
	};
	
	
	
	checkDataType(new_data){
	    if (new_data.kmers){
	        return "kmers";
	    } else if (new_data.features_importances){
	        return "importance" ;
	    } else if (new_data.models){
	        return "models";
	    } else if (new_data.samplesSOM){
	        return "som";
		} else {
	        return false;
	    }
	}
	
	projSOMnormalize(proj,normstyle){
		let minmap,maxmap;
		// if (normstyle!="normByNode"){
			minmap=Math.min(...proj.projSOM);
			maxmap=Math.max(...proj.projSOM);
		// }
		// console.log(minmap);
		// console.log(maxmap);
		proj.projSOM.forEach(function(item, index, arr) {
		  // item - current value in the loop
		  // index - index for this value in the array
		  // arr - reference to analyzed array
			
			if (normstyle=="normByNode")
		  		arr[index] = (item - this.data.som.minmatrix[index])/(this.data.som.maxmatrix[index]-this.data.som.minmatrix[index]);
			else if (normstyle=="centerAvrg"){
				if ((this.data.som.meanmatrix[index]-minmap)>(maxmap -this.data.som.meanmatrix[index])){
					maxmap=this.data.som.meanmatrix[index]+(this.data.som.meanmatrix[index]-minmap);
				}else{
					minmap=this.data.som.meanmatrix[index]-(maxmap -this.data.som.meanmatrix[index]);
				}
				// console.log("aftercentere")
					// console.log(minmap);
					// console.log(maxmap);
				arr[index] = ((((item-this.data.som.meanmatrix[index])-minmap)/(maxmap-minmap)));
			}else if (normstyle=="raw")
				arr[index] = (item -minmap)/(maxmap-minmap);
		})
		return proj;
	}
	
	clone(obj){
	    return JSON.parse(JSON.stringify(obj));
	}
	
	
	regenerate(ref){
	    let dat = this.clone(ref);
	    if ( dat.signatures ){
	        for ( let el in dat.signatures ){
	            dat.signatures[el]=this.clone(this.data.kmers.signatures[dat.signatures[el]]);
	        }
	    }
	    if (dat.kmer && this.data.models ){
	        dat.score = this.data.models.info.feature_prevalence[this.data.models.info.feature_to_index[dat.kmer]];
	    }
	    if (dat.kmer && this.data.importance){
	        dat.importance = this.data.importance.features_importances[dat.kmer]
	    }
	    if (dat.events){
	    	dat.genes=[];
	    	dat.ev_types=[];
	    	dat.events.forEach(ev=>{
	    		ev.gene.forEach(g => {
	    			if ( ! dat.genes.includes(g)) dat.genes.push(g)
	    		})
	    		if ( ! dat.ev_types.includes(ev.type) ) dat.ev_types.push(ev.type);
	    	})
	    }
	    return dat;
	    
	}
	
	
	// / Initialize the maps to retrieve quickly the positions
	initAlignmentMaps(){
	    // TODO : remove the following part, it's a fix for a bug
	    this.data.kmers.kmers.forEach((el)=>{
	        if ( el.alignments && el.alignments.length > 0 ){
	            el.id = el.alignments[0].query_index;
	        }
	    });
	    // / TODO till here
	    ["sequences", "kmers"].forEach(request_type=>{
	            console.log("Creating map for " + request_type)
	            this.alignment_map[request_type]={}
	            let aln;
	            for ( var k = 0 ; k < this.data.kmers[request_type].length ; k++ ){
	                if (this.data.kmers[request_type][k].alignments ){
	                    for (var i=0; i <  this.data.kmers[request_type][k].alignments.length; i++ ){
	                        aln=this.data.kmers[request_type][k].alignments[i];
	                        if (! this.alignment_map[request_type][aln.chromosome] ) {
	                            this.alignment_map[request_type][aln.chromosome]=[];
	                        }
	                        this.alignment_map[request_type][aln.chromosome].push([ aln.start ,  k,  i]);
	                        let p=aln.start+1000;
	                        while ( p < aln.end ) {
	                            this.alignment_map[request_type][aln.chromosome].push([ p,  k,  i]);
	                            p=p+1000;
	                        }
	                        this.alignment_map[request_type][aln.chromosome].push([aln.end,  k,  i]);
	                    }
	                }
	            }
	            Object.keys(this.alignment_map[request_type]).forEach(k => {
	                this.alignment_map[request_type][k].sort((a,b)=>a[0]-b[0]);
	            });
	        }
	    );
	}
	
	// / initialize the map to retrieve the index given a feature name
	initModelsMaps(){
	    this.data.models.info.feature_to_index={};
	    for ( var k in this.data.models.info.index_to_feature){
	        this.data.models.info.feature_to_index[this.data.models.info.index_to_feature[k]]= k;
	    }
	}

	binary_search(arr, x, start, end) { 
	    
	    // Base Condtion
	    if (start >= end) return start; 
	   
	    // Find the middle index
	    let mid=Math.floor((start + end)/2); 
	   
	    // If element at mid is greater than x,
	    // search in the left half of mid
	    if(arr[mid][0] > x)  
	        return this.binary_search(arr, x, start, mid-1); 
	    else
	  
	        // If element at mid is smaller than x,
	        // search in the right half of mid
	        return this.binary_search(arr, x, mid+1, end); 
	} 
	
	
	getFeatures(request) {
		return new Promise((resolve, reject)=>{
			console.log("getFeatures received");
			if ( ! this.data.kmers){
				reject("Kmers file not loaded");
			}
		    var features=[], aln, dataset =this.data.kmers[request.type], added=new Set();
		    if ( dataset && this.alignment_map[request.type][request.chr]) {
		        if ( request.end - request.start < 1000 ){
		            request.end=request.end+500;
		            request.start=request.start-500; 
		        }
		        let start = this.binary_search( this.alignment_map[request.type][request.chr], request.start, 0, this.alignment_map[request.type][request.chr].length-1)
		        let end = this.binary_search( this.alignment_map[request.type][request.chr], request.end, start, this.alignment_map[request.type][request.chr].length-1)
		        for ( var i=start ; i<= end; i++ ){
		            let mapInfo = this.alignment_map[request.type][request.chr][i];
		            aln = dataset[mapInfo[1]].alignments[mapInfo[2]];
		            if ( ! added.has(aln.id) ){
		               added.add(aln.id);
		               let feat = this.regenerate(aln);
		               feat.best_value = request.type == "kmers" ? Math.max(...dataset[mapInfo[1]].values) : Math.max(...dataset[mapInfo[1]].best_kmer_values); 
		               features.push(feat);
		            }
		        }
		    }
		    resolve({ "data" : features,  "message": "SUCCESS", "request" : request, code : 0 });
		})
	    
	}
	
	
	getDataByID(request) {
		return new Promise((resolve, reject)=>{
			let el_id= request.request.id , el_type=request.request.type;
		    if (typeof el_id == "number"){
		        let dat = this.data[request.file_type][el_type].find((el)=>{
		            return el.id == el_id ;
		        });
		        if ( dat ){
		            resolve({ "data" : this.regenerate(dat) ,  "message": "SUCCESS" });
		        }
		    } else {
		        let dat = this.data[request.file_type][el_type].find((el)=>{
		            return el.kmer == el_id ;
		        });
		        if ( dat ){
		            resolve({ "data" : this.regenerate(dat) ,  "message": "SUCCESS" , code : 0}) 
		        }
		        
		    }
		    reject("Element not found")
		})
	    
	}
	
	getGenes(event){
	    let out=new Set(), obj;
	    for ( let order=0; order < this.data.kmers.orders_idxs.kmers.length; order++ ){
	        i = this.data.kmers.orders_idxs.kmers[order];
	        if (! this.data.kmers.masks.kmers || this.data.kmers.masks.kmers[i] || event.all ){
	            obj=this.regenerate(this.data.kmers.kmers[i]);
	            obj.events.forEach(ev=>{
	                ev.gene.forEach(g => out.add(g))
	            });
	        }
	    }
	    if ( out.has("")) out.delete("");
	    return [...out];
	}
	
	getInfo(request){
		return new Promise((resolve, reject)=>{
			if ( this.data[request.file_type] ){
				resolve( this.data[request.file_type].info);
			} else {
				reject( "File " +request.file_type+ " not opened." );
			}
		});
	}
	
	getImportance(data_type){
		return new Promise((resolve, reject)=>{
			if (data_type.includes("importance") && ! this.data.importance){
				reject("Importance file not opened");
				return;
			}
			if (data_type == "importance_samples_probabilities"){
				resolve(this.data.importance.samples_probabilities)
			} else if (data_type == "importance" ){
		        resolve(this.data.importance.features_importances);
		    } else if (data_type == "importance_models" ){
		        resolve(this.data.importance.best_feature_models);
		    } else {
		    	reject("Data "+data_type+" not found")
		    }
		});
	}
	
	getKmers(event, id, request) {
		return new Promise((resolve, reject)=>{
			if ( ! this.data.kmers) {
				reject("File not open");
				return;
			}
		    if (! this.data.kmers.kmers) this.data.kmers.sequences= {};
		    if (! this.data.kmers.current_search ) this.data.kmers.current_search={};
		    if (! this.data.kmers.orders) this.data.kmers.orders={};
		    if (! this.data.kmers.masks) this.data.kmers.masks={};
		    if (! this.data.kmers.orders_idxs) this.data.kmers.orders_idxs = {};
		    if (!this.data.kmers.orders.kmers || this.data.kmers.orders.kmers != request.order ){
		        this.data.kmers.orders.kmers = request.order;
		        this.data.kmers.orders_idxs.kmers = [ ...Array(this.data.kmers.kmers.length).keys() ];
		        var s_c= this.data.kmers.orders.kmers.name;
		        var asc = this.data.kmers.orders.kmers.asc;
		        if ( s_c == "kmer" ){
		            this.data.kmers.orders_idxs.kmers.sort((a,b)=>{
		                 return this.data.kmers.kmers[a].kmer < this.data.kmers.kmers[b].kmer ? 1 : -1 ;   
		            });
		        }
		        if ( s_c == "best_rank" ){
		            this.data.kmers.orders_idxs.kmers.sort((a,b)=>{
		                 return this.data.kmers.kmers[a].best_rank - this.data.kmers.kmers[b].best_rank;   
		            });
		        }
		        if ( s_c == "events" ){ 
		                this.data.kmers.orders_idxs.kmers.sort((a,b)=>{
		                    if (this.data.kmers.kmers[a].events[0] && this.data.kmers.kmers[b].events[0] ){
		                        return this.data.kmers.kmers[a].events[0].type < this.data.kmers.kmers[b].events[0].type ? 1 : -1;
		                    } else {
		                        return this.data.kmers.kmers[a].events[0] ? -1 : 1 ;                            
		                    }
		   
		                });
		        }
		        if ( s_c == "genes" ){ 
		                this.data.kmers.orders_idxs.kmers.sort((a,b)=>{
		                    if (this.data.kmers.kmers[a].events[0] && this.data.kmers.kmers[b].events[0] ){
		                        return this.data.kmers.kmers[a].events[0].gene < this.data.kmers.kmers[b].events[0].gene ? 1 : -1;
		                    } else {
		                        return this.data.kmers.kmers[a].events[0] ? -1 : 1 ;                            
		                    }
		   
		                });
		        }
		        if ( s_c == "position" ){ 
		                this.data.kmers.orders_idxs.kmers.sort((a,b)=>{
		                    if (this.data.kmers.kmers[a].alignments && this.data.kmers.kmers[b].alignments && this.data.kmers.kmers[a].alignments[0] && this.data.kmers.kmers[b].alignments[0]  ){
		                        if (this.data.kmers.kmers[a].alignments[0].chromosome == this.data.kmers.kmers[b].alignments[0].chromosome ){
		                            return this.data.kmers.kmers[a].alignments[0].start < this.data.kmers.kmers[b].alignments[0].start ? 1 : -1;
		                        } else {
		                            return this.data.kmers.kmers[a].alignments[0].chromosome < this.data.kmers.kmers[b].alignments[0].chromosome  ? 1 : -1;
		                        }
		                    } else {
		                        return this.data.kmers.kmers[a].alignments ? -1 : 1 ;                            
		                    }
		                });
		        }
		        
		        if ( s_c == "importance" ){
		            if ( this.data.importance ){
		                let fi=this.data.importance.features_importances
		                this.data.kmers.orders_idxs.kmers.sort((a,b)=>{
		                    let k1 = this.data.kmers.kmers[a].kmer, k2= this.data.kmers.kmers[b].kmer;
		                    return fi[k1] ? fi[k2] ? fi[k1].rank - fi[k2].rank  : -1 : 1 ; 
		               });    
		            }
		        }
		        if (s_c.substring(0, 6) == "value_" ){
		            let pred_n = parseInt( s_c.substring(6) );
		            if ( pred_n >= 0 ) {
		                this.data.kmers.orders_idxs.kmers.sort((a,b)=>{
		                    return this.data.kmers.kmers[a].values[pred_n] < this.data.kmers.kmers[b].values[pred_n] ? -1 : 1 ;                            
		                });
		            }
		        }
		        if (s_c.substring(0, 3) == "fc_" ){
		            let pred_n = parseInt( s_c.substring(3) );
		            if ( pred_n >= 0 ) {
		                this.data.kmers.orders_idxs.kmers.sort((a,b)=>{
		                    return  ! isFinite(this.data.kmers.kmers[a].fc[pred_n]) ? 1 : ! isFinite(this.data.kmers.kmers[b].fc[pred_n]) ? -1 : this.data.kmers.kmers[a].fc[pred_n] < this.data.kmers.kmers[b].fc[pred_n]? -1 : 1 ;                            
		                });
		            }
		        }
		        if (s_c.substring(0, 5) == "mean_" ){
		        	let class_n = parseInt( s_c.substring(5) );;
		            if ( class_n >= 0 ){
		              this.data.kmers.orders_idxs.kmers.sort((a,b)=>{
		                  return this.data.kmers.kmers[a].means[class_n] < this.data.kmers.kmers[b].means[class_n] ? -1 : 1 ;                            
		              });
		            }
		        }
		        if (s_c.substring(0, 5) == "pval_" ){
		        	let class_n = parseInt( s_c.substring(5) );;
		            if ( class_n >= 0 ){
		              this.data.kmers.orders_idxs.kmers.sort((a,b)=>{
		                  return this.data.kmers.kmers[a].pvalues[class_n] < this.data.kmers.kmers[b].pvalues[class_n] ? -1 : 1 ;                            
		              });
		            }
		        }
		        
		        if (! asc ) this.data.kmers.orders_idxs.kmers = this.data.kmers.orders_idxs.kmers.reverse();
		    }
		    let recordsFiltered=this.data.kmers.kmers.length;
		    if (! this.data.kmers.current_search.kmers || this.data.kmers.current_search.kmers != request.search || this.data.kmers.current_search.subset != request.subset  || this.data.kmers.current_search.eventsFilter != request.eventsFilter || this.data.kmers.current_search.minPred!=request.minPred ){
		        if ( request.search.value.length >= 2 || request.subset.length > 0 || request.eventsFilter.length != this.data.kmers.info.events.length || request.minCount != 0 || request.minPred != 0 || request.minFC != 0 || request.minPval != 0 ){
		            this.data.kmers.current_search.kmers = request.search;
		            this.data.kmers.current_search.subset = request.subset;
		            this.data.kmers.current_search.eventsFilter=request.eventsFilter;
		            this.data.kmers.current_search.minCount=request.minCount;
		            this.data.kmers.current_search.minPred=request.minPred;
		            this.data.kmers.current_search.minPval=request.minPval;
		            this.data.kmers.current_search.minFC=request.minFC;
		            if (! this.data.kmers.masks.kmers) this.data.kmers.masks.kmers = new Array(this.data.kmers.kmers.length);
		            for ( var e=0; e < this.data.kmers.kmers.length; e++){
		                this.data.kmers.masks.kmers[e]=false;
		                if (request.minPred  == 0 || this.data.kmers.kmers[e].values.find((n)=>{ return n >=  request.minPred ;} ) != undefined  ){
		              	if (request.minFC  == 0 || this.data.kmers.kmers[e].fc.find((n)=>{ if ( typeof n == "number") { return  Math.abs(n) >=  request.minFC; } else { return true;} } ) != undefined   ){
		           		if (request.minPval  == 0 || this.data.kmers.kmers[e].pvalues.find((n)=>{ return n <=  request.minPval ;} ) != undefined  ){
		                if (request.subset.length == 0 || request.subset.includes(this.data.kmers.kmers[e].kmer)){
		                	if ( request.minCount == 0 || this.data.kmers.kmers[e].counts.find((n)=>{ return n >=  request.minCount ;} ) != undefined )  {
		                		if ( request.eventsFilter.length == this.data.kmers.info.events.length || this.hasEvents(this.data.kmers.kmers[e], request.eventsFilter ) ){
		                			if ( this.data.kmers.current_search.kmers.value.length < 2 || JSON.stringify(this.data.kmers.kmers[e]).includes(this.data.kmers.current_search.kmers.value) ) this.data.kmers.masks.kmers[e]=true;
		                		}
		                	}}}}
		                }
		                if (! this.data.kmers.masks.kmers[e]) recordsFiltered--;
		            }
		            
		        } else {
		            if (! this.data.kmers.masks.kmers ) this.data.kmers.masks.kmers = new Array(this.data.kmers.kmers.length);
		            this.data.kmers.masks.kmers.fill(true);
		        }
		    } else {
		        if (! this.data.kmers.current_search.kmers ){
		            this.data.kmers.current_search.kmers= {"recordsFiltered" : recordsFiltered};
		        } else {
		            recordsFiltered = this.data.kmers.current_search.kmers.recordsFiltered;
		        }
		    }
		    let  data_to_send = [];
		    let count=0, i=0, start = request.pageIndex*request.pageSize, end=(request.pageIndex+1)*(request.pageSize);
		    for ( let order=0; order < this.data.kmers.orders_idxs.kmers.length; order++ ){
		        i = this.data.kmers.orders_idxs.kmers[order];
		        if (! this.data.kmers.masks.kmers || this.data.kmers.masks.kmers[i]){
		            if ( count >= start && count < end ){
		                this.data.kmers.kmers[i].idx=i;
		                data_to_send.push(this.regenerate(this.data.kmers.kmers[i]));
		                data_to_send[data_to_send.length-1].original_index=i;
		                if ( data_to_send.length == request.pageSize ){
		                	order = this.data.kmers.orders.kmers.length;
		                }
		            }
		            count++;
		        } 
		    }
		    this.initEvents();
		    resolve({ "data" : data_to_send,  "message": "SUCCESS", "draw" : request.draw, code : 0,
		        "recordsTotal" : this.data.kmers.kmers.length, 
		        "recordsFiltered" :  recordsFiltered, 
		        "stats" :  { genes : this.data.kmers.info.genes, events : this.data.kmers.info.events  } } );
		});
		
	};

	hasEvents(dat,evs ){
		for ( let i=0; i< dat.events.length; i++){
			if (evs.includes(dat.events[i].type)) return true;
		}
		return false;
	}
	
	extend(obj, src) {
	    for (var key in src) {
	        obj[key]= src[key];
	    }
	    return obj;
	}
	
	
	
	
	// // SECURITY
	
	
	
	users = new Store({ configName: 'users',
	    defaults: { users : [ { name : "public" , password : "None", isRoot: false} , { name : "root" , password : "root", isRoot: true} ] }
	});
	
	loadProfileFiles(){
		return new Promise((resolve, reject)=>{
			this.updateMatrices().then(()=>{
				if (this.user_session.data.files ){
			        Object.keys(this.user_session.data.files).forEach(file_type => {
			           let fname = this.user_session.data.files[file_type].original_request;
			           if ( ! fname ){
			        	   fname = this.user_session.data.files[file_type].file
			           }
			           console.log("opening "+ fname);
			           this.openData({file_name: fname}).then( ()=>{
			        	   this.mess.sendMessage({code : 0, message : "File "+fname+" opened correctly." });
			           }).catch((err)=>{
			        	   console.log(err)
			        	   this.closeData({file_type : file_type});
			           	   this.mess.sendMessage({error: err,code : 1, message : "Error opening file "+fname });
			           }).finally(()=>{
			        	   this.user_session.save();
			           });
			        });
			    }
			}).finally(()=>{
				this.sendSession();
				resolve();
			})
		})
		
		
	}
	
	
	login(user_name, password, force=false){
	    let request_user = this.users.data["users"].find((u)=>{return u.name == user_name || u.mail == user_name});
	    if ( request_user  ){
	        if (  password == request_user.password || force){
	            this.user_session = new Store({configName : user_name+"-data" , defaults : {profile : {name : user_name,  picture : "" , process_config : { profiles : []} }, files : {}}});
	            if ( ! this.user_session.data.profile.process_config ){
	                this.user_session.data.profile.process_config = {profiles : [], current_profile : 0}
	                this.user_session.save();
	            }
	            return  "SUCCESS" ;
	        }
	        return "ERROR: wrong password." ;
	    } else {
	        return "ERROR: user " + user_name + "  not found.";
	    }
	}
	
	logout(){
	    this.login("public", "None");
	    /*
		 * this.user_session.data={profile : {name : "public", picture : "" }, files :
		 * {}}; this.user_session.save();
		 */
	    this.data={};
	}
	
	createUser(userName, email, passwd){
	    let requested = this.users.data["users"].find((el) => el.name == userName );
	    if ( requested &&  requested.length != 0  ){
	        return "ERROR: "+userName+" already exists.";
	    }
	    this.users.data["users"].push({name : userName , "email" : email, "password" : passwd, isRoot : false});
	    this.users.save();
	    return  "SUCCESS"
	}
	
	removeUser(userName ){
	    let requested = this.users.data["users"].find((el) => el.name == userName );
	    if (! requested  ){
	        return "ERROR: "+userName+" doesn't exists.";
	    }
	    this.users.data["users"] = this.users.data["users"].filter((el) =>el.name != userName );
	    this.users.save();
	    return "SUCCESS";
	}
	
	
	setProfile(profile_number){
		return new Promise((resolve, reject)=>{
			if (typeof profile_number == 'undefined' ){
				if (! this.user_session.data.profile.process_config.current_profile){
					reject("No profile given")
					return;
				}
				profile_number=this.user_session.data.profile.process_config.current_profile;
			} else {
				this.user_session.data.profile.process_config.current_profile=profile_number;
			}
			console.log("setting profile")
			this.processor = new Processor(this.user_session.data.profile.process_config.profiles[profile_number], this.mess);
			this.processor.tmp_dir = this.tmp_dir;
			let ct=this.user_session.data.profile.process_config.profiles[profile_number].connection_type;
			if (ct == "local" ){
				if (this.local_queue ){
					this.local_queue.destroy();
				}
				this.local_queue = new LocalQueue(this.processor.options);
				this.processor.setQueue(this.local_queue);
			}
			this.loadProfileFiles().then(()=>{
				resolve();
			}).catch((err)=>{
				reject(err);
			});
			
		});
		
	}
	
	
	
	sendSession(){
		this.emit("sendSession", this.user_session.data);
	}
	sendQueue(){
		this.processor.getQueue().then((queue)=>{
			this.emit("queue", queue);
		}).catch((err)=>{
			this.mess.sendMessage(err);
		});
	}
	
	saveProfile(request) {
		return new Observable((observer)=>{
			if ( request.profile ){
				   let tmp_proc = new Processor(undefined, this.mess);
				   let with_error=0;
				   tmp_proc.checkOptions(request.profile).subscribe((mess)=>{
					   observer.next(mess)
				   }, (err)=>{
					   observer.error(err);
					   with_error=1;
				   }, ()=>{
					   if ( with_error==0 ){
						   if ( request.profile_number == this.user_session.data.profile.process_config.profiles.length ){
							   request.profile.id =makeid(20); 
							   this.user_session.data.profile.process_config.profiles.push(request.profile);
						   } else {
							   if (!this.user_session.data.profile.process_config.profiles[request.profile_number].id ){
								   request.profile.id =makeid(20);
							   }else {
								   request.profile.id=this.user_session.data.profile.process_config.profiles[request.profile_number].id
							   }
							   this.user_session.data.profile.process_config.profiles[request.profile_number] = request.profile;
						   }
						   this.setProfile(request.profile_number).then(()=>{
							   this.user_session.save();
							   observer.next("completed")
							   observer.complete();
						   }, err =>{
							   this.user_session.save();
							   observer.error(err);
							   observer.complete();
						   })
					   }
				   });
			   }else {
				   console.log("Setting profile "+request.profile_number)
				   if (request.profile_number < this.user_session.data.profile.process_config.profiles.length){
					   this.setProfile(request.profile_number).then(()=>{
						   this.user_session.save();
						   observer.next("completed");
						   observer.complete();
					   }, err =>{
						   this.user_session.save();
						   observer.error(err);
						   observer.complete();
					   });
				   } else {
					   observer.error({  "message": "ERROR: profile number "+request.profile_number+ " is not available.", "code" : 1} );
					   observer.complete();
				   }
			   }
		})
	   
	}
	

	
	
	makeid(length) {
	   var result           = '';
	   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	   var charactersLength = characters.length;
	   for ( var i = 0; i < length; i++ ) {
	      result += characters.charAt(Math.floor(Math.random() * charactersLength));
	   }
	   return result;
	}
}


module.exports = iMokaBE;


