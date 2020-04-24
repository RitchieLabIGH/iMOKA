import { Component, OnInit,OnDestroy, Input, ViewChild } from '@angular/core';
import * as hexamap from '../../../plugins/hexamap/hexamap.js';



@Component({
	selector: 'hexamap-app',
	templateUrl : './hexamap.component.html',
	styleUrls: ['./hexamap.component.css']
	
})


export class HexamapComponent implements OnInit, OnDestroy {
	
	@Input('options') options: any;
	@Input('width') width: number;
	@Input('height') height: number;
	@ViewChild("hexamap", {static : true}) element: { nativeElement: any; };
	palettes : string[] = ["rgba(0,0,0,0.8)","#ED4343", "#3A54DA", "#9d9f02", "#56C06D", "#8D72D3"]
	
	ngOnDestroy(){
		
	}
	ngOnInit(){
		if (this.options){
			let opt = Object.assign({},  this.options);
			opt.element = this.element.nativeElement;
			if (typeof this.options.group === 'number'){
				opt.group_color=this.options.group+1;
			} else {
				opt.group_color=0;
			}
			if ( this.width){
				opt.width = this.width;
			} 
			if ( this.height){
				opt.height=this.height;
			}
			this.options = opt;
			hexamap.createmap(opt);
		}	
	}
}