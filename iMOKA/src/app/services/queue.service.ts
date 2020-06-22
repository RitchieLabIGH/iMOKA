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
    
    
    
    delJob(job_uid: any):Promise<any>{
        return this.sendAction({ action : "queueAction", subaction : "delete", uid : job_uid });
    }
    
    sendJob(request) : Promise<any>{
        var id = this.request;
        this.request += 1;
        request.id = id; 
        request.action="runJob";
        this.ipc.send( "action",id,  request );
        return new Promise<any>((resolve, reject)=>{
           this.ipc.on("action-"+id, (event, response)=>{
              if ( response.code != 0){
                  reject(response.message);
              }
              if (response.message == "COMPLETED"){
                  resolve();
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
    
    sendAction(request):Promise<any> {
        let id = this.request;
        this.request = this.request+1;
        this.ipc.send("action", id, request);
        return new Promise<any>((resolve, reject)=>{
            this.ipc.on("action-"+id, (event, response)=>{
               if ( response.code != 0){
					reject(response.message);
               }
               if (response.message == "COMPLETED"){
                   resolve();
                   this.ipc.removeAllListeners("action-"+id);
               }
            }); 
         });
    }
    
    
    
}
