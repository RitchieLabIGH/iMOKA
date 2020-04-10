import { Component, Input , Inject} from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {ExternalTrack} from '../../../../services/tracks.service';

@Component({
  selector: 'app-open-track',
  template: `
  <h1 mat-dialog-title>External tracks</h1>
      <div mat-dialog-content>
              <mat-list style="height:50vh">
                  <a mat-list-item *ngFor="let track of data.tracks" (click)="submit(track)">
                      {{track.name}}
                  </a>
              </mat-list>
       </div>
  `,
  styleUrls: ['./open-track.component.css']
})


export class OpenTrackComponent  {

    constructor( protected ref: MatDialogRef<OpenTrackComponent>, 
            @Inject(MAT_DIALOG_DATA) public data: {tracks : ExternalTrack[]} ) { }

    submit( track ) {
        this.ref.close( track );
    }

}
