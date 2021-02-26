import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IpcRenderer } from 'electron';
import { ElectronSymService } from './electronsym.service';



export class ExternalTrack {
	name: string;
	path?: string;
	index?:string;
	annotations? : ExternalTrack[];
	format? : string;
	type ? :string;
}



@Injectable({
	providedIn: 'root'
})

export class TracksService {
	protected request: number = 0;
	protected ipc: IpcRenderer;
	constructor(protected http: HttpClient, private sym: ElectronSymService) {
		if ((<any>window).require) {
			try {
				this.ipc = (<any>window).require("electron").ipcRenderer;
			} catch (error) {
				throw error;
			}
		} else {
			this.ipc = sym;
			console.warn("Could not load electron ipc");
		}
	}


	getExternalTracks(name: string): Observable<ExternalTrack[]> {
		var id = this.request;
		this.request += 1;
		return new Observable<ExternalTrack[]>((observer) => {
			this.ipc.once("getData-"+id, (event, arg)=>{
				observer.next(arg.data);
				observer.complete();
			})
			this.ipc.send("getData", id, {data: "igvAnnotation", name: name} );
		});
	}

	count(): number {
		return this.request;
	}




	getDataTable(dataTablesParameters: any): Observable<any[]> {
		var id = this.request;
		this.request += 1;

		return new Observable<any[]>(observer => {
			this.ipc.once("getData-" + id, (event, arg) => {
				dataTablesParameters.recordsTotal = arg.recordsTotal;
				dataTablesParameters.recordsFiltered = arg.recordsFiltered;
				dataTablesParameters.stats = arg.stats;
				observer.next(arg.data);
			});
			this.ipc.send("getData", id, dataTablesParameters);
		});
	}


	getData(data_type: any): Observable<any> {
		var id = this.request;
		this.request += 1;
		return new Observable<any>(observer => {
			this.ipc.once("getData-" + id, (event, arg) => {
				if (arg.code != 0) {
					observer.error(arg.message)
				} else {
					observer.next(arg.data);
				}
				observer.complete();
			});
			if (typeof data_type != 'string') {
				this.ipc.send("getData", id, data_type);
			} else {
				this.ipc.send("getData", id, { data: data_type });
			}
		});
	}
	async getFeatures(chr, bpStart, bpEnd, type) {
		var id = this.request;
		this.request += 1;

		return new Promise<any>((resolve) => {
			this.ipc.once("getData-" + id, (event, arg) => {
				resolve(arg.data);
			});
			this.ipc.send("getData", id, { data: "features", "id": id, "chr": chr, "start": bpStart, "end": bpEnd, "type": type })
		});
	}

	async getInfo(file_type: string = "kmers") {
		var id = this.request;
		this.request += 1;

		return new Promise<any>((resolve) => {
			this.ipc.once("getData-" + id, (event, arg) => {
				resolve(arg.data);
			});
			this.ipc.send("getData", id, { "file_type": file_type, data: "info" })
		});
	}
	async getDataByID(request, file_type = "kmers") {
		var id = this.request;
		this.request += 1;
		return new Promise<any>((resolve) => {
			this.ipc.once("getData-" + id, (event, arg) => {
				resolve(arg);
			});
			this.ipc.send("getData", id, { data: "data_by_id", request: request, file_type: file_type })
		});
	}

	async getGenes(request) {
		var id = this.request;
		this.request += 1;
		return new Promise<any>((resolve) => {
			this.ipc.once("getData-" + id, (event, arg) => {
				resolve(arg);
			});
			this.ipc.send("getData", id, { data: "genes", id: id, request: request })
		});
	}

	async getIdeogram(request) {
		var id = this.request;
		this.request += 1;
		return new Promise<any>((resolve) => {
			this.ipc.once("getData-" + id, (event, arg) => {
				resolve(arg);
			});
			this.ipc.send("getData", id, { data: "ideogram", id: id, request: request })
		});
	}

}

