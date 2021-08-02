import { Component, OnInit, NgZone, Inject ,OnDestroy} from '@angular/core';
import { Session } from '../../../interfaces/session';
import {UemService} from '../../../services/uem.service';
import {QueueService} from '../../../services/queue.service';
import {SamplesService} from '../../../services/samples.service';
import { MAT_DIALOG_DATA } from '@angular/material';
import {Subscription} from 'rxjs';
import {Sample, Matrix} from '../../../interfaces/samples';

interface Prediction {
	index : number, 
	matrix : {name :string, uid :string}, 
	models : Model[]
}

interface Model {
	name : string , 
	description : string , 
	prediction? : any
};

@Component({
	selector: 'app-sample',
	templateUrl: './sample.component.html',
	styleUrls: ['./sample.component.css']
})

export class SampleComponent implements OnInit , OnDestroy {
	subs  :Subscription[] = [];
	session : Session;
	mod :boolean=false;
	err_mess : string;
	predictions : Prediction[]=[];
	constructor(@Inject(MAT_DIALOG_DATA) public sam: Sample, 
		private queue: QueueService, private uem: UemService, private zone: NgZone,  private sampleService : SamplesService) {
			
	}
	ngOnInit(){
		this.subs.push(this.uem.getSession().subscribe((session)=>{
				this.session=session;
				this.predictions=[];
				this.session.matrices.forEach((mat : Matrix, idx)=>{
					if ( mat.models.length > 0 ){
						let pred : Prediction={index : idx, matrix : { name : mat.name, uid : mat.uid }, models : []};
						mat.models.forEach((model)=>{
							let mod : Model = {name : model.name, description : model.description};
							if (this.sam.predictions && this.sam.predictions.length > 0){
								let pr = this.sam.predictions.find((p)=>{
									return p.experiment == pred.matrix.uid && p.model == mod.name; 
								})
								if ( pr ){
									mod.prediction ={ data: [{ values: [], labels: pr.classnames, type: 'pie' }], layout: {
			 							title: "Prediction of " + this.sam.name + (mat.group_tag_key ? " ("+mat.group_tag_key+")" : ""), height: 350 ,
										legend: { x: 1, xanchor: 'right', y: 1 } } };
									let values :number[];
									pr.probabilities.forEach((p)=>{
										if ( values ){
											values=values.map((v, i)=>v+p[i]);
										} else {
											values=p;
										}
									})
									let tot=values.reduce((x, prev)=> x+prev, 0);
									mod.prediction.data[0].values=values.map((v)=>Math.round((v*100)/tot));
								}
							}
							pred.models.push(mod);
							 
						})
						this.predictions.push(pred);	
					}
					
					
				})
		}));
	}
	ngOnDestroy(){
		this.subs.forEach((sub)=>{
			sub.unsubscribe();
		})
	}
	saveSample(){
		this.err_mess=undefined;
		this.sampleService.saveSample( [this.sam] ).then(( mess ) => {
            this.mod=false;
        } ).catch(( err:any ) => {
			if (typeof err == "string"){
				this.err_mess = err;
			} else if (err.message){
				this.err_mess=err.message
			} else {
				this.err_mess=JSON.stringify(err);	
			}
        } );	
	}
	
	runPrediction(which:string){
		this.queue.sendJob({name : "predict", data : {model : which , sample : this.sam.name , process:{cores : 1 , mem : 4}}});
	}
	
}