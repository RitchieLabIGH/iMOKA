import { Injectable } from '@angular/core';
import { IpcRenderer } from 'electron';
import {Session, Profile} from '../interfaces/session';
@Injectable({
  providedIn: 'root'
})



export class ElectronSymService implements IpcRenderer{
	
	_listeners :any = {};
	_session : Session = new Session();
	
	constructor(){
		this._session.profile = new Profile();
		this._session.profile.id="ElectronSymProfile";
		this._session.profile.name="ElectronSymProfile";
	}
	
    eventNames(): (string | symbol)[] {
        throw new Error("Method not implemented.");
    }
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }
    listenerCount(type: string | symbol): number {
        throw new Error("Method not implemented.");
    }
    emit(event: string | symbol, ...args: any[]): boolean {
        throw new Error("Method not implemented.");
    }
    listeners(event: string | symbol): Function[] {
        throw new Error("Method not implemented.");
    }
    getMaxListeners(): number {
        throw new Error("Method not implemented.");
    }
    setMaxListeners(n: number): this {
        throw new Error("Method not implemented.");
    }
    addListener(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }
    sendToHost(channel: string, ...args: any[]): void {
        throw new Error("Method not implemented.");
    }
    sendTo(webContentsId: number, channel: string, ...args: any[]): void {
        throw new Error("Method not implemented.");
    }
    sendSync(channel: string, ...args: any[]) {
        throw new Error("Method not implemented.");
    }
    send(channel: string, ...args: any[]): void {
		console.log("Sending "+channel +" with args:");
		console.log(args)
		if (args.length >1 && args[1].action ){
			if (( args[1].action == "getSession" || args[1].action == "updateSession" ) && this._listeners["getSession"]){
				this._listeners["getSession"].forEach((list)=>{
					list({},  {"message" : "SUCCESS", "session" : this._session})
				});
			}
		}
        
    }
    removeListener(channel: string, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }
    removeAllListeners(channel: string): this {
        throw new Error("Method not implemented.");
    }
    once(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }
    on(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void): this {
		console.log("Requested on("+channel+")")
		if (! this._listeners[channel])this._listeners[channel]=[]
        this._listeners[channel].push(listener);
		return this;
    }
    invoke(channel: string, ...args: any[]): Promise<any> {
        throw new Error("Method not implemented.");
    }
	
}