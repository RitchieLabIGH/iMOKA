import { Component, Input, OnInit} from '@angular/core';

@Component({
	selector: 'app-file-importance',
	templateUrl: './file-importance.component.html',
	styleUrls: ['./file-importance.component.css']
})
export class FileImportanceComponent implements OnInit {
	@Input() data: any;
	@Input() session: any;
	@Input() importances: any;
	info: any;
	revision : number=1;
	gstyle = { width: '100%', height: '500px' };

	constructor() { }
	
	ngOnInit() {
		this.data.samples_eval = [];
		this.info = this.session.files.importance.info;
		this.info.groups_names.forEach((group, gidx) => {
			let graph = { index: gidx, samples: [], name: group, data: [], display_data: [], toshow: ["all"], layout: { autosize: true, barmode: 'stack', title: group + ' samples evaluation' }, from_pos: 0, to_display: 20 }
			this.info.groups_names.forEach((grp) => {
				graph.data.push({ name: grp, type: 'bar', x: [], y: [] });
			})
			let samples = []
			for (let i = 0; i < this.info.sample_names.length; i++) {
				if (this.info.sample_groups[i] == gidx) {
					samples.push({ name: this.info.sample_names[i], idx: i, own_val: this.importances[i][gidx] })
				}
			}
			samples.sort((a, b) => {
				return a.own_val - b.own_val;
			});
			samples.forEach((s) => {
				graph.data.forEach((grp, j) => {
					grp.x.push(this.info.sample_names[s.idx]);
					grp.y.push(this.importances[s.idx][j]);
				});
			});
			graph.to_display = samples.length < 20 ? samples.length  : 20; 
			graph.samples = samples.sort((a, b) => { return a.name < b.name ? -1 : 1; });
			this.data.samples_eval.push(graph)
		});
		this.updateFI();
		this.updateSample();
		this.revision=this.revision+1;
		setInterval(()=>{
			this.updateFI();
			this.updateSample();
			this.revision=this.revision+1;
		}, 2000)
		
	}
	updateFI() {
		let fi = this.data.feature_importance;
		fi.display_data = [];
		if (fi.to_display < 100) {
			for (let i = fi.from_pos; i <= fi.from_pos + fi.to_display; i++) {
				if (i < fi.data_boxplot.length ){
					fi.display_data.push(fi.data_boxplot[i]);	
				}
			}
		} else {
			fi.display_data.push({ showlegend: false, x: [], y: [], type: "scatter" });
			for (let i = fi.from_pos; i <= fi.from_pos + fi.to_display; i++) {
				if (i < fi.data_barplot[0].x.length ){
					fi.display_data[0].x.push(fi.data_barplot[0].x[i]);
					fi.display_data[0].y.push(fi.data_barplot[0].y[i]);
				}
			}
		}
		this.data.feature_importance=fi;
	}

	updateSample(sample?: string) {
		this.data.samples_eval.forEach(graph => {
			if (typeof sample == 'undefined' || graph.name == sample) {
				let x = graph.data[0].x;
				if (graph.toshow[0] == 'all') {
					graph.toshow = ['all'];
				} else {
					x = graph.toshow;
				}
				this.info.groupcount[graph.index] = x.length;
				graph.display_data = []
				graph.data.forEach((grp, j) => {
					let dat = { name: grp.name, type: grp.type, x: [], y: [] }, vidx = 0;
					grp.x.forEach((n: string, idx: number) => {
						if (x.includes(n)) {
							if (vidx >= graph.from_pos && vidx < graph.from_pos + graph.to_display) {
								dat.x.push(n)
								dat.y.push(grp.y[idx]);
							}
							vidx++;
						}
					})
					graph.display_data.push(dat);
				});

			}
		});
	}
}
