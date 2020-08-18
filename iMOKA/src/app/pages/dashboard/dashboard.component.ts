import { Component, OnInit, NgZone, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { UemService } from '../../services/uem.service';
import { SamplesService } from '../../services/samples.service'
import { MatSnackBar } from '@angular/material/snack-bar';
import { Session } from '../../interfaces/session';
import { Matrix, Sample } from '../../interfaces/samples';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

class PlotlyGraph {
	data: any[];
	layout: any;
	constructor(data: any[], layout: any) {
		this.data = data;
		this.layout = layout;
	}
}

@Component({
	selector: 'app-dashboard',
	templateUrl: './dashboard.component.html',
	styleUrls: ['./dashboard.component.css']
})

export class DashboardComponent implements OnInit, OnDestroy {
	session: Session;
	subscriptions: Subscription[] = [];
	error: string;
	filters: any = {};
	plots: { [key: string]: PlotlyGraph } = {};
	samples: Sample[];
	samples_filter: boolean[];
	constructor(private uem: UemService, private zone: NgZone,
		private sb: MatSnackBar, public dialog: MatDialog, private sampleService: SamplesService,
	) { }


	ngOnInit() {
		this.subscriptions.push(this.sampleService.getSamples().subscribe((samples) => {
			samples.sort((samA, samB) => { return samA.total_count < samB.total_count ? -1 : 1; });
			this.samples = samples;
			this.samples_filter = new Array(samples.length).fill(true);
			this.updateSampleGraphs();
		}))
		this.subscriptions.push(this.uem.getSession().subscribe(session => {
			this.session = session;
			this.updateCurrentMatrix()
		}, err => {
			console.log(err);
		}));
		this.subscriptions.push()
	}
	selectFilter(event: any, fname: string) {
		let changed = false;
		if (this.filters[fname]) {
			this.filters[fname] = false;
			if (fname == 'kl') {
				this.samples_filter = new Array(this.samples.length).fill(true);
			}
			changed = true;
		} else {
			if (event.points[0].label) {
				this.filters[fname] = event.points[0].label
				changed = true;
				if (fname == 'kl') {
					this.samples_filter = new Array(this.samples.length).fill(true);
					this.samples.forEach((sam, idx) => {
						if (sam.k_len != this.filters[fname]) { this.samples_filter[idx] = false; }
					});
				}

			}
		}
		if (changed) {
			if (fname == "matrix") {
				this.updateCurrentMatrix()
			} else {
				this.updateSampleGraphs();
			}
		}

	}


	updateCurrentMatrix() {
		if (this.filters.matrix) {
			let mat = this.session.matrices.find((m) => { return m.name == this.filters.matrix; });
			let mats = {
				data: [{ values: [], labels: mat.groups_names, type: 'pie' }], layout: {
					title: "Matrix " + mat.name + (mat.group_tag_key ? " (" + mat.group_tag_key + ")" : ""),
					margin: { l: 0, r: 0, b: 0, t: 30 },
					height: 230,
					legend: { "orientation": "h" }
				}
			}
			mat.groups_names.forEach((n, i) => {
				let count = 0;
				mat.groups.forEach((g) => {
					if (g == n) count += 1;
				})
				mats.data[0].values.push(count)
			})
			this.zone.run(() => {
				this.plots.matrices = mats;
			})
		} else {
			let mats = {
				data: [{ values: [], labels: [], type: 'pie' }], layout: {
					title: "Samples per matrix in your Workspace",
					margin: { l: 0, r: 0, b: 0, t: 30 },
					height: 230,
					legend: { "orientation": "h" }
				}
			}
			this.session.matrices.forEach((mat) => {
				mats.data[0].values.push(mat.groups.length)
				mats.data[0].labels.push(mat.name)
			})
			this.zone.run(() => {
				this.plots.matrices = mats;
			});
		}


	}

	ngOnDestroy() {
		this.subscriptions.forEach((sub) => {
			sub.unsubscribe();
		})
	}

	sbMessage({ title, message, opts }: { title: any; message: any; opts: any; }) {
		this.zone.run(() => {
			this.sb.open(title, message, opts);
		})
	}

	updateKLengthGraph() {
		if (this.samples) {
			let graph = new PlotlyGraph([{ values: [], labels: [], type: 'pie' }], {
				title: "k dimensions",
				margin: { l: 0, r: 0, b: 0, t: 30 },
				height: 230,
				legend: { "orientation": "h" }
			});
			this.samples.forEach((sam, id) => {
				if (this.samples_filter[id]) {
					let idx = graph.data[0].labels.findIndex((id) => { return id == sam.k_len; });
					if (idx == -1) {
						graph.data[0].labels.push(sam.k_len);
						graph.data[0].values.push(1)
					} else {
						graph.data[0].values[idx] += 1
					}
				}
			});
			this.plots.k_lengths = graph;
		}
	}

	updateMetadataGraph() {
		if (this.samples) {
			if (this.filters.metadata) {
				let fname=this.filters.metadata;
				let graph = new PlotlyGraph([{ values: [], labels: [], type: 'pie' }], {
					title: "Metadata " + fname,
					margin: { l: 0, r: 0, b: 0, t: 30 },
					height: 230,
					legend: { "orientation": "h" }
				});
				let idx: number;
				this.samples.forEach((sam, id) => {
					if (this.samples_filter[id]) {
						sam.metadata.forEach(met => {
							if ( met.key == fname){
								idx = graph.data[0].labels.findIndex((name) => { return name == met.value; });
								if (idx == -1) {
									graph.data[0].labels.push(met.value);
									graph.data[0].values.push(1)
								} else {
									graph.data[0].values[idx] += 1
								}	
							}
						});
					}
				});
				this.plots.metadata = graph;
			} else {
				let graph = new PlotlyGraph([{ values: [], labels: [], type: 'pie' }], {
					title: "Metadata",
					margin: { l: 0, r: 0, b: 0, t: 30 },
					height: 230,
					legend: { "orientation": "h" }
				});
				let idx: number;
				this.samples.forEach((sam, id) => {
					if (this.samples_filter[id]) {
						sam.metadata.forEach(met => {
							idx = graph.data[0].labels.findIndex((name) => { return name == met.key; });
							if (idx == -1) {
								graph.data[0].labels.push(met.key);
								graph.data[0].values.push(1)
							} else {
								graph.data[0].values[idx] += 1
							}
						});
					}
				});
				this.plots.metadata = graph;
			}

		}
	}


	updateTotalCountGraph() {
		if (this.samples) {
			let graph = new PlotlyGraph([{ x: [], y: [],  type: 'bar' }], {
				title: "k-mer total counts",
				height: 230,
				showlegend: false,
				xaxis : { showticklabels: false },
				margin: { l: 0, r: 0, b: 30, t: 30 },
			});
			this.samples.forEach((sam, idx) => {
				if (this.samples_filter[idx]) {
					graph.data[0].x.push(sam.name);
					graph.data[0].y.push(sam.total_count)
				}
			});
			this.plots.total_counts = graph;
		}
	}
	updateSuffixCountGraph() {
		if (this.samples) {
			let graph = new PlotlyGraph([{ x: [], y: [], type: 'bar' }], {
				title: "Number of different k-mers",
				height: 230,
				showlegend: false,
				xaxis : { showticklabels: false },
				margin: { l: 0, r: 0, b: 30, t: 30 },
			});
			this.samples.forEach((sam, idx) => {
				if (this.samples_filter[idx]) {
					graph.data[0].x.push(sam.name);
					graph.data[0].y.push(sam.total_suffix)
				}
			});
			this.plots.suffix_counts = graph;
		}
	}

	updateSampleGraphs() {
		if (this.samples) {
			this.updateKLengthGraph();
			this.updateTotalCountGraph();
			this.updateSuffixCountGraph();
			this.updateMetadataGraph();
		}
	}

}
