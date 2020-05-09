import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IpcRenderer } from 'electron';




export class ExternalTrack {
    name: string;
    path: string;
}



@Injectable( {
    providedIn: 'root'
} )

export class TracksService {
    protected request: number = 0;
    protected ipc : IpcRenderer;
    constructor( protected http: HttpClient ) {
        if ( ( <any>window ).require ) {
            try {
                this.ipc = ( <any>window ).require( "electron" ).ipcRenderer;
            } catch ( error ) {
                throw error;
            }
        } else {
            console.warn( "Could not load electron ipc" );
        }
    }


    getExternalTracks( name: string ): Observable<ExternalTrack[]> {
        return this.http
            .get<ExternalTrack[]>( 'assets/data/' + name + '.json' );
    }

    count(): number {
        return this.request;
    }


 
    
    getDataTable( dataTablesParameters : any) : Observable<any[]>{
        var id = this.request;
        this.request += 1;
        this.ipc.send( "getData" , id, dataTablesParameters);
        return new Observable<any[]>(observer => {
            this.ipc.once( "getData-" + id, ( event, arg ) => {
                dataTablesParameters.recordsTotal= arg.recordsTotal;
                dataTablesParameters.recordsFiltered=arg.recordsFiltered;
                dataTablesParameters.stats = arg.stats;
                observer.next(arg.data);
            });
        });
    }
   
    
    getData(data_type:any) : Observable<any>{
        var id = this.request;
        this.request += 1;
		if (typeof data_type != 'string') {
			this.ipc.send( "getData" , id, data_type);
		} else {
			this.ipc.send( "getData" , id, {data : data_type});	
		}
        
        return new Observable<any>(observer => {
            this.ipc.once( "getData-" + id, ( event, arg ) => {
                if (arg.code != 0 ){
					observer.error(arg.message)
				}else{
					observer.next(arg.data);
				}
                observer.complete();
            });
        });
    }
    async getFeatures(chr, bpStart, bpEnd, type){
        var id = this.request;
        this.request+=1;
        this.ipc.send("getData", id , {data : "features", "id" : id, "chr" : chr, "start" : bpStart, "end" : bpEnd, "type" : type})
        return new Promise<any>(( resolve) => {
            this.ipc.once( "getData-" + id, ( event, arg ) => {
                resolve( arg.data );
            });
        });
    }
    
    async getInfo(file_type:string="kmers"){
        var id = this.request;
        this.request+=1;
        this.ipc.send("getData", id, { "file_type" : file_type, data : "info" } )
        return new Promise<any>(( resolve) => {
            this.ipc.once( "getData-" + id, ( event, arg ) => {
                resolve( arg.data );
            });
        });
    }
    async getDataByID(request, file_type="kmers"){
        var id = this.request;
        this.request+=1;
        this.ipc.send("getData", id, { data : "data_by_id" ,  request : request , file_type : file_type} )
        return new Promise<any>(( resolve) => {
            this.ipc.once( "getData-" + id, ( event, arg ) => {
                resolve( arg );
            });
        });
    }

    async getGenes(request){
        var id = this.request;
        this.request+=1;
        this.ipc.send("getData",id,  {data : "genes", id : id, request : request } )
        return new Promise<any>(( resolve) => {
            this.ipc.once( "getData-" + id, ( event, arg ) => {
                resolve( arg );
            });
        });
    }

}

