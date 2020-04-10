'use strict';
const { app, BrowserWindow, ipcMain, dialog , shell, Menu} = require('electron');
const Store  = require('./store.js');
const stream = require('stream');
const rimraf = require("rimraf");

const fs =require('fs');
const iMokaBE = require('./imokaBackEnd.js')
const Messenger = require('./messenger.js')

let win, backend, mess;

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
  let conf=store.get('BrowserWindowConfig');
  
  conf.frame=true;
  conf.icon = './dist/assets/images/256x256.png';
  console.log(conf);
  mess = new Messenger();
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
  if (!('ELECTRON_IS_DEV' in process.env && parseInt(process.env.ELECTRON_IS_DEV, 10) === 1)){
	  Menu.setApplicationMenu(null)  
  } 
  backend = new iMokaBE(mess);
  rimraf(store.get('tmpDir'), (err)=>{ if (err ){
	  console.log(err)
  } else {
	  fs.mkdir(store.get('tmpDir'), {recursive : true}, ()=>{return;});
  } } );
  backend.tmp_dir=store.get('tmpDir');
  win.loadFile(`./dist/index.html`);
  fs.mkdir(store.get('tmpDir'), {recursive : true}, ()=>{return;});
  if (store.data.session){
	  backend.login(store.data.session.user, "" , true);
  }else {
	  backend.logout();
  }
  backend.setProfile().then(()=>{
	  console.log("Profile loaded")
  }).catch((err)=>{
	  console.log(err);
  }).finally(()=>{
	  win.webContents.on('new-window', function(event, url){
	      event.preventDefault();
	      console.log(url)
	      shell.openExternal(url);
	    });
	  backend.on("sendSession", (session)=>{
		  console.log("Sending get session");
		win.webContents.send("getSession", {"message" : "SUCCESS", "session" : session});
	  });
	  backend.on("queue", (queue)=>{
		  console.log("Sending queue");
		  win.webContents.send("queue", {"message" : "SUCCESS",code :0, "data" : queue});
	  });
	  mess.on("message", (content)=>{
		  console.log("Sending message");
		  win.webContents.send("message", content);
	    
	  })
  });
  
}

// Create window on electron intialization
app.on('ready', createWindow)


// Quit when all windows are closed.
app.on('window-all-closed', function () {
	if (backend && backend.local_queue ) {
		backend.local_queue.destroy();
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
	let promise=undefined;
	let event_id="getData-"+id;
    if ( request.data == "kmers" ){
    	promise=backend.getKmers(event, id, request);
    } else if (request.data == "data_by_id") {
    	promise = backend.getDataByID(request);
    }else if ( request.data == "genes"){
    	promise= backend.getGenes(request);
    }else if ( request.data == "queue"){
    	backend.sendQueue();
    } else if (request.data == "samples" ){
    	promise=backend.getSamples(request);
    } else if ( request.data == "matrix" ) {
    	promise= backend.getMatrices(request);
    }  else if ( request.data=="features"){
    	promise= backend.getFeatures(request)
    }  else if (request.data=="info"){
    	promise = backend.getInfo(request);
    } else if ( request.data == "SOMclusters" ){
		promise = backend.getSOMclusters(request);
    } else if ( request.data == "SOMmap" ){
    	promise = backend.getSOMmap(request);
	}else if ( request.data == "SOMkmers" ){
		promise = backend.getSOMkmers(request);
	} else if ( request.data == "SOMimportance" ){
		promise = backend.getSOMnodeImportance(request);
	} else if ( request.data == "SOMaverageclass" ){
		promise = backend.getSOMaverageclass(request);
	} else if (request.data.includes("importance")){
        promise= backend.getImportance(request.data );
    } else {
        win.webContents.send("getData-"+id, { "message": "unrecognized request" } );
    }
    if (promise){
    	promise.then((res)=>{
    		if ( res.data ){
    			win.webContents.send(event_id, res);
    		}else {
    			win.webContents.send(event_id, {code :0 , "message" : "SUCCESS", data : res});
    		}
    		
    	}).catch((err)=>{
    		console.log(err);
    		win.webContents.send(event_id, { "message": err, code:1 } );
    	})
    }
});

ipcMain.on("action" , (event, id, request) => {
    console.log("action request recived " + request.action)
    request.id = id;
    if ( request.action == "saveKmerTable"){
    	var fs = require('fs');
   	 	var writable = fs.createWriteStream(request.file);
   	 	let req= backend.getKmerTable(request);
   	 	req.pipe(writable);
   	 	req.on('end', ()=>{
   	 		win.webContents.send("action-"+request.id, { "message": "File created correctly" , code:0} );
   	 	});
   	 	req.on('error', (err)=>{
   	 		win.webContents.send("action-"+request.id, { "message": err , code:1} );
   	 	})
    } else if ( request.action == "getFile"){
    	getFile(request);
    } else if ( request.action == "getNewFile"){
    	getNewFile(request);
    } else if (request.action in backend){
    	let action = backend[request.action](request);
    	if (action instanceof Promise){
    		action.then((res)=>{
    			win.webContents.send("action-"+request.id, { "message": res , code:0} );
    		}).catch((err)=>{
    			console.log(err)
    		});
    	}else {
    		action.subscribe((res)=>{
    			win.webContents.send("action-"+request.id, { "message": res , code:0} );
    		}, (err)=>{
    			if (err.message){
    				win.webContents.send("action-"+request.id,  err );
    			} else {
    				win.webContents.send("action-"+request.id, { "message": err , code:1} );
    			}
    			
    		},()=>{
    			win.webContents.send("action-"+request.id, { "message": "COMPLETED", "code" : 0} );
    		})
    	}
    } else {
    	win.webContents.send("action-"+id, { "message": "Action "+request.action + " not recognized."} );
    } 
});



function getFile(arg){
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


function getNewFile(arg) {
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
    });
}


ipcMain.on("getSession", () => {
	backend.sendSession();
});



