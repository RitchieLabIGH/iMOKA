import { Injectable } from '@angular/core';
import { DataSource, CollectionViewer } from '@angular/cdk/collections'
import { Observable, BehaviorSubject, of, pipe } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TracksService } from '../services/tracks.service';
import { Sample } from '../interfaces/samples';


@Injectable( {
    providedIn: 'root'
} )


export class SampleTableSource implements DataSource<Sample> {
    private sampleSubject = new BehaviorSubject<Sample[]>( [] );

    public samples: Sample[];
    public all_samples : Sample[];
    constructor( private trackService: TracksService ) { }

    connect( collectionViewer: CollectionViewer ): Observable<Sample[]> {
        return this.sampleSubject.asObservable();
    }

    disconnect( collectionViewer: CollectionViewer ): void {
        this.sampleSubject.complete();
    }

    update(): Promise<any> {
        return new Promise(( resolve, reject ) => {
            this.trackService.getDataTable( { data: "samples" } ).pipe(
                catchError(() => {
                    reject();
                    return of( [] );
                }
                ),
            ).subscribe( response => {
                this.all_samples = response;
                resolve();
            }, ( err ) => { reject( err ); } );
        } );
    }

    loadSamples( request: any ): Promise<Sample[]> {
        return new Promise<Sample[]>(( resolve, reject ) => {
            if ( request.update ) {
                this.update().then(() => {
                    this.sampleSubject.next( this.processRequest( request ) );
                } );
            } else {
                this.sampleSubject.next( this.processRequest( request ) );
            }
        } );
    }
    
    filter(request : any, subject : Sample[]) : Sample[] {
        Object.keys(request.metadataKeyValFilter).forEach((k)=>{
                if (request.metadataKeyValFilter[k].length == 0 ){
                    delete request.metadataKeyValFilter[k];
                }
            });
        console.log(subject);
        return subject.filter(( sam ) => {
            let keep = true;
            if ( request.search.value.length > 2 ) {
                keep = JSON.stringify( sam ).includes( request.search.value );
            }
            if ( keep && request.metadataKeyFilter.length > 0) {
                keep = keep && ( sam.metadata.findIndex((met)=>{return request.metadataKeyFilter.includes(met.key);})!= -1 );
            }
            if (keep && Object.keys(request.metadataKeyValFilter).length > 0 ){
                Object.keys(request.metadataKeyValFilter).forEach((k)=>{
                    keep = keep && ( sam.metadata.findIndex((met)=>{return met.key == k && request.metadataKeyValFilter[k].includes(met.value);})!= -1 );
                })
            }
            return keep;
        } );
    }
    
    sort(request, subject : Sample[]): Sample[]{
        subject.sort(( sa, sb ) => {
                return sa[request.order.name] < sb[request.order.name] ? -1 : 1;
            } );
        if ( request.order.asc ) subject.reverse();
        return subject; 
    }
    
    stats(subject) :any {
        let stats = {metadata : [], fastqc :0, k_len : {}};
        subject.forEach(( sam ) => {
            sam.metadata.forEach( met => {
                let n = stats.metadata.findIndex( md => { return md.key == met.key } );
                if ( n == -1 ) {
                    stats.metadata.push( { key: met.key, values: [{ value: met.value, count: 1 }] , count : 1 } );
                } else {
                    stats.metadata[n].count += 1;
                    let m = stats.metadata[n].values.findIndex( md => { return md.value == met.value } );
                    if ( m == -1 ) {
                        stats.metadata[n].values.push( { value: met.value, count: 1 } )
                    } else {
                        stats.metadata[n].values[m].count += 1;
                    }
                }
            } );
            if ( sam.fastqc ) stats.fastqc += 1;
            if ( !stats.k_len[sam.k_len + ""] ) stats.k_len[sam.k_len + ""] = 0;
            stats.k_len[sam.k_len + ""] += 1;
        } );
        return stats;
    }

    processRequest( request ): Sample[] {
		if ( ! this.all_samples ){
			return [];
		}
        this.samples = this.sort(request, this.filter(request ,this.all_samples));
        let from_n = request.pageIndex*request.pageSize, to_n: number;
        request.stats = this.stats(this.samples);
        request.recordsTotal= this.all_samples.length;
        request.recordsFiltered=this.samples.length;
        to_n = this.samples.length < from_n + request.pageSize ?  this.samples.length  : from_n + request.pageSize ;
        return this.samples.slice(from_n, to_n);
    }

}
