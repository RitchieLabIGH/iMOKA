import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

@Component({
  selector: 'app-sequence-info',
  templateUrl: './sequence-info.component.html',
  styleUrls: ['./sequence-info.component.css']
})
export class SequenceInfoComponent implements OnInit, OnDestroy {
    data: any = {}
    info :any;
    sequence : any;
  constructor(@Inject(MAT_DIALOG_DATA) public inData: any ) {
        this.sequence = inData.sequence;
        this.info= inData.info;
    }

  ngOnInit() {
      console.log(this.sequence);
  }
  ngOnDestroy(){
      
  }
  
}
