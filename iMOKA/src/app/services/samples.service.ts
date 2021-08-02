import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IpcRenderer } from 'electron';
import {Matrix, Sample} from '../interfaces/samples';
import {ElectronSymService} from "./electronsym.service";
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SamplesService {
    protected request: number = 0;
    protected ipc : IpcRenderer;
    constructor( protected http: HttpClient , protected sym : ElectronSymService) {
        if ( ( <any>window ).require ) {
            try {
                this.ipc = ( <any>window ).require( "electron" ).ipcRenderer;
            } catch ( error ) {
                throw error;
            }
        } else {
			this.ipc= sym;
            console.warn( "Could not load electron ipc" );
        }
    }
	getSamples(update : boolean=false) : Observable<Sample[]>{
		var id=this.request;
		this.request+=1;
		let dataTablesParameters : any={ data: "samples" , update: update};
		return new Observable<Sample[]>((observer)=>{
			this.ipc.once( "getData-" + id, ( event, arg ) => {
                dataTablesParameters.recordsTotal= arg.recordsTotal;
                dataTablesParameters.recordsFiltered=arg.recordsFiltered;
                dataTablesParameters.stats = arg.stats;
				if ( typeof arg.data != "string" ){
					observer.next(arg.data);	
				} else {
					observer.next([]);
				}
					
            });
			this.ipc.send( "getData" , id, dataTablesParameters);
		})
	}
  

  saveSample(new_samples : any) : Promise<any>{
      var id = this.request;
      this.request += 1;
      return new Promise<any>((resolve, reject)=>{
         this.ipc.once("action-"+id, (event, arg)=>{
            if (arg.code == 0 ){
                resolve(arg.message);
            }  else {
                reject(arg.message);
            }
         });
		this.ipc.send( "action" , id, {data: new_samples, action : "saveSample"});
      });
  }
  
  setMatrix(matrix : Matrix) : Promise<any>{
      var id = this.request;
      this.request += 1;
      
      return new Promise<any>(( resolve, reject ) => {
          this.ipc.once( "action-" + id, ( event, arg ) => {
              if ( arg.code == 0 ){
                  resolve(arg);
              } else {
                  reject(arg);
              }
          });
		this.ipc.send( "action", id , {data  : matrix, action :  "setMatrix" });
      });
  }
  
  deleteMatrix(matrix_uid:string) : Promise<any>{
      var id = this.request;
      this.request += 1;
      return new Promise<any>(( resolve, reject ) => {
          this.ipc.once( "action-" + id, ( event, arg ) => {
              if ( arg.code == 0 ){
                  resolve(arg);
              } else {
                  reject(arg);
              }
          });
		this.ipc.send( "action", id , {data  : matrix_uid, action :  "deleteMatrix" });
      });
  }
  
}
