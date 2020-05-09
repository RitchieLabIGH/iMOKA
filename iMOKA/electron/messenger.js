'use strict';
const EventEmitter = require('events');
class Messenger extends EventEmitter {
	
	sendMessage(content){
		this.emit("message", content);
	}
	block(content){
		content.action = "block";
		content.type= "action";
		this.emit("message", content);
			
	}
	release(content){
		content.action = "release";
		content.type= "action";
		this.emit("message", content);
			
	}
}

module.exports = Messenger