import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';

import { TracksService } from '../../../services/tracks.service';
import { SamplesService } from '../../../services/samples.service';

import { SampleTableSource } from '../../../data/sample-table.source';

import { Session } from '../../../interfaces/session';
import { Matrix, Sample} from '../../../interfaces/samples';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { DialogNewComponent } from './dialog-new/dialog-new.component';
import {SampleComponent} from './sample/sample.component';
import {GraphsComponent} from './graphs/graphs.component';

@Component( {
    selector: 'app-samples-list',
    templateUrl: './samples-list.component.html',
    styleUrls: ['./samples-list.component.css']
} )
export class SamplesListComponent implements OnInit {

    session: Session;
    dataSource: SampleTableSource;
    bulk_mod: any;
    bulk_mod_samples : string[];
    matrixTag : string;
    matrixName : string="New matrix";
    possibleTags : any;
    dtOptions: any = {
        displayedColumns: ["cbs", "name", "tags", "k_len", "edit", "info"],
        search: { value: "" },
        order: { name: 'name', asc: true },
        metadataKeyFilter: [],
        metadataKeyValFilter: {},
		k_length : [],
        minCount: 0,
        pageSize: 10,
        pageIndex: 0,
        draw: 0,
        recordsTotal: 0,
        recordsFiltered: 0,
        stats: {},
    };

    checked = {};
    edit = {};

    constructor( private sampleService : SamplesService,  
            private zone: NgZone, public dialog: MatDialog, private snack: MatSnackBar 
      , private cd: ChangeDetectorRef ) { }

    ngOnInit() {
        this.dataSource = new SampleTableSource(this.sampleService);
        this.refreshTable( undefined, true );
    }
    getSelectedNumber() {
        let tot = 0;
        Object.keys( this.checked ).forEach( k => { if ( this.checked[k] ) tot += 1; } )
        return tot;
    }
    newSample() {
        this.dialog.open( DialogNewComponent, {} );
    }
    cancelEdit( row: Sample ) {
        this.edit[row.name] = undefined;
    }
    editSample( row: Sample ) {
        this.edit[row.name] = JSON.parse( JSON.stringify( row ) );
    }
    
    saveSample( row: { name: string | number; } ) {
        this.sampleService.saveSample( [this.edit[row.name]] ).then(( mess ) => {
            this.snackMessage({ title: "SUCCES", message: mess, opts: {} });
            this.edit[row.name] = undefined;
            this.refreshTable( undefined, true );
        } ).catch(( err ) => {
            this.snackMessage({ title: "ERROR!", message: err, opts: {} });
        } );
    }
	infoSample(sample :Sample){
		this.dialog.open(SampleComponent, {data : sample});
	}
	graphSel(){
		let rows=[]
		Object.keys( this.checked ).forEach(( sname ) => {
            if ( this.checked[sname] ) {
                let row = this.dataSource.samples.find(( sam ) => { return sam.name == sname } );
				if ( row ) rows.push(row);
			}});
		this.dialog.open(GraphsComponent, {data: rows});
		
	}
	
    newBulkMod(){
        if ( this.bulk_mod){
            this.bulk_mod.push( { new_key: "", new_value: "", keep: true, samples: this.bulk_mod_samples });
        }
    }
    
    saveBulk(){
        this.bulk_mod.forEach((mod: { samples: any[]; new_key: any; new_value: any; original_key: any; keep: any; })=>{
            mod.samples.forEach(sname=>{
                let sam = this.edit[sname], new_met = {key : mod.new_key, value : mod.new_value };
                if ( mod.original_key){
                    let m_n = sam.metadata.findIndex((met: { key: any; })=>{
                        return met.key == mod.original_key;
                    });
                    if ( mod.keep){
                        sam.metadata[m_n] = new_met;
                    } else {
                        sam.metadata.splice(m_n, 1);
                    }
                } else {
                    if (mod.keep){
                        sam.metadata.push(new_met)
                    }
                }
            })
        });
        let tomod = [];
        this.bulk_mod_samples.forEach((sname)=>{
            tomod.push(this.edit[sname]);
        });
        this.sampleService.saveSample( tomod ).then(( mess ) => {
            this.snackMessage({ title: "SUCCES", message: mess, opts: {} });
            this.edit = {};
            this.cancelBulk();
            this.refreshTable( undefined, true );
        } ).catch(( err ) => {
            this.snackMessage({ title: "ERROR!", message: err, opts: {} });
        } );
        
    }
    
    cancelBulk(){
        this.bulk_mod=undefined;
        this.bulk_mod_samples=undefined;
        this.edit={};
    }

	
    
    modSelMetadata() {
        this.bulk_mod = [];
        this.bulk_mod_samples = [];
        Object.keys( this.checked ).forEach(( sname ) => {
            if ( this.checked[sname] ) {
                this.bulk_mod_samples.push(sname);
                let row = this.dataSource.samples.find(( sam ) => { return sam.name == sname } );
                this.editSample( row );
                row.metadata.forEach( met => {
                    let m = this.bulk_mod.findIndex(( mb: { original_key: string; original_value: string; } ) => { return mb.original_key == met.key && mb.original_value == met.value } );
                    if ( m == -1 ) {
                        this.bulk_mod.push( { original_key: met.key, original_value: met.value, new_key: met.key, new_value: met.value, keep: true, samples: [sname] } )
                    } else {
                        this.bulk_mod[m].samples.push( sname );
                    }
                } );
            }
        } );

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
        this.dataSource.loadSamples( this.dtOptions ).then(() => this.cd.markForCheck() );
    }

    refreshCD() {
        this.zone.run(() => { this.cd.markForCheck() } );
    }

    snackMessage({ title, message, opts }: { title?: any; message?:any; opts?:any; }) {
		if (! opts){
			opts={duration : 2000};
		}
        if ( !opts.duration ) {
            opts.duration = 2000;
        }
		
        this.zone.run(() => {
            this.snack.open( title, message, opts );
        } )
    }
    
    isAllSelected() :boolean{
        if (this.dataSource.samples ){
            return this.getSelectedNumber() == this.dataSource.samples.length;
        } else {
            return false;
        }
        
    }
    
    masterToggle() {
        if ( this.isAllSelected() ){
            this.checked= {};
        } else {
            this.dataSource.samples.forEach((sam)=>{this.checked[sam.name]=true;});
        }
        this.updatePossibleTags();
    }
    updatePossibleTags() {
        this.possibleTags= JSON.parse(JSON.stringify(this.dtOptions.stats.metadata.filter((met: { values: string | any[]; }) =>{
            return met.values.length > 0;
        })));
        if ( this.possibleTags.length == 0 ){
            this.possibleTags= undefined;
            return;
        }
        this.possibleTags= this.possibleTags.filter((met: { values: any[]; key: string; title: string; })=>{
            met.values.forEach((val)=>{
                val.count=0;
            });
            this.dataSource.samples.forEach((sam)=>{
                if (this.checked[sam.name]){
                    let s_met = sam.metadata.find((m)=>{return m.key == met.key;});
                    if ( s_met ){
                        met.values.forEach((val)=>{
                            if ( val.value == s_met.value ) val.count=val.count+1;
                        });
                    }
                }
             });
            let non_zero=0, title = "";
            met.values.forEach((val)=>{
                if ( val.count > 0 ) {
                    title+=" - "+val.value +" (" + val.count +")\n";
                    non_zero=non_zero+1;
                }
            });
            met.title= met.key + " with values: \n" + title;
            return non_zero > 0; 
        });
        if ( this.possibleTags.length == 0 ){
            this.possibleTags=undefined;
        } 
    }

	getMatrixFeedback() : string[]{
		if ( ! this.dataSource || ! this.dataSource.samples){
			return ["", ""]
		}
		let  k_len, sam, s_met;
		for ( let i=0; i<this.dataSource.samples.length; i++ ){
			sam=this.dataSource.samples[i]
			if (this.checked[sam.name]){
				if ( ! k_len){
                   k_len = sam.k_len;
               } else if ( k_len != sam.k_len) {
                   return ["warn", "The size of the k-mer is not the same for all the selected samples"]
               }
				let s_met =sam.metadata.find((met)=>{return met.key == this.matrixTag});
				if (! s_met){
					return ["warn", "Sample "+sam.name+" doesn't contain the tag "+this.matrixTag]
				}
			}
		}
		return ["primary", "Create a matrix with the given tag"];
	}
    
    createMatrix(){
		let mf=this.getMatrixFeedback();
		if (mf[0]!= "primary"){
			this.snackMessage( { title: mf[1], message : "ERROR", opts:{} } ) ;
			return;
		}
        let matrix = new Matrix();
        let cmet=this.dtOptions.stats.metadata.find((met: { key: string; })=>{
           return met.key == this.matrixTag; 
        });
        let messages = [];
        cmet.values.sort((va: { value: number; }, vb: { value: number; })=> {return va.value < vb.value;});
        cmet.values.forEach((v: { value: string; }, i: number)=>{
            matrix.groups_names.push(v.value.replace(/\s/, "_"));
        });
        
        matrix.group_tag_key = this.matrixTag;
        this.dataSource.samples.forEach((sam)=>{
           if (this.checked[sam.name]){
               if ( matrix.k_len == undefined){
                   matrix.k_len = sam.k_len;
               } else if ( matrix.k_len != sam.k_len) {
                   messages.push("Sample " + sam.name + " has k-mer of " + sam.k_len);
               }
               let s_met =sam.metadata.find((met)=>{return met.key == this.matrixTag});
               if ( s_met ){
                   matrix.count_files.push(sam.count_file);
                   matrix.groups.push(s_met.value.replace(/\s/, "_"));
                   matrix.total_counts.push(sam.total_count);
                   matrix.names.push(sam.name);
               } else {
                   messages.push("Error! Sample "+  sam.name + " doesn't contain the tag "+this.matrixTag);
               }
           }
        });
        if ( messages.length > 0 ){
			this.snackMessage( { title: messages.join("\n"), message : "ERROR", opts:{} } ) ;
        } else {
            matrix.rescale_factor = 1e9;
            matrix.name = this.matrixName; 
            this.sampleService.setMatrix(matrix).then(()=>{
                this.snackMessage({ title: "Matrix " + matrix.name + " created successfully.", message: "SUCCESS", opts: {} });
            }).catch((err)=>{
                if (err.message ){
                    this.snackMessage( { title: err.message, message : "ERROR", opts:{} } ) ;
                } else if ( typeof err == "string" ){
					this.snackMessage( { title: err, message : "ERROR", opts:{} } )
                } else {
					this.snackMessage( { title: JSON.stringify(err), message : "ERROR", opts:{} } )
                }
                
            });
        }
        
    }
    
}
