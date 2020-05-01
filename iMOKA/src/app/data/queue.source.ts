import { Injectable } from '@angular/core';
import { DataSource, CollectionViewer } from '@angular/cdk/collections'
import { Observable, Subscription,BehaviorSubject } from 'rxjs';
import { QueueService } from '../services/queue.service';


@Injectable( {
    providedIn: 'root'
} )


export class QueueSource implements DataSource<any> {
    callback : any;
    public all_queue: any;
    private queue :any;
    private subscription : Subscription;
    private queueSubject = new BehaviorSubject<any[]>( [] );
	private last_request: any;
	public onRefresh :any;
    constructor( public que : QueueService ) {
        this.subscription= this.que.getQueue().subscribe(queue=>{
            this.queue = queue;
			this.renderRequest();
			if (this.onRefresh){
				this.onRefresh();
			}
        }, err=>{
            console.log(err);
        });
    }

    connect( collectionViewer: CollectionViewer ): Observable<any[]> {
        return this.queueSubject.asObservable();
    }

    disconnect( collectionViewer: CollectionViewer ): void {
        this.subscription.unsubscribe();
        this.queueSubject.complete();
    }

	renderRequest():boolean{
		if (this.queue && this.last_request){
                    let out = [] , request=this.last_request;
					if ( ["added", "completed", "started"].includes(request.order.name) ) {
						this.queue.sort((joba, jobb)=>{
                        	return joba.times[request.order.name] < jobb.times[request.order.name]; 
                    	});
					} else {
						this.queue.sort((joba, jobb)=>{
                        	return joba[request.order.name] < jobb[request.order.name]; 
                    	});	
					}
                    if (!request.order.asc){
                        this.queue = this.queue.reverse();
                    }
                    request.recordsTotal = this.queue.length;
                    request.recordsFiltered = this.queue.length;
                    if ( request.search.value.lenght > 2 ){
                        this.queue = this.queue.filter((job)=>{
                            return JSON.stringify(job).includes(request.search.value)
                        });
                        request.recordsFiltered = this.queue.length;
                    }
                    let to_n = (request.pageIndex+1)*request.pageSize , from_n = request.pageIndex*request.pageSize;
                    if ( this.queue.length < to_n ){
                        to_n = this.queue.length;
                    }
                    for ( let i = from_n ; i < to_n; i++){
                        out.push(this.queue[i]);
                    }
                    this.all_queue=this.queue;
                    this.queueSubject.next(out);
                    return true;
                } else {
                    return false;
                }
	}
    loadQueue( request: any ){
        this.last_request=request;
		this.que.updateQueue();
    }

}
