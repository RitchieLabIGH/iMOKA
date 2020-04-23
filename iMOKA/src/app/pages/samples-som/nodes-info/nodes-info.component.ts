import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
	selector: 'app-nodes-info',
	templateUrl: './nodes-info.component.html',
	styleUrls: ['./nodes-info.component.css']
})
export class NodesInfoComponent implements OnInit, OnDestroy {
	data: any = {}
	info: any;
	counts:any;
	KmersIndex: any;
	constructor(@Inject(MAT_DIALOG_DATA) public inData: any) {
		console.log(inData);
		this.counts = inData.data;
		this.info = inData.info;
		this.KmersIndex = inData.KmersIndex;
	}

	ngOnInit() {

		this.data.boxplot = this.generateBoxplotData();
		console.log(this.data.boxplot);
	}
	ngOnDestroy() {

	}
	generateBoxplotData() {
		let out = { data: [], layout: { title: "Normalized count for nodes selected "+this.info.nodes.join(",")+" : "+this.info.kmersindex.length+"kmers selected" } },
			counts = this.data,

			sample_group = this.info.groups,
			sample_names = this.info.samples_names,
			/*          count_normalization=this.info.count_normalization, norm_count=[];
				  counts.forEach((x, i)=>{norm_count.push(x/count_normalization[i])});
				  let max_val = Math.max(...norm_count);*/

			groups = this.info.groups_names;
		for (let grp = 0; grp < groups.length; grp++) {
			let dat = { showlegend: false, name: groups[grp], y: [], type: 'box' };

			for (let i = 0; i < this.counts.length; i++) {
				if (sample_group[i] == grp) {
					dat.y.push(this.counts[i]);
				}
			}
			out.data.push(dat);
		}
		return out;
	}
}
