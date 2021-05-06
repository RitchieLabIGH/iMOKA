import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';

import { TracksService } from '../../../services/tracks.service';
import { SamplesService } from '../../../services/samples.service';

import { MatrixTableSource } from '../../../data/matrix-table.source';

import {Matrix} from '../../../interfaces/samples';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { ReduceComponent } from './reduce/reduce.component';
import { AggregateComponent } from './aggregate/aggregate.component';
import { InfoComponent, InfoData, InfoListElement } from '../../../core/info/info.component';
import {MatBottomSheet} from '@angular/material/bottom-sheet';

@Component({
  selector: 'app-matrices',
  templateUrl: './matrices.component.html',
  styleUrls: ['./matrices.component.css']
})
export class MatricesComponent implements OnInit {
  matrix : Matrix;
  matrixSource :MatrixTableSource;
  modName : any={};
  
  confirm_delete : string;
  dtOptions: any = {
          displayedColumns: ["name","tag" ,"groups", "reduced" , "aggregated", "remove" ],
          search: { value: "" },
          order: { name: 'name', asc: true },
          minCount: 0,
          pageSize: 10,
          pageIndex: 0,
          draw: 0,
          recordsTotal: 0,
          recordsFiltered: 0,
          stats: {}
      };
  constructor( private sampleService : SamplesService, private trackService : TracksService,
          private zone: NgZone, private snack: MatSnackBar , public dialog: MatDialog
          , private cd: ChangeDetectorRef, private bottomSheet: MatBottomSheet ) { }

  ngOnInit() {
      this.matrixSource = new MatrixTableSource(this.trackService);
      this.refreshTable(undefined,true);
  }
  saveRowName(uid:string ){
      let matrix = this.matrixSource.all_matrices.find((mat)=>{return mat.uid ==uid;});
      if (! matrix ){
          this.snackMessage("ERROR", "Matrix not found! "+ uid, {});
          return false;
      }
      this.sampleService.setMatrix(matrix).then((resp)=>{
          this.snackMessage("Matrix "+matrix.name+" created successfully.","SUCCESS",{});
          this.zone.run(()=>{this.modName[uid]=undefined;});
      }).catch((err)=>{
          if (err.message ){
              this.snackMessage("ERROR", err.message, {});
          } else if ( typeof err == "string" ){
              this.snackMessage("ERROR", err, {});
          } else {
              this.snackMessage("ERROR", JSON.stringify(err), {});
          }
          
      });
  }
  
  refreshTable( event?: any, update?: boolean ) {
      if ( event ) {
          if ( event.pageSize ) {
              this.dtOptions.pageSize = event.pageSize;
              this.dtOptions.pageIndex = event.pageIndex;
          }
          if ( event.active ) {
              this.dtOptions.order.name = event.active;
              this.dtOptions.order.asc = event.direction == "asc";
          }
          if ( event == "search" ) {
              this.dtOptions.pageIndex = 0;
          }
      }
      if ( update ) {
          this.dtOptions.update = true;
      } else {
          this.dtOptions.update = false;
      }
      this.matrixSource.loadSamples( this.dtOptions ).then(() => this.cd.markForCheck() );
  }

  refreshCD( ev?: any ) {
      this.zone.run(() => { this.cd.markForCheck() } );
  }

  snackMessage( title, message, opts ) {
      if ( !opts.duration ) {
          opts.duration = 2000;
      }
      this.zone.run(() => {
          this.snack.open( message, title, opts );
      } )
  }
  
  reduce(row : Matrix){
      this.dialog.open(ReduceComponent, {data : row}).afterClosed().subscribe(()=>{
      }, (err)=>{
          console.log(err);
      }, ()=>{
          this.refreshTable(undefined, true);
      });
  }
  
  aggregate(row :Matrix){
      this.dialog.open(AggregateComponent, {data :  row}).afterClosed().subscribe(()=>{
      }, (err)=>{
          console.log(err);
      }, ()=>{
          this.refreshTable(undefined, true);
      });
  }
  
  delete(row : Matrix){
      if ( this.confirm_delete == row.uid){
          this.sampleService.deleteMatrix(row.uid).then((res)=>{
              this.snackMessage("SUCCESS", res.message, {});
              this.refreshTable("search", true)
              this.confirm_delete=undefined;
          }).catch((err)=>{
              this.snackMessage("ERROR", err.message, {});
          });
      } else {
          this.confirm_delete=row.uid;
          this.snackMessage("WARNING", "You are going to delete this matrix and all the associated experiments. If you are sure, click delete again.", {});
      }
      
  }
  infoAggregated(row : Matrix){
      let  data=new InfoData("Aggregated matrix informations");
      if (row.aggregated){
          let aggr=row.aggregated;
          if ( aggr.message){
              data.information_list.push(new InfoListElement(aggr.message));
          } else {
              let diff=Math.abs(aggr.end_time-aggr.starting_time), hours, min, sec;
              hours = Math.floor(diff/3600);
              diff-= hours*3600;
              min = Math.floor(diff/60);
              diff-= min*60;
              sec = Math.floor(diff);
              data.information_list.push(new InfoListElement("Running time" , undefined,   hours +":" + ("0"+min).slice(-1) + ":"+ ("0"+sec).slice(-2) ));
              let parameters = "<ul><li><strong>Accuracy threshold:</strong> "+ aggr.source_threshold +"</li>" +
                  "<li><strong>Global accuracy threshold</strong> " + aggr.global_threshold +"</li>" +
                  "<li><strong>Correlation threshold</strong> " + aggr.correlation_thr +"</li>" +
                  "<li><strong>Shift</strong> " + aggr.shift + "</li>" +
                  "<li><strong>Mapping</strong> " + aggr.mapping + "</li>" +
                  "</ul>";
              data.information_list.push(new InfoListElement("Parameters", undefined , parameters));
              let filt = "<ul><li><strong class='info-title' title='K-mers from the reduced matrix with an accuracy higher than "+aggr.global_threshold+"'>K-mers considered : </strong> "+aggr.kmers_total +"</li>"+
                  "<li><strong class='info-title' title='K-mers with an accuracy higher than "+ aggr.source_threshold + " or being part of a graph having a k-mer that pass the threshold.' >K-mers used in the graphs: </strong>"+ aggr.kmers_used + " ("+  ((aggr.kmers_used *100) /aggr.kmers_total ).toFixed(2)+ " %)</li>"+
                  "<li><strong>Number of graphs:</strong> "+ aggr.n_of_graphs + "</li>"+
                  "<li><strong>Number of graph's paths:</strong> "+ aggr.n_of_sequences + "</li>"+
                  "<li><strong>Final k-mers:</strong> "+ aggr.final_kmers+ " (" +((aggr.final_kmers *100) /aggr.kmers_total ).toFixed(4)+ " %) </li>"+
                  "</ul>";
              data.information_list.push(new InfoListElement("Filter","Number of k-mers that passed the filter" , filt ));
              data.information_list.push(new InfoListElement("RAM", "memory RAM used", "After reading: "+ aggr.mem_after_reading +"<br/>After winner recover: "+aggr.mem_after_winner));
          }
      }
      this.zone.run(()=>{
          this.bottomSheet.open(InfoComponent, {data : data });
      });
  }
  infoReduced(row: Matrix){
      let  data=new InfoData("Reduced matrix informations");
      if (row.reduced){
          if (row.reduced.message){
              data.information_list.push(new InfoListElement(row.reduced.message))
          }else {
              data.information_list.push(new InfoListElement("Running time" , undefined, row.reduced.total_time));
              
              data.information_list.push(new InfoListElement("Filter efficiency","Number of k-mers that passed the filter" , row.reduced.kept+" out of "+row.reduced.processed+" : "+ ((row.reduced.kept *100) / row.reduced.processed ).toFixed(2) + "%"));
              data.information_list.push(new InfoListElement("Filter parameters", "list of parameters used",  "TODO"));
          }
      } 
      this.zone.run(()=>{
          this.bottomSheet.open(InfoComponent, {data : data });
      });
  }
  
  openBottomSheet(name:string){
	let data;
	if ( name == "reduced"){
		data=new InfoData("Reduced matrix");
		data.summary = "Matrix reduction allows to keep the k-mers that are able to classify your samples in the correct classes.";
	} else if (name == "aggregated"){
		data=new InfoData("Aggregated matrix");
		data.summary= "Aggregating overlapping k-mers allows to reduce the redundancy of your features. If an annotation and mapping settings are given, also groups of k-mers that map on the same annotated event will collapse in a single feature.";
	}
	this.zone.run(()=>{
          this.bottomSheet.open(InfoComponent, {data : data });
    });
  }

}
