import { Component, OnInit,OnDestroy, Input, ViewChild } from '@angular/core';
import * as hexamap from '../../../plugins/hexamap/hexamap.js';



@Component({
	selector: 'hexamap-app',
	templateUrl : './hexamap.component.html',
	styleUrls: ['./hexamap.component.css']
	
})


export class HexamapComponent implements OnInit, OnDestroy {
	
	@Input('options') options: any;
	@ViewChild("hexamap", {static : true}) element: { nativeElement: any; };
	palettes : string[] = ["rgba(0,0,0,0.8)","#ED4343", "#3A54DA", "#9d9f02", "#56C06D", "#8D72D3"]
	
	ngOnDestroy(){
		
	}
	ngOnInit(){
		if (this.options){
			this.options.element = this.element.nativeElement;
			if (typeof this.options.group === 'number'){
				this.options.group_color=this.options.group+1;
			} else {
				this.options.group_color=0;
			}
			hexamap.createmap(this.options);
		}	
	}
}