import { Injectable } from '@angular/core';
import { DataSource, CollectionViewer } from '@angular/cdk/collections'
import { Observable, BehaviorSubject} from 'rxjs';
import { TracksService } from '../services/tracks.service';
import { Matrix } from '../interfaces/samples';


@Injectable({
	providedIn: 'root'
})


export class MatrixTableSource implements DataSource<Matrix> {
	private sampleSubject = new BehaviorSubject<Matrix[]>([]);

	public matrices: Matrix[];
	public all_matrices: Matrix[];
	constructor(private trackService: TracksService) { }

	connect(collectionViewer: CollectionViewer): Observable<Matrix[]> {
		return this.sampleSubject.asObservable();
	}

	disconnect(collectionViewer: CollectionViewer): void {
		this.sampleSubject.complete();
	}

	update(): Promise<any> {
		return new Promise((resolve, reject) => {
			this.trackService.getDataTable({ data: "matrix" }).subscribe(matrices => {
				matrices.forEach((mat: Matrix) => {
					mat.stats = [];
					mat.groups_names.forEach((gn, i) =>{
						let obj={ name: gn, samples: 0 };
						mat.groups.forEach((g)=>{
							if ( g == gn) obj.samples+=1;
						})	 
						mat.stats.push(obj)						
					}
						
					);
				});
				this.all_matrices = matrices;
				resolve();
			}, (err) => { reject(err); });
		});
	}

	loadSamples(request: any): Promise<Matrix[]> {
		return new Promise<Matrix[]>((resolve, reject) => {
			if (request.update) {
				this.update().then(() => {
					this.sampleSubject.next(this.processRequest(request));
					resolve();
				});
			} else {
				this.sampleSubject.next(this.processRequest(request));
				resolve();
			}
		});
	}

	filter(request, subject: Matrix[]): Matrix[] {
		return subject.filter((mat) => {
			let keep = true;
			if (request.search.value.length > 2) {
				keep = JSON.stringify(mat).includes(request.search.value);
			}
			return keep;
		});
	}

	sort(request, subject: Matrix[]): Matrix[] {
		subject.sort((sa, sb) => {
			return sa[request.order.name] < sb[request.order.name] ? -1 : 1;
		});
		if (request.order.asc) subject.reverse();
		return subject;
	}

	stats(subject: Matrix[]): any {
		let stats = {};

		return stats;
	}

	processRequest(request): Matrix[] {
		this.matrices = this.sort(request, this.filter(request, this.all_matrices));
		let from_n = request.pageIndex * request.pageSize, to_n;
		request.stats = this.stats(this.matrices);
		request.recordsTotal = this.all_matrices.length;
		request.recordsFiltered = this.matrices.length;
		to_n = this.matrices.length < from_n + request.pageSize ? this.matrices.length : from_n + request.pageSize;
		return this.matrices.slice(from_n, to_n);
	}

}
