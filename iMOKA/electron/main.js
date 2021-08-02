'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, protocol } = require('electron');
if (require('electron-squirrel-startup')) return app.quit(); // from https://www.electronforge.io/config/makers/squirrel.windows

const Store = require('./store.js');
const rimraf = require("rimraf");
const path = require('path');
const fs = require('fs');
const iMokaBE = require('./imokaBackEnd.js')
const Messenger = require('./messenger.js')
const randomAccessFile = require('random-access-file')

if ('ELECTRON_IS_DEV' in process.env && parseInt(process.env.ELECTRON_IS_DEV, 10) === 1) {
	require('electron-reload')(path.join(__dirname, '..', 'dist'), {electron : path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron')})
}

app.disableHardwareAcceleration()

let win, backend, mess;

const store = new Store({
	configName: 'user-preferences',
	defaults: {
		BrowserWindowConfig: {
			width: 800,
			height: 600,
			x: 0,
			y: 0,
			backgroundColor: '#ffffff',
			webPreferences: {
				nodeIntegration: true
			}
		},
		tmpDir: app.getPath('userData') + "/tmp/"
	}
});

app.whenReady().then(() => {
	protocol.registerBufferProtocol('serve', (request, callback) => {
		let url = request.url.replace("serve://", "").replace(/\?[^/]+/, "");
		if (request.headers.Range) {
			var file=randomAccessFile(url, {writable:false})
			let bytes=request.headers.Range.split("=")[1].split("-").map((v)=>{return parseInt(v)});
			file.read(bytes[0], bytes[1]-bytes[0], (err, data)=>{
				callback({data : data,  statusCode : 206})
				file.close()
			})
		} else {
			fs.readFile(url, (err, data) => {
				callback(data)
			})
		}


	});
})


function createWindow() {


	// Create the browser window.
	let conf = store.get('BrowserWindowConfig');
	conf.frame = true;
	conf.icon = __dirname + "/../dist/assets/images/256x256.png";
	mess = new Messenger();
	win = new BrowserWindow(conf);
	function saveWindowBounds() {
		store.set('BrowserWindowConfig', win.getBounds());
	}
	// Event when the window is closed.
	win.on('closed', function() {
		win = null
	})
	win.on('resize', saveWindowBounds);
	win.on('move', saveWindowBounds);
	if (!('ELECTRON_IS_DEV' in process.env && parseInt(process.env.ELECTRON_IS_DEV, 10) === 1)) {
		Menu.setApplicationMenu(null)
	}
	win.loadFile(`./dist/index.html`);
	backend = new iMokaBE(mess);
	rimraf(store.get('tmpDir'), (err) => {
		if (err) {
			console.log(err)
		} else {
			fs.mkdir(store.get('tmpDir'), { recursive: true }, () => { return; });
		}
	});
	backend.tmp_dir = store.get('tmpDir');
	fs.mkdir(store.get('tmpDir'), { recursive: true }, () => { return; });
	if (store.data.session) {
		backend.login(store.data.session.user, "", true);
	} else {
		backend.logout();
	}
	backend.setProfile().then(() => {
	}).catch((err) => {
		console.log(err);
	}).finally(() => {
		win.webContents.on('new-window', function(event, url) {
			event.preventDefault();
			if (url.match(/^unsafe:remote/)) {
				backend.getRemoteFile(url.replace("unsafe:remote://", "/")).then((file) => {
					shell.openExternal("file://" + file);
				}).catch((err) => {
					mess.sendMessage({ message: err })
					console.log(err)
				});
			} else {
				shell.openExternal(url);
			}

		});
		backend.on("sendSession", (session) => {
			win.webContents.send("getSession", { "message": "SUCCESS", "session": session });
		});
		backend.on("queue", (queue) => {
			win.webContents.send("queue", { "message": "SUCCESS", code: 0, "data": queue });
		});
		mess.on("message", (content) => {
			win.webContents.send("message", content);
		})
		backend.sendSession();
	});

}
app.on("open-file", (event, url) => {
});
// Create window on electron intialization
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed.
app.on('window-all-closed', function() {
	if (backend && backend.local_queue) {
		backend.local_queue.destroy();
	}
	// On macOS specific close process
	if (process.platform !== 'darwin') {
		app.quit()
	}
})


String.prototype.hashCode = function() {
	var hash = 0, i, chr;
	if (this.length === 0) return hash;
	for (i = 0; i < this.length; i++) {
		chr = this.charCodeAt(i);
		hash = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
};



/// ipcMain listeners

ipcMain.on("getData", (event, id, request) => {
	let promise = undefined;
	let event_id = "getData-" + id;
	if (request.data == "kmers") {
		promise = backend.getKmers(event, id, request);
	} else if (request.data == "data_by_id") {
		promise = backend.getDataByID(request);
	} else if (request.data == "genes") {
		promise = backend.getGenes(request);
	} else if (request.data == "ideogram") {
		promise = backend.getIdeogram(request.request);
	} else if (request.data == "queue") {
		backend.sendQueue();
	} else if (request.data == "samples") {
		promise = backend.getSamples(request);
	} else if (request.data == "matrix") {
		promise = backend.getMatrices(request);
	} else if (request.data == "features") {
		promise = backend.getFeatures(request)
	} else if (request.data == "info") {
		promise = backend.getInfo(request);
	} else if (request.data == "SOMclusters") {
		promise = backend.getSOMclusters(request);
	} else if (request.data == "SOMmap") {
		promise = backend.getSOMmap(request);
	} else if (request.data == "SOMkmers") {
		promise = backend.getSOMkmers(request);
	} else if (request.data == "SOMimportance") {
		promise = backend.getSOMnodeImportance(request);
	} else if (request.data == "SOMaverageclass") {
		promise = backend.getSOMaverageclass(request);
	} else if (request.data == "SOMsampleDistrib") {
		promise = backend.getSOMsampleDistrib(request);
	} else if (request.data == "SOMexpressionByNode") {
		promise = backend.getSOMexpressionByNode(request);
	} else if (request.data.includes("importance")) {
		promise = backend.getImportance(request.data);
	} else if (request.data == "igvAnnotation") {
		promise = backend.getIGVAnnotations(request.name);
	} else {
		console.log("UNRECOGNIZED REQUEST " + request.data)
		win.webContents.send("getData-" + id, { "message": "Unrecognized request " + request.data });
	}
	if (promise) {
		promise.then((res) => {
			if (res.data) {
				win.webContents.send(event_id, res);
			} else {
				win.webContents.send(event_id, { code: 0, "message": "SUCCESS", data: res });
			}

		}).catch((err) => {
			console.log(err);
			win.webContents.send(event_id, { "message": err, code: 1 });
			mess.sendMessage({ "message": err, "type": "error" });
		})
	}
});


ipcMain.on("action", (event, id, request) => {
	request.id = id;
	if (request.action == "saveKmerTable") {
		var fs = require('fs');
		var writable = fs.createWriteStream(request.file);
		let req = backend.getKmerTable(request);
		req.pipe(writable);
		req.on('end', () => {
			win.webContents.send("action-" + request.id, { "message": "File created correctly", code: 0 });
		});
		req.on('error', (err) => {
			win.webContents.send("action-" + request.id, { "message": err, code: 1 });
		})
	} else if (request.action == "getFile") {
		getFile(request);
	} else if (request.action == "getNewFile") {
		getNewFile(request);
	} else if (request.action in backend) {
		let action = backend[request.action](request);
		if (action instanceof Promise) {
			action.then((res) => {
				win.webContents.send("action-" + request.id, { "message": res, code: 0 });
			}).catch((err) => {
				console.log(err)
				win.webContents.send("action-" + request.id, { "message": err, code: 1 });
				mess.sendMessage({ "message": err, "type": "error" });
			});
		} else {
			let has_err = false;
			action.subscribe((res) => {
				win.webContents.send("action-" + request.id, { "message": res, code: 0 });
			}, (err) => {
				has_err = true;
				console.log(err);
				if (err.message) {
					mess.sendMessage({ "message": err.message, "type": "error" });
				} else {
					mess.sendMessage({ "message": err, "type": "error" });
				}

			}, () => {
				if (has_err) {
					win.webContents.send("action-" + request.id, { "message": "COMPLETED", "code": 1 });
				} else {
					win.webContents.send("action-" + request.id, { "message": "COMPLETED", "code": 0 });
				}

			})
		}
	} else {
		win.webContents.send("action-" + id, { "message": "Action " + request.action + " not recognized." });
	}
});



function getFile(arg) {
	if (typeof arg.defaultPath == "undefined") {
		if (!store.get("lastDir")) {
			store.set("lastDir", { path: app.getPath('home') })
		}
		arg.defaultPath = store.get("lastDir").path;
	}
	dialog.showOpenDialog(win, arg).then((response) => {
		if (!response.canceled && response.filePaths.length > 0) {
			let newpath, full_path = response.filePaths[0];
			if (fs.existsSync(full_path) && fs.lstatSync(full_path).isDirectory()) {
				newpath = full_path;
			} else {
				newpath = response.filePaths[0].substring(0, response.filePaths[0].lastIndexOf("\/") + 1);
			}
			store.set("lastDir", { path: newpath })
		}
		win.webContents.send("action-" + arg.id, response);
	})
}


function getNewFile(arg) {

	if (typeof arg.defaultPath == "undefined") {
		if (!store.get("lastDir")) {
			store.set("lastDir", { path: app.getPath('home') })
		}
		arg.defaultPath = store.get("lastDir").path;
	}
	dialog.showSaveDialog(win, arg).then((fileName) => {
		if (!fileName.canceled) {
			let newpath = fileName.filePath.substring(0, fileName.filePath.lastIndexOf("\/") + 1);
			store.set("lastDir", { path: newpath })
		}
		win.webContents.send("action-" + arg.id, fileName.filePath);
	});
}


ipcMain.on("getSession", () => {
	backend.sendSession();
});



