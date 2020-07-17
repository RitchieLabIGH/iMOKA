import { Injectable } from '@angular/core';
import { IpcRenderer } from 'electron';
import {Session, Profile, Setting} from '../interfaces/session';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root'
})



export class ElectronSymService implements IpcRenderer{
	
	_listeners :any = {};
	_session : Session = new Session();
	
	constructor(){
		this._session.profile = new Profile();
		if ( environment.default_profile ){
			this._session.profile.process_config.current_profile=0;
			this._session.profile.process_config.profiles= [new Setting()];
		}
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
				this.sendSession()
			} else if (args[1].action == "saveProfile" ){
				this._listeners[channel+"-"+args[0]].forEach((list)=>{
					list({},{"message" : "Some messages....", code : 0});
				})
				setTimeout(()=>{
					if ( args[1].profile) {
						if (this._session.profile.process_config.profiles.length > args[1].profile_number ){
							this._session.profile.process_config.profiles[args[1].profile_number]= args[1].profile;
						}else {
							this._session.profile.process_config.profiles.push(args[1].profile);	
						}	
					}
					this._session.profile.process_config.current_profile= args[1].profile_number;
					this._listeners[channel+"-"+args[0]].forEach((list)=>{
						list({},{"message" : "COMPLETED", code : 0});
					})
					this._listeners[channel+"-"+args[0]]=[];
				}, 2000)
				
			}
		} else if ( channel == "getSession"){
			this.sendSession();
		}
        
    }
	sendSession(){
		this._listeners["getSession"].forEach((list)=>{
					list({},  {"message" : "SUCCESS", "session" : this._session})
				});
	}

    removeListener(channel: string, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }
    removeAllListeners(channel: string): this {
		this._listeners[channel]=undefined;
		return this;
    }
    once(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void): this {
		console.log("Requested once("+channel+")")
		if (! this._listeners[channel]) this._listeners[channel]=[]
        this._listeners[channel].push(listener);
		return this;
    }
    on(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void): this {
		console.log("Requested on("+channel+")")
		if (! this._listeners[channel]) this._listeners[channel]=[]
        this._listeners[channel].push(listener);
		return this;
    }
    invoke(channel: string, ...args: any[]): Promise<any> {
        throw new Error("Method not implemented.");
    }
	
}