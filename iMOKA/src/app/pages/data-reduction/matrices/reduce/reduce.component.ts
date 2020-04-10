import { Component, OnInit, Inject , NgZone} from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {Matrix} from '../../../../interfaces/samples';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import { QueueService } from '../../../../services/queue.service';

@Component({
  selector: 'app-reduce',
  templateUrl: './reduce.component.html',
  styleUrls: ['./reduce.component.css']
})
export class ReduceComponent implements OnInit {
    
    detailsControl : FormGroup;
    procControl :FormGroup;
error_message : string;
loading_message : string;
  constructor( public dialogRef: MatDialogRef<ReduceComponent>,
          @Inject(MAT_DIALOG_DATA) public matrix : Matrix,
          private queue : QueueService, private fb: FormBuilder, private zone : NgZone) { 
      
  }

  ngOnInit() {
      this.procControl = this.fb.group({
          cores : [8,  [Validators.min(1), Validators.max(100)]],
          mem : [16,  [Validators.min(1), Validators.max(100)]],
      });
      this.detailsControl = this.fb.group({
          accuracy :[65, [Validators.min(50), Validators.max(99)]],
          test : [0.25, [Validators.min(0.05), Validators.max(0.50)]],
          crossvalidation : [100, [Validators.min(10), Validators.max(1000)]],
          crossvalidationsd : [0.5, [Validators.min(0.05), Validators.max(5)]],
          entropyone : [0.25, [Validators.min(0.05), Validators.max(1)]],
          entropytwo : [0.05, [Validators.min(0.005), Validators.max(1)]],
      });
  }
  send(){
      this.loading_message = "Sending the process..."
          this.error_message=undefined;
          
          let data={matrix : this.matrix , parameters : this.detailsControl.value, process : this.procControl.value};
          this.queue.sendJob({name: "reduce", data : data}).subscribe((resp)=>{
              this.zone.run(()=>{
                  this.loading_message = resp.message
                 });
          }, err =>{
              this.zone.run(()=>{
                  if (typeof err == "string"){
                      this.error_message = err
                  } else if ( err.message ){
                      this.error_message = err.message
                      if (err.error && err.error.stderr){
                          this.error_message += "\n" +err.error.stderr; 
                      }
                  } else if ( err.stderr){
                      this.error_message = err.stderr
                  }
                  this.loading_message=undefined;
             });
          }, () =>{
              this.zone.run(()=>{ this.loading_message = "Job in queue. You can check the progress in your dashboard"} );
              if ( typeof this.error_message == "undefined" ){
                  setTimeout(()=>{
                       this.zone.run(()=>{
                          this.loading_message=undefined;
                          this.close();
                         });
                         }, 2000 );
                  }
                  
          });
  }
  
  isValid(){
      return this.procControl.valid && this.detailsControl.valid; 
  }
  close(){
      this.dialogRef.close();
  }
  
}
