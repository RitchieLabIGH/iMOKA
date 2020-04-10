'use strict';
const { app, BrowserWindow, ipcMain, dialog , shell} = require('electron');
const Store  = require('./store.js');
const Processor  = require('./processor.js');
const fs =require('fs');
const LocalQueue = require('./localQueue.js');

var data={},alignment_map={} ,processor,  win,
    user_session=new Store({configName : "public-data" , defaults : { profile : { name : "public", picture : "" }} }),
	local_queue;


const store = new Store({
configName: 'user-preferences',
defaults: {
	BrowserWindowConfig : {
   width: 800,
   height: 600 ,
   x: 0,
   y: 0,
   backgroundColor: '#ffffff',
   webPreferences: {
       nodeIntegration: true
     }
 },
 tmpDir :  app.getPath('userData')+"/tmp/"
}
});




function createWindow () {
  // Create the browser window.
  let conf=store.get('BrowserWindowConfig')
  conf.frame=true;
  conf.icon = './dist/assets/images/256x256.png';
  console.log(conf)
  win = new BrowserWindow(conf);
  function saveWindowBounds() {
	    store.set('BrowserWindowConfig', win.getBounds());
	}
  // Event when the window is closed.
  win.on('closed', function () {
    win = null
  })
  win.on('resize', saveWindowBounds);
  win.on('move', saveWindowBounds);
  /*Menu.setApplicationMenu(null)*/

  win.loadFile(`./dist/index.html`);
  fs.mkdir(store.get('tmpDir'), {recursive : true}, ()=>{return;});
  if (store.data.session){
     login(store.data.session.user, "" , true);
  }else {
	  logout();
  }
  setProfile().then(()=>{
	  loadProfileFiles();
  }).catch((err)=>{
	  console.log(err);
  }).finally(()=>{
	  win.webContents.on('new-window', function(event, url){
	      event.preventDefault();
	      console.log(url)
	      shell.openExternal(url);
	    });
  });
  
}

// Create window on electron intialization
app.on('ready', createWindow)


// Quit when all windows are closed.
app.on('window-all-closed', function () {
	if ( local_queue ) {
		local_queue.destroy();
	}
  // On macOS specific close process
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // macOS specific close process
  if (win === null) {
    createWindow()
  }
})

String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};



/// ipcMain listeners

ipcMain.on("getData" , (event, id, request) => {
	console.log("Get data recived "+ request.data);
    if ( request.data == "kmers" ){
        getKmers(event, id, request);
    } else if (request.data == "data_by_id") {
    	win.webContents.send("getData-"+id, getDataByID(request) );
    }else if ( request.data == "genes"){
    	win.webContents.send("getData-"+id, { "data" : getGenes(request) ,  "message": "SUCCESS", code : 0} );
    }else if ( request.data == "queue"){
    	if( processor && processor.queue ){
    		win.webContents.send("queue", { "data" : processor.queue.getQueue() ,  "message": "SUCCESS", code : 0} );
    	} else {
    		win.webContents.send("queue", {  "message": "Processor or queue not intialized", code : 1} );
    	}
    } else if (request.data == "samples" ){
       	getSamples(request, id);
    } else if ( request.data == "matrix" ) {
    	getMatrices(request, id);
    }  else if ( request.data=="features"){
    	win.webContents.send("getData-"+id, getFeatures(request));
    }  else if (request.data=="info"){
    	if ( data[request.file_type] ){
    		win.webContents.send("getData-"+id, { "data" : data[request.file_type].info ,  "message": "SUCCESS", code : 0 } );
    	} else {
    		win.webContents.send("getData-"+id, {   "message": "File " +request.file_type+ " not opened." , code : 1 } );
    	}
    } else if (request.data == "importance_samples_probabilities" ){
        win.webContents.send("getData-"+id, { "message": "SUCCESS", "data" : data.importance.samples_probabilities, code : 0 } );
    } else if (request.data == "importance" ){
        win.webContents.send("getData-"+id, { "message": "SUCCESS", "data" : data.importance.features_importances, code : 0 } );
    } else if (request.data == "importance_models" ){
        win.webContents.send("getData-"+id, { "message": "SUCCESS", "data" : data.importance.best_feature_models, code : 0 } );
    } else if ( request.data == "SOMclusters" ){
		console.log("SOMclusters");
	    getSOMclusters(event, id, request);
    } else if ( request.data == "SOMmap" ){
		getSOMmap(event, id, request);
	}else if ( request.data == "SOMkmers" ){
		getSOMkmers(event, id, request);
	} else if ( request.data == "SOMimportance" ){
		getSOMnodeImportance(event, id, request);
	} else if ( request.data == "SOMaverageclass" ){
		getSOMaverageclass(event, id, request);
	} else {
        win.webContents.send("getData-"+id, { "message": "unrecognized request" } );
    }
});

ipcMain.on("action" , (event, id, request) => {
    console.log("action request recived " + request.action)
    request.id = id;
    if (request.action == "close"){
    	closeData(request.file_type, (file_name)=>{
            win.webContents.send("action-"+id, {"file" : file_name,  "message": "SUCCESS"} );
            sendSession();
        } , 
        (err, file_name)=>{
            win.webContents.send("action-"+id, {"file" : file_name,  "message": err.message} );
        });
    } else if (request.action == "open" ){
    	openData(request.file_name, (file_type)=>{
    	    win.webContents.send("action-"+id, {"file" : request.file_name, "file_type" : file_type  ,"message": "SUCCESS", } );
    	    sendSession();
    	} , 
    	        (err)=>{
    	    win.webContents.send("action-"+id, {"file" : request.file_name,  "message": err.message} );
    	});
    } else if(request.action == "saveProfile"){
    	saveProfile(request);
    } else if ( request.action == "runJob"){
    	runJob(request);   
    } else if ( request.action == "setMatrix" ){
    	saveMatrix(request);
    } else if ( request.action == "deleteMatrix" ){
    	deleteMatrix(request);
    } else if ( request.action == "save_sample"){
    	saveSample(request);
    } else if ( request.action == "saveKmerTable"){
    	saveKmerTable(request);
    } else if ( request.action == "readJson"){
    	readJson(request);
    } else if ( request.action == "readFile"){
    	readFile(request);
    } else if ( request.action == "getFile"){
    	getFile(request);
    } else if ( request.action == "getNewFile"){
    	getNewFile(request);
    } else if (request.action == "queueAction" ){
    	queueAction(request);
    } else {
    	win.webContents.send("action-"+id, { "message": "Action "+request.action + " not recognized."} );
    } 
});


// FUNCTIONS for the listeners 

let deleteMatrix = function(request){
	if (processor){
		processor.deleteMatrix(request.data).then((res)=>{
			win.webContents.send("action-"+request.id, { "message": res , code:0} );
		}).catch((err)=>{
			console.log(err)
			win.webContents.send("action-"+request.id, { "message": err , code:1} );
		})
	} else {
		win.webContents.send("action-"+request.id, { "message": "Processor not loaded" , code:1} );
	}
}
 
let saveSample = function(request){
	if (processor){
		processor.setSample(request.data).then((res)=>{
			win.webContents.send("action-"+request.id, { "message": res , code:0} );
			sendSession();
		}).catch((err)=>{
			win.webContents.send("action-"+request.id, { "message": err , code:1} );
		})
	} else {
		win.webContents.send("action-"+request.id, { "message": "Processor not loaded" , code:1} );
	}
}



let saveMatrix = function(request){
	if (processor){
		if ( ! request.data.uid ) request.data.uid=makeid(10);
		console.log(request)
		processor.setMatrix(request.data).then((res)=>{
			win.webContents.send("action-"+request.id, { "message": res , code:0} );
			sendSession();
		}).catch((err)=>{
			console.log(err)
			win.webContents.send("action-"+request.id, { "message": err , code:1} );
		})
	} else {
		win.webContents.send("action-"+request.id, { "message": "Processor not loaded" , code:1} );
	}
}

let getSamples = function(request, id){
	if (processor){
		processor.getSamples().then( samples  =>{
			win.webContents.send("getData-"+id, { "message": "SUCCESS", code: 0, data : samples , draw : request.draw, 
				recordsTotal : samples.length, recordsFiltered : samples.length, stats : {}}
			);
		} ).catch(err=>{
			console.log(err);
			win.webContents.send("getData-"+id, { "message": err, code:1 } );
		})
		
	} else {
		win.webContents.send("getData-"+id, { "message": "Processor not loaded" , code:1} );
	}
}


let getMatrices = function(request, id){
	if ( processor){
		processor.getMatrices().then((matrices)=>{
			if (user_session.data.files.kmers && user_session.data.files.kmers.original_request){
				let curr_mat=user_session.data.files.kmers.original_request;
				matrices.forEach((mat)=>{
					if (mat.uid == curr_mat){
						mat.isOpen=true;
					}
				});
			}
			user_session.data.matrices=matrices;
			user_session.save();
			win.webContents.send("getData-"+id, { "message": "SUCCESS", code: 0, data : matrices , draw : request.draw, 
				recordsTotal : matrices.length, recordsFiltered : matrices.length, stats : {}}
			);
			
		}).catch((err)=>{
			win.webContents.send("getData-"+id, { "message": err, code:1 } );
		})
	} else {
		win.webContents.send("getData-"+id, { "message": "Processor not loaded" , code:1} );
	}
	
}


let queueAction = function(request){
	if ( request.subaction == "delete"){
		if (processor.queue){
			if ( processor.queue.delJob(request.uid)){
				win.webContents.send("action-"+request.id, { "message": "SUCCESS", code: 0} );
			} else {
				win.webContents.send("action-"+request.id, { "message": "Error! : UID "+request.uid +" not found.", code: 1} );
			}
		}
	}
	win.webContents.send("action-"+request.id, { "message": "COMPLETED", code: 0} );
}

let readJson = function (request) {
	fs.readFile( request.file_name, 'utf-8', (err, data)=>{
		if (err){
			console.log("An error occurred reading the file: " + err.message);
			return;
		} else {
			let jdata = JSON.parse(data);
			win.webContents.send("action-"+request.id, {"file" : request.file_name, "data" : jdata } );
		}
	});
};

let readFile = function (request){
		if ( request.gzipped || request.base64 ) {
			const process = require('child_process');
			var target_file = store.get('tmpDir')+'/'+Math.abs(request.file_name.hashCode())+'.gz';
			var cmd = (request.gzipped ? "gzip -c " : "cat ") + request.file_name + (request.base64 ? " | base64 " : "") + " >"+target_file;
			var child = process.exec(cmd, {stdio: 'ignore', shell: true} );
			child.on('close', (code) => {
				fs.readFile( target_file, 'utf-8', (err, data)=>{
					if (err){
						console.log("An error occurred reading the file: " + err.message);
						return;
					} else {
						win.webContents.send("action-"+request.id, {"file" : request.file_name, "data" : data } );
					}
					fs.unlink(target_file, (err)=>{if (err) throw err;});
				})
			});
		} else {
			fs.readFile( request.file_name, 'utf-8', (err, data)=>{
				if (err){
					console.log("An error occurred reading the file: " + err.message);
					return;
				} else {
					win.webContents.send("action-"+request.id, {"file" : request.file_name, "data" : data } );
				}
			})	
		};
	}


let getFile = function (arg){
    if (! arg.defaultPath ){
        if ( ! store.get("lastDir") ){
            store.set("lastDir",  { path : app.getPath('home') } )
        }
        arg.defaultPath=store.get("lastDir").path;
    }
		dialog.showOpenDialog(win, arg).then((response)=>{
			console.log("Selected");
		    if (! response.canceled &&  response.filePaths.length > 0 ) {
		        let newpath = response.filePaths[0].substring(0,response.filePaths[0].lastIndexOf("\/")+1);
		        store.set("lastDir", { path : newpath } )
		    }
			win.webContents.send("action-"+arg.id, response);
		})
	}



let getNewFile= function (arg) {
    if (! arg.defaultPath ){
        if ( ! store.get("lastDir") ){
            store.set("lastDir",  { path : app.getPath('home') } )
        }
        arg.defaultPath=store.get("lastDir").path;
    }
    console.log("Get new file recived")
        dialog.showSaveDialog(win, arg).then((fileName)=>{
        	console.log("selected")
            if (! fileName.canceled) {
                let newpath = fileName.filePath.substring(0,fileName.filePath.lastIndexOf("\/")+1);
                store.set("lastDir", { path : newpath } )
            }
            win.webContents.send("action-"+arg.id, fileName.filePath);
        })
    }


function closeData(file_type, callback_success, callback_fail){
    if ( data[file_type] ){
        delete data[file_type];
        let fname=user_session.data.files[file_type];
        delete user_session.data.files[file_type];
        user_session.save();
        callback_success(fname)
        sendSession();
    } else {
    	delete user_session.data.files[file_type];
    	user_session.save();
    	sendSession();
    	if ( callback_fail ){
    		callback_fail(file_type+" already closed.", "None")	
    	}
        
    }
}

function initBestScores(){
	let ranks=[];
	data.kmers.info.predictors.forEach((gn)=>{
		ranks.push([...Array(data.kmers.kmers.length).keys()]);
	});
	
	for ( let i =0 ; i < ranks.length; i++){
		ranks[i].sort((a,b)=>{
			return data.kmers.kmers[a].values[i] > data.kmers.kmers[b].values[i] ? -1 : 1;
		});
	};
	
	data.kmers.kmers.forEach((el, ix)=>{
		el.best_rank=ranks[0].indexOf(ix);
		for ( let i = 1 ; i < ranks.length ; i++){
			if ( el.best_rank > ranks[i].indexOf(ix)){
				el.best_rank=ranks[i].indexOf(ix);
			};
		}
	});
}

function initEvents(){
	data.kmers.info.events=[];
	data.kmers.info.genes=[];
	let events = {} , genes = {}, dat, masked;
	data.kmers.kmers.forEach((el, idx)=>{
		dat = regenerate(el)
		masked="filtered";
		if(! data.kmers.masks || ! data.kmers.masks.kmers || data.kmers.masks.kmers[idx]) masked = "visible";
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
	Object.keys(events).forEach(k=>data.kmers.info.events.push({name:k , visible : events[k].visible, filtered :events[k].filtered }));
	Object.keys(genes).forEach(k=>data.kmers.info.genes.push({name:k , visible : genes[k].visible , filtered : genes[k].filtered }));
}

function checkFileMatrix(file_name) {
	return new Promise((resolve, reject)=>{
		if ( processor ){
			console.log("opening matrices")
			processor.getMatrices(false).then((matrices)=>{
				let mat_i = matrices.findIndex(mat=>{
					return mat.uid == file_name;
				});
				if ( mat_i == -1 ){
					resolve(file_name);
				} else {
					processor.getAggregated(file_name).then((local_mat)=>{
						console.log("resolving with " +local_mat )
						resolve(local_mat);
					}).catch((err)=>{
						reject(err);
					})
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

function openNewData(new_data, infos){
	return new Promise((resolve, reject)=>{
		let file_type = checkDataType(new_data)
        if (file_type){
            data[file_type]=new_data;
            user_session.data.files[file_type]=infos;
            user_session.data.files[file_type].info=data[file_type].info;
            user_session.save();
            if ( file_type == "kmers"){
         	   data[file_type].kmers.forEach((n, idx) =>{
         		  n.fc.forEach((v, idy)=>{
         			  if ( typeof v != "number" ){
         				  data[file_type].kmers[idx].fc[idy]=Infinity;
         			  }
         		  }) 
         	   });
         	  data.kmers.info.final_kmers = data.kmers.kmers.length;
               initAlignmentMaps();
               initEvents();
               initBestScores();
            } else if (file_type == "models" ) {
               initModelsMaps();
            }
            resolve(file_type);
        } else {
        	reject("File not recognized.")
        }
	})
}

function openData(file_name_input, callback_success, callback_fail) {
	checkFileMatrix(file_name_input).then((file_name)=>{
		if (typeof file_name != typeof "string" ){
			openNewData(file_name, {"file" : file_name_input , "original_request" : file_name_input } ).then((res)=>{
				callback_success(res)
			}).catch((err)=>{
				callback_fail(err);
			})
		} else {
			fs.readFile( file_name, 'utf-8', (err, content)=>{
				console.log(file_name)
		        if (err){
		            callback_fail(err);
		            return;
		        } else {
		            try {
		            	openNewData(JSON.parse(content), {"file" : file_name , "original_request" : file_name_input}).then((res)=>{
		    				callback_success(res);
		    			}).catch((err)=>{
		    				callback_fail(err);
		    			})
		            } catch(err){
		                console.log(err);
		                callback_fail(err)
		            }
		        }
		    });
		}
	});
    
}


function openKmerMatrix(content){
    data["kmers"]={info : {groups : [], groups_names : [] , samples_names : [] , events : []} , kmers : [] };
    if (content[0]=="\t" && content.length > 2){
        content=content.split("\n");
        let line= content[0].split("\t");
        data.kmers.info.samples_name= line.slice(1);
        line = content[1].split("\t").slice(1);
        data.kmers.info.groups_names= [... new Set(line)];
        data.kmers.info.sample_per_grp = new Array(data.kmers.info.groups.length).fill(0);
        line.forEach((v)=>{
            data.kmers.info.groups.push(data.kmers.info.groups_names.indexOf(v));
            data.kmers.info.sample_per_grp[data.kmers.info.groups[data.kmers.info.groups.length-1]]+=1;
        });
        for ( let i=2; i < content.length; i++){
            line = content[i].split("\t");
            let dat={kmer:line[0] , counts : []};
            line.slice(1).forEach((v, vi)=>{
                dat.counts.push(parseFloat(v));
            });
            data.kmers.kmers.push(dat);
        }
        return true;
    }
    throw "Not implemented yet";
}





function getSOMnodeImportance(event, id, request){
    console.log("getSOMnodeImportance");

    //console.log(data);   
	console.log(data.som.nodefeatureimpotance);
    let  data_to_send = [];

    data_to_send.push({"projSOM":regenerate(data.som.nodefeatureimpotance)});
	projSOMnormalize(data_to_send[0],"raw");
	data_to_send.push({"projSOM":regenerate(data.som.nbKmerBynode)});
    projSOMnormalize(data_to_send[1],"raw");
    win.webContents.send("getData-"+id, { "data" : data_to_send,  "message": "SUCCESS" ,"draw" : request.draw , code : 0} );

}
function getSOMaverageclass(event, id, request){
    console.log("getSOMaverageclass");
    if (! data.som.averageclass)
        data.som.averageclass={};
    //console.log(data);   
	//console.log(data.som.averageclass);
    let  data_to_send = [];
	for ( let i=0; i < data.som.meanbycat.length; i++ ){
    	data_to_send.push({"projSOM":regenerate(data.som.meanbycat[i].meanmatrix),"labelsamples":"Mean "+data.som.meanbycat[i].classname,"classori":data.som.meanbycat[i].classname,"classnumber":data.som.meanbycat[i].classid});
		projSOMnormalize(data_to_send[i],request.norm);
	}
 
	
    win.webContents.send("getData-"+id, { "data" : data_to_send,  "message": "SUCCESS" ,"draw" : request.draw, code : 0} );

}

function getSOMclusters(event, id, request){
    console.log("getSOMclusters");
    if (! data.som.samplesSOM)
        data.som.samplesSOM={};
    console.log(data);   
	console.log(data.som.samplesSOM[0]);
    let  data_to_send = [];
    let count=0, i=0;

    for ( let i=0; i < data.som.samplesSOM.length; i++ ){
        data_to_send.push(regenerate(data.som.samplesSOM[i]));
        projSOMnormalize(data_to_send[data_to_send.length-1],request.norm);

    }
	
    win.webContents.send("getData-"+id, { "data" : data_to_send,  "message": "SUCCESS" ,"draw" : request.draw, code : 0} );

}
function getSOMkmers(event, id, request){
	console.log("getSOMkmers");
	console.log(request);
	 let  data_to_send = {};
	kmerindex=[];
	nodesindexint=[]
	console.log(data.som.kmerbmu);
	request.nodesIds.forEach(function(elem, index, array) {
         nodesindexint.push(parseInt(elem));
      })
	data.som.kmerbmu.forEach(function(elem, index, array) {
	    if (nodesindexint.includes(elem)) {console.log(elem);console.log(index);kmerindex.push(clone((index)));}
	
	})
	console.log("kmerindex length");
	console.log(kmerindex.length)
	console.log(data.kmers.length)
	data_to_send["listKmersIndex"]=kmerindex;
	data_to_send["kmers"]=[];
	for(var i = 0; i < kmerindex.length; i++)
  		data_to_send["kmers"].push(clone(data.kmers.kmers[kmerindex[i]]));
	
	// console.log(data.kmers);
	
	console.log(data_to_send);
	/*
     * console.log(data.kmers.kmers[0].genes);
     * console.log(Object.keys(data.kmers));
     * console.log(data.kmers.kmers.length);
     * console.log(Object.keys(data.kmers.kmers[0]));
     * console.log(data.kmers.kmers[0].genes);
     */
	win.webContents.send("getData-"+id, { "data" : data_to_send,  "message": "SUCCESS" ,"draw" : request.draw, code : 0} );
	
}
function getSOMmap(event, id, request){
    console.log("getSOMmap");
    if (! data.som.samplesSOM)
        data.som.samplesSOM={};
        
    let  data_to_send = [];
   
	
    data_to_send.push(clone(data.som.samplesSOM[request.idmap]));
	projSOMnormalize(data_to_send[0],request.norm);
    win.webContents.send("getData-"+id, { "data" : data_to_send,  "message": "SUCCESS" ,"draw" : request.draw, code:0} );

}



function checkDataType(new_data, file_type){
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

function projSOMnormalize(proj,normstyle){
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
	  		arr[index] = (item - data.som.minmatrix[index])/(data.som.maxmatrix[index]-data.som.minmatrix[index]);
		else if (normstyle=="centerAvrg"){
			if ((data.som.meanmatrix[index]-minmap)>(maxmap -data.som.meanmatrix[index])){
				maxmap=data.som.meanmatrix[index]+(data.som.meanmatrix[index]-minmap);
			}else{
				minmap=data.som.meanmatrix[index]-(maxmap -data.som.meanmatrix[index]);
			}
			// console.log("aftercentere")
				// console.log(minmap);
				// console.log(maxmap);
			arr[index] = ((((item-data.som.meanmatrix[index])-minmap)/(maxmap-minmap)));
		}else if (normstyle=="raw")
			arr[index] = (item -minmap)/(maxmap-minmap);
	})
	return proj;
}

function clone(obj){
    return JSON.parse(JSON.stringify(obj));
}


function regenerate(ref){
    let dat = clone(ref);
    if ( dat.signatures ){
        for ( let el in dat.signatures ){
            dat.signatures[el]=clone(data.kmers.signatures[dat.signatures[el]]);
        }
    }
    if (dat.kmer && data.models ){
        dat.score = data.models.info.feature_prevalence[data.models.info.feature_to_index[dat.kmer]];
    }
    if (dat.kmer && data.importance){
        dat.importance = data.importance.features_importances[dat.kmer]
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
function initAlignmentMaps(){
    // TODO : remove the following part, it's a fix for a bug
    data.kmers.kmers.forEach((el)=>{
        if ( el.alignments && el.alignments.length > 0 ){
            el.id = el.alignments[0].query_index;
        }
    });
    // / TODO till here
    ["sequences", "kmers"].forEach(request_type=>{
            console.log("Creating map for " + request_type)
            alignment_map[request_type]={}
            let aln;
            for ( var k = 0 ; k < data.kmers[request_type].length ; k++ ){
                if (data.kmers[request_type][k].alignments ){
                    for (var i=0; i <  data.kmers[request_type][k].alignments.length; i++ ){
                        aln=data.kmers[request_type][k].alignments[i];
                        if (! alignment_map[request_type][aln.chromosome] ) {
                            alignment_map[request_type][aln.chromosome]=[];
                        }
                        alignment_map[request_type][aln.chromosome].push([ aln.start ,  k,  i]);
                        let p=aln.start+1000;
                        while ( p < aln.end ) {
                            alignment_map[request_type][aln.chromosome].push([ p,  k,  i]);
                            p=p+1000;
                        }
                        alignment_map[request_type][aln.chromosome].push([aln.end,  k,  i]);
                    }
                }
            }
            Object.keys(alignment_map[request_type]).forEach(k => {
                alignment_map[request_type][k].sort((a,b)=>a[0]-b[0]);
            });
        }
    );
}

// / initialize the map to retrieve the index given a feature name
function initModelsMaps(){
    data.models.info.feature_to_index={};
    for ( var k in data.models.info.index_to_feature){
        data.models.info.feature_to_index[data.models.info.index_to_feature[k]]= k;
    }
}

let binary_search = function (arr, x, start, end) { 
    
    // Base Condtion
    if (start >= end) return start; 
   
    // Find the middle index
    let mid=Math.floor((start + end)/2); 
   
    // If element at mid is greater than x,
    // search in the left half of mid
    if(arr[mid][0] > x)  
        return binary_search(arr, x, start, mid-1); 
    else
  
        // If element at mid is smaller than x,
        // search in the right half of mid
        return binary_search(arr, x, mid+1, end); 
} 


let getFeatures = function (request) {
    console.log("getFeatures received");
    var features=[], keep, aln, kmer, dataset =data.kmers[request.type], added=new Set();
    if ( dataset && alignment_map[request.type][request.chr]) {
        if ( request.end - request.start < 1000 ){
            request.end=request.end+500;
            request.start=request.start-500; 
        }
        let start = binary_search( alignment_map[request.type][request.chr], request.start, 0, alignment_map[request.type][request.chr].length-1)
        let end = binary_search( alignment_map[request.type][request.chr], request.end, start, alignment_map[request.type][request.chr].length-1)
        for ( var i=start ; i<= end; i++ ){
            let mapInfo = alignment_map[request.type][request.chr][i];
            aln = dataset[mapInfo[1]].alignments[mapInfo[2]];
            if ( ! added.has(aln.id) ){
               added.add(aln.id);
               let feat = regenerate(aln);
               feat.best_value = request.type == "kmers" ? Math.max(...dataset[mapInfo[1]].values) : Math.max(...dataset[mapInfo[1]].best_kmer_values); 
               features.push(feat);
            }
        }
    }
    return { "data" : features,  "message": "SUCCESS", "request" : request, code : 0 };
}


let getDataByID = function(request) {
    let el_id= request.request.id , el_type=request.request.type;
    if (typeof el_id == "number"){
        let dat = data[request.file_type][el_type].find((el)=>{
            return el.id == el_id ;
        });
        if ( dat ){
            return  { "data" : regenerate(dat) ,  "message": "SUCCESS" };
        }
    } else {
        let dat = data[request.file_type][el_type].find((el)=>{
            return el.kmer == el_id ;
        });
        if ( dat ){
            return { "data" : regenerate(dat) ,  "message": "SUCCESS" , code : 0}; 
        }
        
    }
    return {  "message": "Element not found", code : 1 };
}

function getGenes(event){
    let out=new Set(), obj;
    for ( let order=0; order < data.kmers.orders_idxs.kmers.length; order++ ){
        i = data.kmers.orders_idxs.kmers[order];
        if (! data.kmers.masks.kmers || data.kmers.masks.kmers[i] || event.all ){
            obj=regenerate(data.kmers.kmers[i]);
            obj.events.forEach(ev=>{
                ev.gene.forEach(g => out.add(g))
            });
        }
    }
    if ( out.has("")) out.delete("");
    return [...out];
}



function getKmers(event, id, request) {
	if ( ! data.kmers) {
		win.webContents.send("getData-"+id, { "data" : [],  "message": "FAILED", "draw" : request.draw, 
	        "recordsTotal" :0, "recordsFiltered" : 0, code:1 } );
		return;
	}
    if (! data.kmers.kmers) data.kmers.sequences= {};
    if (! data.kmers.current_search ) data.kmers.current_search={};
    if (! data.kmers.orders) data.kmers.orders={};
    if (! data.kmers.masks) data.kmers.masks={};
    if (! data.kmers.orders_idxs) data.kmers.orders_idxs = {};
    if (!data.kmers.orders.kmers || data.kmers.orders.kmers != request.order ){
        data.kmers.orders.kmers = request.order;
        data.kmers.orders_idxs.kmers = [ ...Array(data.kmers.kmers.length).keys() ];
        var s_c= data.kmers.orders.kmers.name;
        var asc = data.kmers.orders.kmers.asc;
        if ( s_c == "kmer" ){
            data.kmers.orders_idxs.kmers.sort((a,b)=>{
                 return data.kmers.kmers[a].kmer < data.kmers.kmers[b].kmer ? 1 : -1 ;   
            });
        }
        if ( s_c == "best_rank" ){
            data.kmers.orders_idxs.kmers.sort((a,b)=>{
                 return data.kmers.kmers[a].best_rank - data.kmers.kmers[b].best_rank;   
            });
        }
        if ( s_c == "events" ){ 
                data.kmers.orders_idxs.kmers.sort((a,b)=>{
                    if (data.kmers.kmers[a].events[0] && data.kmers.kmers[b].events[0] ){
                        return data.kmers.kmers[a].events[0].type < data.kmers.kmers[b].events[0].type ? 1 : -1;
                    } else {
                        return data.kmers.kmers[a].events[0] ? -1 : 1 ;                            
                    }
   
                });
        }
        if ( s_c == "genes" ){ 
                data.kmers.orders_idxs.kmers.sort((a,b)=>{
                    if (data.kmers.kmers[a].events[0] && data.kmers.kmers[b].events[0] ){
                        return data.kmers.kmers[a].events[0].gene < data.kmers.kmers[b].events[0].gene ? 1 : -1;
                    } else {
                        return data.kmers.kmers[a].events[0] ? -1 : 1 ;                            
                    }
   
                });
        }
        if ( s_c == "position" ){ 
                data.kmers.orders_idxs.kmers.sort((a,b)=>{
                    if (data.kmers.kmers[a].alignments && data.kmers.kmers[b].alignments && data.kmers.kmers[a].alignments[0] && data.kmers.kmers[b].alignments[0]  ){
                        if (data.kmers.kmers[a].alignments[0].chromosome == data.kmers.kmers[b].alignments[0].chromosome ){
                            return data.kmers.kmers[a].alignments[0].start < data.kmers.kmers[b].alignments[0].start ? 1 : -1;
                        } else {
                            return data.kmers.kmers[a].alignments[0].chromosome < data.kmers.kmers[b].alignments[0].chromosome  ? 1 : -1;
                        }
                    } else {
                        return data.kmers.kmers[a].alignments ? -1 : 1 ;                            
                    }
                });
        }
        
        if ( s_c == "importance" ){
            if ( data.importance ){
                let fi=data.importance.features_importances
                data.kmers.orders_idxs.kmers.sort((a,b)=>{
                    let k1 = data.kmers.kmers[a].kmer, k2= data.kmers.kmers[b].kmer;
                    return fi[k1] ? fi[k2] ? fi[k1].rank - fi[k2].rank  : -1 : 1 ; 
               });    
            }
        }
        if (s_c.substring(0, 6) == "value_" ){
            let pred_n = parseInt( s_c.substring(6) );
            if ( pred_n >= 0 ) {
                data.kmers.orders_idxs.kmers.sort((a,b)=>{
                    return data.kmers.kmers[a].values[pred_n] < data.kmers.kmers[b].values[pred_n] ? -1 : 1 ;                            
                });
            }
        }
        if (s_c.substring(0, 3) == "fc_" ){
            let pred_n = parseInt( s_c.substring(3) );
            if ( pred_n >= 0 ) {
                data.kmers.orders_idxs.kmers.sort((a,b)=>{
                    return  ! isFinite(data.kmers.kmers[a].fc[pred_n]) ? 1 : ! isFinite(data.kmers.kmers[b].fc[pred_n]) ? -1 : data.kmers.kmers[a].fc[pred_n] < data.kmers.kmers[b].fc[pred_n]? -1 : 1 ;                            
                });
            }
        }
        if (s_c.substring(0, 5) == "mean_" ){
        	let class_n = parseInt( s_c.substring(5) );;
            if ( class_n >= 0 ){
              data.kmers.orders_idxs.kmers.sort((a,b)=>{
                  return data.kmers.kmers[a].means[class_n] < data.kmers.kmers[b].means[class_n] ? -1 : 1 ;                            
              });
            }
        }
        if (s_c.substring(0, 5) == "pval_" ){
        	let class_n = parseInt( s_c.substring(5) );;
            if ( class_n >= 0 ){
              data.kmers.orders_idxs.kmers.sort((a,b)=>{
                  return data.kmers.kmers[a].pvalues[class_n] < data.kmers.kmers[b].pvalues[class_n] ? -1 : 1 ;                            
              });
            }
        }
        
        if (! asc ) data.kmers.orders_idxs.kmers = data.kmers.orders_idxs.kmers.reverse();
    }
    let recordsFiltered=data.kmers.kmers.length;
    if (! data.kmers.current_search.kmers || data.kmers.current_search.kmers != request.search || data.kmers.current_search.subset != request.subset  || data.kmers.current_search.eventsFilter != request.eventsFilter || data.kmers.current_search.minPred!=request.minPred ){
        if ( request.search.value.length >= 2 || request.subset.length > 0 || request.eventsFilter.length != data.kmers.info.events.length || request.minCount != 0 || request.minPred != 0 || request.minFC != 0 || request.minPval != 0 ){
            data.kmers.current_search.kmers = request.search;
            data.kmers.current_search.subset = request.subset;
            data.kmers.current_search.eventsFilter=request.eventsFilter;
            data.kmers.current_search.minCount=request.minCount;
            data.kmers.current_search.minPred=request.minPred;
            data.kmers.current_search.minPval=request.minPval;
            data.kmers.current_search.minFC=request.minFC;
            if (! data.kmers.masks.kmers) data.kmers.masks.kmers = new Array(data.kmers.kmers.length);
            for ( var e=0; e < data.kmers.kmers.length; e++){
                data.kmers.masks.kmers[e]=false;
                if (request.minPred  == 0 || data.kmers.kmers[e].values.find((n)=>{ return n >=  request.minPred ;} ) != undefined  ){
              	if (request.minFC  == 0 || data.kmers.kmers[e].fc.find((n)=>{ if ( typeof n == "number") { return  Math.abs(n) >=  request.minFC; } else { return true;} } ) != undefined   ){
           		if (request.minPval  == 0 || data.kmers.kmers[e].pvalues.find((n)=>{ return n <=  request.minPval ;} ) != undefined  ){
                if (request.subset.length == 0 || request.subset.includes(data.kmers.kmers[e].kmer)){
                	if ( request.minCount == 0 || data.kmers.kmers[e].counts.find((n)=>{ return n >=  request.minCount ;} ) != undefined )  {
                		if ( request.eventsFilter.length == data.kmers.info.events.length || hasEvents(data.kmers.kmers[e], request.eventsFilter ) ){
                			if ( data.kmers.current_search.kmers.value.length < 2 || JSON.stringify(data.kmers.kmers[e]).includes(data.kmers.current_search.kmers.value) ) data.kmers.masks.kmers[e]=true;
                		}
                	}}}}
                }
                if (! data.kmers.masks.kmers[e]) recordsFiltered--;
            }
            
        } else {
            if (! data.kmers.masks.kmers ) data.kmers.masks.kmers = new Array(data.kmers.kmers.length);
            data.kmers.masks.kmers.fill(true);
        }
    } else {
        if (! data.kmers.current_search.kmers ){
            data.kmers.current_search.kmers= {"recordsFiltered" : recordsFiltered};
        } else {
            recordsFiltered = data.kmers.current_search.kmers.recordsFiltered;
        }
    }
    let  data_to_send = [];
    let count=0, i=0, start = request.pageIndex*request.pageSize, end=(request.pageIndex+1)*(request.pageSize);
    for ( let order=0; order < data.kmers.orders_idxs.kmers.length; order++ ){
        i = data.kmers.orders_idxs.kmers[order];
        if (! data.kmers.masks.kmers || data.kmers.masks.kmers[i]){
            if ( count >= start && count < end ){
                data.kmers.kmers[i].idx=i;
                data_to_send.push(regenerate(data.kmers.kmers[i]));
                data_to_send[data_to_send.length-1].original_index=i;
                if ( data_to_send.length == request.pageSize ){
                	order = data.kmers.orders.kmers.length;
                }
            }
            count++;
        } 
    }
    initEvents();
    win.webContents.send("getData-"+id, { "data" : data_to_send,  "message": "SUCCESS", "draw" : request.draw, code : 0,
        "recordsTotal" : data.kmers.kmers.length, "recordsFiltered" :  recordsFiltered, "stats" :  { genes : data.kmers.info.genes, events : data.kmers.info.events  } } );
};

function hasEvents(dat,evs ){
	for ( let i=0; i< dat.events.length; i++){
		if (evs.includes(dat.events[i].type)) return true;
	}
	return false;
}

function extend(obj, src) {
    for (var key in src) {
        obj[key]= src[key];
    }
    return obj;
}




//// SECURITY



const users = new Store({ configName: 'users',
    defaults: { users : [ { name : "public" , password : "None", isRoot: false} , { name : "root" , password : "root", isRoot: true} ] }
});

function loadProfileFiles(){
	if (user_session.data.files ){
        Object.keys(user_session.data.files).forEach(file_type => {
           let fname = user_session.data.files[file_type].original_request;
           if ( ! fname ){
        	   fname = user_session.data.files[file_type].file
           }
           console.log("opening "+ fname);
           openData(fname, ()=>{}, (err)=>{
        	   console.log(err)
        	   closeData(file_type);
           	   sendMessage({error: err,code : 1, message : "Error opening file "+fname });
           });
        });
        user_session.save();
    }
}


function login(user_name, password, force=false){
    let request_user = users.data["users"].find((u)=>{return u.name == user_name || u.mail == user_name});
    if ( request_user  ){
        if (  password == request_user.password || force){
            user_session = new Store({configName : user_name+"-data" , defaults : {profile : {name : user_name,  picture : "" , process_config : { profiles : []} }, files : {}}});
            if ( ! user_session.data.profile.process_config ){
                user_session.data.profile.process_config = {profiles : [], current_profile : 0}
                user_session.save();
            }
            return  "SUCCESS" ;
        }
        return "ERROR: wrong password." ;
    } else {
        return "ERROR: user " + user_name + "  not found.";
    }
}

function logout(){
    login("public", "None");
    /*user_session.data={profile : {name : "public",  picture : ""  }, files : {}};
    user_session.save();*/
    data={};
}

function createUser(userName, email, passwd){
    let requested = users.data["users"].find((el) => el.name == userName );
    if ( requested &&  requested.length != 0  ){
        return "ERROR: "+userName+" already exists.";
    }
    users.data["users"].push({name : userName , "email" : email, "password" : passwd, isRoot : false});
    users.save();
    return  "SUCCESS"
}

function removeUser(userName ){
    let requested = users.data["users"].find((el) => el.name == userName );
    if (! requested  ){
        return "ERROR: "+userName+" doesn't exists.";
    }
    users.data["users"] = users.data["users"].filter((el) =>el.name != userName );
    users.save();
    return "SUCCESS";
}


function setProfile(profile_number){
	return new Promise((resolve, reject)=>{
		if (typeof profile_number == 'undefined' ){
			if (! user_session.data.profile.process_config.current_profile){
				reject("No profile given")
				return;
			}
			profile_number=user_session.data.profile.process_config.current_profile;
		} else {
			user_session.data.profile.process_config.current_profile=profile_number;
		}
		processor = new Processor(user_session.data.profile.process_config.profiles[profile_number]);
		let ct=user_session.data.profile.process_config.profiles[profile_number].connection_type;
		if (ct == "local" ){
			if (local_queue ){
				local_queue.destroy();
			}
			local_queue = new LocalQueue(processor.options);
			processor.setQueue(local_queue);
		}
		processor.getMatrices().then((res)=>{
			resolve();
		});
		console.log("Profile= "+profile_number +"("+user_session.data.profile.process_config.profiles[profile_number].setting_name+")" )
	});
	
}

let sendMessage=function(content){
	win.webContents.send("message", content);
}

let sendSession=function(){
	console.log("Sending get session");
	win.webContents.send("getSession", {"message" : "SUCCESS", "session" : user_session.data});
}

ipcMain.on("getSession", () => {
	sendSession();
});

let saveProfile = function( request) {
   if ( request.profile ){
	   let tmp_proc = new Processor();
	   let with_error=0;
	   tmp_proc.checkOptions(request.profile).subscribe((mess)=>{
		   win.webContents.send("action-"+request.id, {  "message": mess, "code" : 0 } );
	   }, (err)=>{
		   win.webContents.send("action-"+request.id, {  "message": err , "code" : 1} );
		   with_error=1;
	   }, ()=>{
		   if ( with_error==0 ){
			   if ( request.profile_number == user_session.data.profile.process_config.profiles.length ){
				   request.profile.id =makeid(20); 
				   user_session.data.profile.process_config.profiles.push(request.profile);
			   } else {
				   if (!user_session.data.profile.process_config.profiles[request.profile_number].id ){
					   request.profile.id =makeid(20);
				   }else {
					   request.profile.id=user_session.data.profile.process_config.profiles[request.profile_number].id
				   }
				   user_session.data.profile.process_config.profiles[request.profile_number] = request.profile;
			   }
			   setProfile(request.profile_number).then(()=>{
				   user_session.save();
				   win.webContents.send("action-"+request.id, {  "message": "COMPLETED",  "code" : 0} );   
			   }, err =>{
				   user_session.save();
				   win.webContents.send("action-"+request.id, {  "message": err,  "code" : 1} );  
			   })
		   }
	   });
   }else {
	   if (request.profile_number < user_session.data.profile.process_config.profiles.length){
		   setProfile(request.profile_number).then(()=>{
			   user_session.save();
			   win.webContents.send("action-"+request.id, { "message": "COMPLETED", "code" : 0} );
		   }, err =>{
			   user_session.save();
			   win.webContents.send("action-"+request.id, { "message": err, "code" : 1} );
		   });
	   } else {
		   win.webContents.send("action-"+request.id, {  "message": "ERROR: profile number "+request.profile_number+ " is not available.", "code" : 1} );
	   }
   }
   
}


/*

ipcMain.on("login" , (event, request) => {
    let message = login(request.user.name , request.user.password);
    if (request.user.rememberMe){
        console.log("Remember " + user_session.data.profile.name)
        store.set("session", {user : user_session.data.profile.name });
    } else {
        store.set("session", {user : "public" });
    }
    win.webContents.send("login-"+request.id, { "user" :  user_session.get("profile"),  "message": message } );
    win.webContents.send("getUser", { "user" : user_session.get("profile") ,  "message": "SUCCESS"} );
});

ipcMain.on("logout" , (event, request) => {
    logout();
    store.set("session", {user : "public" });
    win.webContents.send("logout-"+request.id, { "user" : user_session.get("profile") ,  "message": "SUCCESS" } );
    win.webContents.send("getUser", { "user" : user_session.get("profile") ,  "message": "SUCCESS"} );
});

ipcMain.on("createUser" , (event, request) => {
    let message = createUser(request.user.name , request.user.email, request.user.password);
    if ( message == "SUCCESS" ) {
        message = login(request.user.name , request.user.password);
    }
    win.webContents.send("createUser-"+request.id, { "user" : user_session.get("profile") ,  "message": message} );
    win.webContents.send("getUser", { "user" : user_session.get("profile") ,  "message": "SUCCESS"} );
});

ipcMain.on("removeUser" , (event, request) => {
    let message = removeUser(request.user_name, request.hashed_passwd);
    win.webContents.send("removeUser-"+request.id, { "user" : user_session.get("profile") ,  "message": message} );
});

ipcMain.on("getUser",  (event, request) => {
   win.webContents.send("getUser", { "user" : user_session.get("profile") ,  "message": "SUCCESS"} );
});

*/



let saveKmerTable = function(request) {
   var fs = require('fs');
   var stream = fs.createWriteStream(request.file);
   let gene_corr={};
   for ( let g in data.kmers.genes ){
       gene_corr[data.kmers.genes[g].name]=data.kmers.genes[g].gene_id 
   }
   if (! request.file_type ) request.file_type="matrix";
   stream.once('open', function(fd) {
       let line="", obj;
       console.log("file open");
       if ( request.file_type=="matrix" || request.file_type=="matrix_raw" ) {
           line= "\t"+data.kmers.info.samples_names.join("\t")+"\ngroup"
           data.kmers.info.groups.forEach((g)=>{
               line=line + "\t"+data.kmers.info.groups_names[g];  
           });
           stream.write(line+"\n");
           for ( let order=0; order < data.kmers.orders_idxs.kmers.length; order++ ){
               let i = data.kmers.orders_idxs.kmers[order];
               if (! data.kmers.masks.kmers || data.kmers.masks.kmers[i] ){
                   data.kmers.kmers[i].idx=i;
                   obj=regenerate(data.kmers.kmers[i])
                   line = obj.kmer;
                   obj.counts.forEach((c, cidx)=>{
                       if (request.file_type=="matrix_raw" ){
                           line= line +"\t"+c;
                       }else {
                           line = line +"\t"+(c/data.kmers.info.count_normalization[cidx]);
                       }
                   });
                   stream.write(line + "\n");
               }
           }
       } else {
           let obj, gene_name, gene_id, aln_pos;
           stream.write("Gene\tGeneName\tEvent\t"+data.kmers.info.predictors.join("\t")+"\tkmer\talignment"+"\n")
           for ( let order=0; order < data.kmers.orders_idxs.kmers.length; order++ ){
               i = data.kmers.orders_idxs.kmers[order];
               if (! data.kmers.masks.kmers || data.kmers.masks.kmers[i]){
                   data.kmers.kmers[i].idx=i;
                   obj=regenerate(data.kmers.kmers[i]);
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
                           stream.write(gene_id+"\t"+gene_name+"\t"+obj.events[e].type+"\t"+obj.values.join("\t")+"\t"+obj.kmer+"\t"+aln_pos+"\n");
                       }
                   }
               } 
           }
       }
     stream.end();
     win.webContents.send("action-"+request.id, {"message": "SUCCESS", code : 0} );
   });
};


function makeid(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}


let runJob = function (request) {
	console.log(request);
	if (processor ){
		request.data.uid= makeid(20);
		processor.run(request).subscribe((status)=>{
			win.webContents.send("action-"+request.id, status );
		}, (err) =>{
			console.log(err);
			win.webContents.send("action-"+request.id, err );
		}, () =>{
			win.webContents.send("action-"+request.id, {"message": "COMPLETED", code : 0} );
		});
	} else {
		win.webContents.send("action-"+request.id, {"message": "There is no profile loaded", "code" : 1} );
	}
}

