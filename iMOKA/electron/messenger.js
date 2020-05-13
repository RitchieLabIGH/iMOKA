'use strict';
const EventEmitter = require('events');
class Messenger extends EventEmitter {
	
	sendMessage(content){
		if ( typeof content =="string" ){
			this.emit("message", {message : content} );
		} else {
			this.emit("message", content);
		}
	}
	block(content){
		if ( typeof content == "string" ){
			this.sendMessage({message : content, action : "block" , type : "action" })
		} else {
			content.action = "block";
			content.type= "action";
			this.sendMessage(content);
		}
	}
	release(content){
		if ( typeof content == "string" ){
			this.sendMessage({message : content, action : "release" , type : "action" })
		} else {
			content.action = "release";
			content.type= "action";
			this.sendMessage(content);
		}
	}
}

module.exports = Messenger