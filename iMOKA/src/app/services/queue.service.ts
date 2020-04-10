import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IpcRenderer } from 'electron';

@Injectable({
  providedIn: 'root'
})
export class QueueService {
    protected request: number = 0;
    protected ipc : IpcRenderer;
    electron : boolean = false;
    protected queue : Observable<any>;

    constructor( protected http: HttpClient ) {
        if ( ( <any>window ).require ) {
            try {
                this.ipc = ( <any>window ).require( "electron" ).ipcRenderer;
                this.electron=true;
                this.queue = new Observable<any>(observer=>{
                    this.ipc.on("queue", (event, response)=>{
                        console.log(response);
                        if (response.code == 0 ){
                            observer.next(response.data);
                        } else {
                            observer.error(response);
                        }
                        
                     });
                 });
            } catch ( error ) {
                throw error;
            }
        } else {
            console.warn( "Could not load electron ipc" );
       }
    }
    
    
    
    delJob(job_uid: any):Observable<any>{
        return this.sendAction({action : "queueAction", subaction : "delete", uid : job_uid });
    }
    
    sendJob(request) : Observable<any>{
        var id = this.request;
        this.request += 1;
        request.id = id; 
        request.action="runJob";
        this.ipc.send( "action",id,  request );
        return new Observable<any>(observer=>{
           this.ipc.on("action-"+id, (event, response)=>{
               console.log("---UEM_SERIVCE ms---")
               console.log(response);
               console.log("---UEM_SERIVCE me---")
              if ( response.code == 0){
                  observer.next(response);
              } else {
                  observer.error(response);
                  observer.complete();
              }
              if (response.message == "COMPLETED"){
                  observer.complete();
                  this.ipc.removeAllListeners("action-"+id);
              }
           }); 
        });
    }
    
    getQueue() : Observable<any> {
        return this.queue;
    }
	updateQueue(){
		this.ipc.send( "getData", 0 , {data : "queue"});
	}
    
    sendAction(request):Observable<any> {
        let id = this.request;
        this.request = this.request+1;
        this.ipc.send("action", id, request);
        return new Observable<any>(observer=>{
            this.ipc.on("action-"+id, (event, response)=>{
               if ( response.code == 0){
                   observer.next(response);
               } else {
                   observer.error(response);
                   observer.complete();
               }
               if (response.message == "COMPLETED"){
                   observer.complete();
                   this.ipc.removeAllListeners("action-"+id);
               }
            }); 
         });
    }
    
    
    
}
