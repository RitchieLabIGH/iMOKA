import { Injectable } from '@angular/core';
import { DataSource, CollectionViewer } from '@angular/cdk/collections'
import { Observable, BehaviorSubject, of, pipe } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SamplesService } from '../services/samples.service';
import { Sample } from '../interfaces/samples';


@Injectable( {
    providedIn: 'root'
} )


export class SampleTableSource implements DataSource<Sample> {
    private sampleSubject = new BehaviorSubject<Sample[]>( [] );

    public samples: Sample[];
    public all_samples : Sample[];
    constructor( private sampleService: SamplesService ) { }

    connect( collectionViewer: CollectionViewer ): Observable<Sample[]> {
        return this.sampleSubject.asObservable();
    }

    disconnect( collectionViewer: CollectionViewer ): void {
        this.sampleSubject.complete();
    }

    update(): Promise<any> {
        return new Promise(( resolve, reject ) => {
            this.sampleService.getSamples(true).subscribe( response => {
				console.log(response)
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
    
    filter(request : any, subject : number[]) : number[] {
        Object.keys(request.metadataKeyValFilter).forEach((k)=>{
                if (request.metadataKeyValFilter[k].length == 0 ){
                    /// delete request.metadataKeyValFilter[k];
                }
            });
        return subject.filter(( sam_n ) => {
			let sam=this.all_samples[sam_n]
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
			if ( keep && request.k_length.length > 0){
				keep = keep && (request.k_length.includes(sam.k_len+""));
			}
			
            return keep;
        } );
    }
    
    sort(request, subject : number[]): number[]{
        subject.sort(( sa, sb ) => {
                return this.all_samples[sa][request.order.name] < this.all_samples[sb][request.order.name] ? -1 : 1;
            } );
        if ( request.order.asc ) subject.reverse();
        return subject; 
    }
    
    get_stats() :any {
        let stats = {metadata : [], fastqc :0, k_len : []};
        this.all_samples.forEach(( sam ) => {
			let is_ok=this.samples.includes(sam);
            sam.metadata.forEach( met => {
                let n = stats.metadata.findIndex( md => { return md.key == met.key } );
                if ( n == -1 ) {
					n=stats.metadata.length
                    stats.metadata.push( { key: met.key, values: [{ value: met.value, count: 0 }] , count : 0 } );
                }
				if (is_ok) stats.metadata[n].count += 1;
                let m = stats.metadata[n].values.findIndex( md => { return md.value == met.value } );
                if ( m == -1 ) {
					m=stats.metadata[n].values.length
                    stats.metadata[n].values.push( { value: met.value, count: 0 } )
                }
				if (is_ok) stats.metadata[n].values[m].count += 1;
            } );
            if ( sam.fastqc ) stats.fastqc += 1;
			let n = stats.k_len.findIndex(kl=>{return kl.value == sam.k_len+"" ;})
            if ( n==-1 ) {
				n=stats.k_len.length
				stats.k_len.push({value :sam.k_len+"", count : 0 })
			}
			if (is_ok)	stats.k_len[n].count+=1;
        });
        return stats;
    }

    processRequest( request ): Sample[] {
		if ( ! this.all_samples ){
			return [];
		}
		let samples_n = this.sort(request, this.filter(request , [ ...Array(this.all_samples.length).keys() ]));
        let from_n = request.pageIndex*request.pageSize, to_n: number;
        
        request.recordsTotal= this.all_samples.length;
        request.recordsFiltered=samples_n.length;
        to_n = samples_n.length < from_n + request.pageSize ?  samples_n.length  : from_n + request.pageSize ;
		this.samples= [];
		samples_n.forEach((i)=>{
				this.samples.push(this.all_samples[i]);
		})
		request.stats = this.get_stats();
        return this.samples.slice(from_n, to_n);
    }

}
