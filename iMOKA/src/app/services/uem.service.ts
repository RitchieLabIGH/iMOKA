import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { IpcRenderer } from 'electron';
import {Session, Message} from '../interfaces/session';

@Injectable({
  providedIn: 'root'
})
export class UemService {

    protected request: number = 0;
    protected ipc : IpcRenderer;
    electron : boolean = false;
    session : BehaviorSubject<Session> = new BehaviorSubject<Session>(undefined);
    messages : BehaviorSubject<Message> = new BehaviorSubject<Message>(undefined);
    

    constructor( protected http: HttpClient ) {
        if ( ( <any>window ).require ) {
            try {
                this.ipc = ( <any>window ).require( "electron" ).ipcRenderer;
                this.electron=true;
            } catch ( error ) {
                throw error;
            }
        } else {
            console.warn( "Could not load electron ipc" );
       }
        this.ipc.on("getSession", (event, response) => {
            if ( response.message == "SUCCESS"){
				this.session.next(response.session);	
            } else {
                this.session.error(response.message);
            }
            });
        this.ipc.on("message", (event, response)=>{
            this.messages.next(response);
        });
		this.refreshSession();
    }
    
    getSession() : Observable<Session>{
        return this.session.asObservable(); 
    }
	updateSession(){
		this.ipc.send("getSession");
	}
	
	getMessage() : Observable<Message>{
		return this.messages.asObservable();
	}
	
	refreshSession(){
		var id = this.request;
        this.request += 1;
        let request= {action : "updateSession"}; 
        this.ipc.send( "action", id, request );
        return new Observable<any>(observer=>{
           this.ipc.once("action-"+id, (event, response)=>{
              if ( response.code == 0){
                  observer.next(response);
              } else {
                  observer.error(response);
              }
              if (response.message == "COMPLETED"){
                  this.ipc.send("getSession");
                  observer.complete();
                  this.ipc.removeAllListeners("action-"+id);
              }
           }); 
        });
	}
    
    saveProfile(request) : Observable<any>{
        var id = this.request;
        this.request += 1;
        request.id = id; 
        request.action= "saveProfile";
        this.ipc.send( "action", id, request );
        return new Observable<any>(observer=>{
           this.ipc.on("action-"+id, (event, response)=>{
              if ( response.code == 0){
                  observer.next(response);
              } else {
                  observer.error(response);
              }
              if (response.message == "COMPLETED"){
                  this.ipc.send("getSession");
                  observer.complete();
                  this.ipc.removeAllListeners("action-"+id);
              }
           }); 
        });
    }
    
    
    
}
