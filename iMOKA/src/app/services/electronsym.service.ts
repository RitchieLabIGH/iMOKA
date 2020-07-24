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
	data : any= {};
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
		if (args.length >1 ){
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
				
			} else if (args[1].action == "getFile" ){
				var input = document.createElement('input');
				input.type = 'file';
				input.onchange = (e : any) => {
					this.block("Reading the file...") 
   					var file = e.target.files[0]; 
				    var reader = new FileReader();
   					reader.readAsText(file,'UTF-8');
				   	reader.onload = (readerEvent : any) => {
      					var content = JSON.parse(readerEvent.target.result); 
      				    if (content.kmers){
							content.kmers.forEach((km, idx)=> {km.best_rank=idx;})
							this.data.kmers= content;
							this.initEvents();
							console.log(this.data.kmers.info)
							this._session.files["kmers"]={file : file.name, info : content.info, original_request : file.name};
							this.release("File k-mer read.")
							this.sendSession();
						} else {
							this.release("File not recognized!")	
						}
   					}
					
				}
				input.click();
				
			} else if (args[1].data == "samples"){
				this._listeners[channel+"-"+args[0]].forEach((list)=>{
					let samples=[];
					this.data.samples = {number : samples.length , total_kmers : samples.reduce((prev, x)=> {return prev + x.total_suffix}, 0 ) };
					list({},{ "message": "SUCCESS", code: 0, data : samples , recordsTotal : samples.length, recordsFiltered : samples.length, stats : {}});
				})
			} else if (args[1].data == "kmers") {
				console.log("Sending to "+channel+"-"+args[0])
				this._listeners[channel+"-"+args[0]].forEach((list)=>{
					let data_to_send=[];
					for ( let i=args[1].pageIndex * args[1].pageSize; i <=(args[1].pageIndex+1) * args[1].pageSize; i++){
						data_to_send.push(this.regenerate(this.data.kmers.kmers[i]));
					}
					let response={ "data" : data_to_send,  "message": "SUCCESS", "draw" : args[1].draw, code : 0,
		        "recordsTotal" : this.data.kmers.kmers.length, 
		        "recordsFiltered" :  this.data.kmers.kmers.length, 
		        "stats" :  { genes : this.data.kmers.info.genes, events : this.data.kmers.info.events  } };	
					list({},response);
				})
				
			}
		} else if ( channel == "getSession"){
			this.sendSession();
		}
        
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
	
	clone(ref :any){
		return JSON.parse(JSON.stringify(ref));
	}
	
	regenerate(kmer : any){
		let dat = this.clone(kmer);
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

	sendSession(){
		this._listeners["getSession"].forEach((list)=>{
					list({},  {"message" : "SUCCESS", "session" : this._session})
				});
	}
	
	block(message : string){
		this._listeners["message"].forEach((list)=>{
			list({}, {"message" : message, action : "block" , type : "action"})
		})
	}
	release(message : string){
		this._listeners["message"].forEach((list)=>{
			list({}, {"message" : message, action : "release" , type : "action"})
		})
	}
	message(message : string){
		this._listeners["message"].forEach((list)=>{
			list({}, {"message" : message})
		})
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