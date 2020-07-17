import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IpcRenderer } from 'electron';
import {Matrix} from '../interfaces/samples';
import {ElectronSymService} from "./electronsym.service";


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
  

  saveSample(new_samples : any) : Promise<any>{
      var id = this.request;
      this.request += 1;
      this.ipc.send( "action" , id, {data: new_samples, action : "saveSample"});
      return new Promise<any>((resolve, reject)=>{
         this.ipc.once("action-"+id, (event, arg)=>{
            if (arg.code == 0 ){
                resolve(arg.message);
            }  else {
                reject(arg.message);
            }
         });
      });
  }
  
  setMatrix(matrix : Matrix) : Promise<any>{
      var id = this.request;
      this.request += 1;
      this.ipc.send( "action", id , {data  : matrix, action :  "setMatrix" });
      return new Promise<any>(( resolve, reject ) => {
          this.ipc.once( "action-" + id, ( event, arg ) => {
              if ( arg.code == 0 ){
                  resolve(arg);
              } else {
                  reject(arg);
              }
          });
      });
  }
  
  deleteMatrix(matrix_uid:string) : Promise<any>{
      var id = this.request;
      this.request += 1;
      this.ipc.send( "action", id , {data  : matrix_uid, action :  "deleteMatrix" });
      return new Promise<any>(( resolve, reject ) => {
          this.ipc.once( "action-" + id, ( event, arg ) => {
              if ( arg.code == 0 ){
                  resolve(arg);
              } else {
                  reject(arg);
              }
          });
      });
  }
  
}
