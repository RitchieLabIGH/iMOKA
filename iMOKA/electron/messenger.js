'use strict';
const EventEmitter = require('events');
class Messenger extends EventEmitter {
	
	sendMessage(content){
		this.emit("message", content);
	}
}

module.exports = Messenger