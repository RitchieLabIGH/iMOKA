import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
	selector: 'app-kmer-info',
	templateUrl: './kmer-info.component.html',
	styleUrls: ['./kmer-info.component.css']
})
export class KmerInfoComponent implements OnInit, OnDestroy {
	data: any = {}
	info: any;
	kmer: any;
	logged : boolean = true;
	constructor(@Inject(MAT_DIALOG_DATA) public inData: any) {
		this.kmer = inData.kmer;
		this.info = inData.info;
	}

	ngOnInit() {
		this.data.boxplot = this.generateBoxplotData();
	}
	ngOnDestroy() {

	}
	
	changeLogged(){
		this.logged = ! this.logged;
		this.data.boxplot= this.generateBoxplotData();
	}
	getLogged(value: number, norm_factor : number){
		if ( this.logged){
			return (Math.log2((value/ norm_factor)+1)).toFixed(2)
		} else {
			return (value/ norm_factor).toFixed(2)
		}
	}
	generateBoxplotData() {
		let out = { data: [], layout: { title: (this.logged ? "Log2 " : "" )+"Normalized count for kmer " + this.kmer.kmer } },
			counts = this.kmer.counts,
			groups = this.info.groups_names,
			sample_group = this.info.groups,
			count_normalization = this.info.count_normalization, norm_count = [];
		if (counts) {
			if ( this.logged ){
				counts.forEach((x, i) => { norm_count.push(Math.log2( (x / count_normalization[i])+1 )) });	
			} else {
				counts.forEach((x, i) => { norm_count.push( (x / count_normalization[i])) });
			}
			
			for (let grp = 0; grp < groups.length; grp++) {
				let dat = { showlegend: false, name: groups[grp], y: [], type: 'box' };
				for (let i = 0; i < norm_count.length; i++) {
					if (sample_group[i] == grp) {
						dat.y.push(norm_count[i]);
					}
				}
				out.data.push(dat);
			}
		}
		return out;
	}
}
