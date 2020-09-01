import { Injectable } from '@angular/core';
import { IpcRenderer } from "electron";
import {ElectronSymService} from "./electronsym.service";


@Injectable( {
    providedIn: 'root'
} )


@Injectable()
export class FileService {
    private ipc: IpcRenderer;
    private requests=0;
    constructor(protected sym: ElectronSymService ) {
        if ( ( <any>window ).require ) {
            try {
                this.ipc = ( <any>window ).require( "electron" ).ipcRenderer;
            } catch ( error ) {
                throw error;
            }
        } else {
            console.warn( "Could not load electron ipc" );
			this.ipc = sym;
        }
    }
    
    
    
    async getFileName(openDialogPropriety : any) {
        var id=this.requests;
        this.requests+=1;
        openDialogPropriety.action = "getFile";
        return new Promise<any>(( resolve, reject ) => {
            this.ipc.once( "action-"+id, ( event, arg ) => {
                resolve(arg);
            } );
            this.ipc.send("action", id, openDialogPropriety  );
        } );
    }
    async getNewFile(openDialogPropriety:any) {
        var id=this.requests;
        this.requests+=1;
        openDialogPropriety.action = "getNewFile";
        return new Promise<string>(( resolve, reject ) => {
            this.ipc.once( "action-"+id, ( event, arg ) => {
                resolve( arg );
            });
            this.ipc.send("action",  id , openDialogPropriety);
        } );
    }
    
    
    async saveKmerTable(file_name : string, file_type:string) {
        var id=this.requests;
        this.requests+=1;
        return new Promise<string>(( resolve, reject ) => {
            this.ipc.once( "action-"+id, ( event, arg ) => {
                resolve( arg );
            } );
            this.ipc.send("action",id,  { action : "saveKmerTable" , file : file_name, id :id, file_type : file_type });
        } );
    }

	async exportExperiment(uid: string, output_folder : string, with_samples : boolean){
		var id=this.requests;
        this.requests+=1;
        return new Promise<string>(( resolve, reject ) => {
            this.ipc.once( "action-"+id, ( event, arg ) => {
                resolve( arg );
            } );
            this.ipc.send("action",id,  { action : "exportExperiment" , folder : output_folder, id :id, experiment_uid : uid ,with_samples: with_samples});
        } );
	}
	
	async importExperiment(input_file:string){
		var id=this.requests;
        this.requests+=1;
        return new Promise<string>(( resolve, reject ) => {
            this.ipc.once( "action-"+id, ( event, arg ) => {
                resolve( arg );
            } );
            this.ipc.send("action",id,  { action : "importExperiment" , input_file: input_file});
        } );
	}

    async load( file: string, ft:string = "deprecated") {
        var id = this.requests;
        this.requests += 1;
        this.ipc.send( "action", id , {file_name : file, action :  "openData"});
        return new Promise<any>(( resolve, reject ) => {
            this.ipc.once( "action-" + id, ( event, arg ) => {
                resolve( arg );
            });
        });
    };    
    async closeData(file_type){
        var id=this.requests;
        this.requests+=1;
        return new Promise<string>(( resolve, reject ) => {
            this.ipc.once( "action-"+id, ( event, arg ) => {
                resolve( arg );
            } );
            this.ipc.send("action", id, { file_type : file_type , action : "closeData" } ) ;
        } );
    }

	importKmerList(request : {original_request : string, new_name:string, action?:string}){
		var id=this.requests;
        this.requests+=1;
        return new Promise<string>(( resolve, reject ) => {
            this.ipc.once( "action-"+id, ( event, arg ) => {
                resolve( arg );
            } );
			request.action="importKmerList";
            this.ipc.send("action", id, request ) ;
        } );
	}
    
}
