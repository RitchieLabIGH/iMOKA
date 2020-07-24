import { Component, OnInit, NgZone, Inject ,OnDestroy} from '@angular/core';
import { Session } from '../../../../interfaces/session';
import {UemService} from '../../../../services/uem.service';
import {QueueService} from '../../../../services/queue.service';
import {SamplesService} from '../../../../services/samples.service';
import { MAT_DIALOG_DATA } from '@angular/material';
import {Subscription} from 'rxjs';
import {Sample, Matrix} from '../../../../interfaces/samples';

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
	selector: 'app-graphs',
	templateUrl: './graphs.component.html',
	styleUrls: ['./graphs.component.css']
})

export class GraphsComponent implements OnInit , OnDestroy {
	plots : any[] = [
		{ data : [{ values: [], labels: [], type: 'pie' }] , layout : {title : "k lengths", legend: {"orientation": "h" }}},
		{ data : [{ x: [], y: [], type: 'bar' }] , layout : {title : "Number of different k-mers",   barmode: 'group' } },
		{ data : [{ x: [], y: [], type: 'bar' }] , layout : {title : "Total number of k-mers",   barmode: 'group' } },
		];
	
	constructor(@Inject(MAT_DIALOG_DATA) public samples: Sample[],private zone: NgZone) {
		this.updateGraphs();
	}
	
	updateGraphs(){
		let metadata = {}, kvals={};
		this.resetGraphs();
		this.samples.sort((sama, samb)=>{
			return sama.total_count < samb.total_count ? -1 : 1;
		})
		this.samples.forEach((sam)=>{
				if ( ! kvals[""+sam.k_len])kvals[""+sam.k_len]=0;
				kvals[""+sam.k_len]+=1;
				sam.metadata.forEach((met)=>{
					if ( ! metadata[met.key] ) metadata[met.key]={};
					if ( ! metadata[met.key][met.value] ) metadata[met.key][met.value]=0;
					metadata[met.key][met.value]+=1; 
				})
				this.plots[1].data[0].x.push(sam.name);
				this.plots[2].data[0].x.push(sam.name);
				this.plots[1].data[0].y.push(sam.total_suffix);
				this.plots[2].data[0].y.push(sam.total_count);
		});
		Object.keys(kvals).forEach((key)=>{
			this.plots[0].data[0].labels.push(key)
			this.plots[0].data[0].values.push(kvals[key])
		})
		Object.keys(metadata).forEach((met)=>{
			let new_plot= { data : [{ values: [], labels: [], type: 'pie' }] , layout : {title : met}};
			let counter=0;
			Object.keys(metadata[met]).forEach((smet)=>{
				new_plot.data[0].labels.push(smet);
				new_plot.data[0].values.push(metadata[met][smet]);
				counter+=metadata[met][smet];
			});
			if ( counter < this.samples.length){
				new_plot.data[0].labels.push("None");
				new_plot.data[0].values.push(this.samples.length -counter );
			}
			this.plots.push(new_plot);
		});
		
		
	}
	resetGraphs(){
		this.plots = [this.plots[0],this.plots[1], this.plots[2]]
		this.plots[0].data=[{ values: [], labels: [], type: 'pie' }];
		this.plots[1].data= [{ x: [], y: [], type: 'bar'}];
		this.plots[2].data= [{ x: [], y: [], type: 'bar'}];
	}
	
	ngOnInit(){
		
	}
	ngOnDestroy(){
	}
	
	
}