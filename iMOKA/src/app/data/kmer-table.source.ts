import { Injectable } from '@angular/core';
import {DataSource, CollectionViewer} from '@angular/cdk/collections'
import { Observable, BehaviorSubject, of , pipe} from 'rxjs';
import {  catchError, finalize  } from 'rxjs/operators';
import { IpcRenderer } from 'electron';
import { TracksService } from '../services/tracks.service';
import {Kmer} from '../interfaces/kmer';


@Injectable({
  providedIn: 'root'
})


export class KmerTableSource implements DataSource<Kmer> {
  private kmerSubject = new BehaviorSubject<Kmer[]>([]);
    
  constructor(private trackService :TracksService ) { }

  connect(collectionViewer: CollectionViewer): Observable<Kmer[]> {
      return this.kmerSubject.asObservable();
  }

  disconnect(collectionViewer: CollectionViewer): void {
      this.kmerSubject.complete();
  }
  
  loadKmer(request : any) : Promise<void> {
      request.data="kmers";
      return new Promise((resolve, reject) => {
          this.trackService.getDataTable(request).pipe(
                  catchError(()=>{
                      reject();
                      return of([]);
                      }
                  ),
          ).subscribe(kmers => {
              console.log(kmers);
              this.kmerSubject.next(kmers);
              resolve();
           }, (err)=>{reject(err);});
      });
      
  }

  
}
