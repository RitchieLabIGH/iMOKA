import { Component, OnInit, ViewChild, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { TracksService, ExternalTrack } from '../../services/tracks.service';

import { KmerTableSource } from '../../data/kmer-table.source';

import { MatTable } from '@angular/material';

import { MatTabGroup } from '@angular/material/tabs';
import { UemService } from '../../services/uem.service';
import { Session } from '../../interfaces/session';
import { KmerDataTableOptions } from '../../interfaces/kmer';


import { OpenTrackComponent } from './dialog/open-track/open-track.component'
import { MatDialog } from '@angular/material/dialog';
import { KmerInfoComponent } from './dialog/kmer-info/kmer-info.component';
import { SequenceInfoComponent } from './dialog/sequence-info/sequence-info.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PantherGoComponent } from '../panther-go/panther-go.component';
import { InfoComponent, InfoData, InfoListElement } from '../../core/info/info.component';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { Subscription } from 'rxjs';

import { RandomForestComponent } from './dialog/random-forest/random-forest.component';
import { NewSomComponent } from './dialog/som/new-som.component';

import Ideogram from '../../plugins/ideogram/dist/js/ideogram.min.js';
import { FileService } from '../../services/file.service'
import igv from '../../plugins/igv/igv.js';
import * as $ from 'jquery';
import { genomes } from '../../../assets/data/genomes';


@Component({
	selector: 'app-k-mer-list',
	templateUrl: './k-mer-list.component.html',
	styleUrls: ['./k-mer-list.component.css'],
})

export class KMerListComponent implements OnInit, OnDestroy {

	dataSource: KmerTableSource;
	@ViewChild(MatTable, { static: true }) table: MatTable<any>;
	@ViewChild(MatTabGroup, { static: true }) tab: MatTabGroup;
	constructor(private trackService: TracksService, public dialog: MatDialog,
		private _snackBar: MatSnackBar, private zone: NgZone,
		private cd: ChangeDetectorRef, private bottomSheet: MatBottomSheet
		, private uem: UemService, private fileService: FileService
	) {
	};

	browser: any;
	genome: string = 'hg38';
	info: any = {};
	dtOptions: KmerDataTableOptions = this.initDtOptions();
	data: any = {};
	cols: any = {};
	session: Session;
	hasKmer: boolean = false;
	groups: any;
	predictors: any;
	externalTracks: ExternalTrack[];
	browserSequenceTrack: any;
	browserKmerTrack: any;
	subscriptions: Subscription[] = [];

	ideo_visible: boolean = false;
	ideo_chromosomes: string[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "X", "Y"]
	ideogram_type: string[] = [];
	ideo_table_norm: string = "raw";
	ideogram_possible_types: { key: string, name: string }[] = [];
	ideogram_stats: { header: string[], data: number[][], row_names: string[], tot_rows: number[], tot_global: number, tot_columns: number[] };
	ideogram: Ideogram;
	ideo_config: any = {
		organism: 'human',
		container: '#ideo-container',
		annotations: { keys: ["name", "start", "length", "repetitive", "highest_expression"], annots: [] },
		dataDir: 'https://cdn.jsdelivr.net/npm/ideogram@1.21/dist/data/bands/native/',
		annotationsLayout: 'heatmap',
		chrHeight: 400,
		legend: [],
		heatmaps: [],
		rotatable: false,
		chromosomes: [],
	};
	addExternalTrack(track: ExternalTrack) {
		
		this.zone.run(() => {
			if ( track.format == "auto") track.format=undefined;
			if ( track.type == "auto") track.type=undefined;
			let toadd={ url: track.path, indexURL: track.index, name: track.name , format : track.format, type : track.type };
			this.browser.loadTrack(toadd).catch((error: any) => {
				if (error) {
					console.log(error);
				}
			});
		});
	}
	addExternalTrackFile(track_n: string) {
		if (!track_n) return;
		let track;
		if (track_n.includes("_")) {
			track = this.externalTracks[parseInt(track_n.split("_")[0])].annotations[parseInt(track_n.split("_")[1])];
		} else {
			track = this.externalTracks[parseInt(track_n.split("_")[0])];
		}
		if (track) this.addExternalTrack(track);

	};

	ngOnInit() {
		this.dataSource = new KmerTableSource(this.trackService);
		this.tab.selectedTabChange.subscribe((ev: { index: number; }) => {
			if (ev.index == 0) {

			} else if (ev.index == 1) {
				if (!this.browser) {
					$("body").on("mousewheel", "#igv-browser", (e) => {
						if (e.shiftKey == true) {
							let ev = $.extend({ deltaY: 0 }, e.originalEvent); // typescript workaround
							if (ev.deltaY > 0) {
								this.browser.zoomOut()
							} else {
								this.browser.zoomIn()
							}
						}
					});
					igv.createBrowser(document.getElementById('igv-browser'), { reference: genomes[this.genome] }).then((browser: any) => {
						this.browser = browser;
						this.trackService.getExternalTracks(this.genome).subscribe(extTracks => {
							this.externalTracks = extTracks;
						});
						this.loadKmerTracks();
					});
				}

			} else if (ev.index == 2) {
				if (!this.ideogram) {
					this.ideogram = true;
					this.refreshIdeogram();
				}
			}
		});
		this.subscriptions.push(this.uem.getSession().subscribe((session: Session) => {
			this.session = session;
			if (session.files["kmers"]) {
				this.loadDataInfo("kmers", session.files["kmers"].info);
				let other_types = ["som", "importance"];
				other_types.forEach(data_type => {
					if (session.files[data_type]) {
						this.loadDataInfo(data_type, session.files[data_type].info);
					}
				});
				this.refreshTable();
			}
		}));
	};

	ngOnDestroy() {
		$("body").off("mousewheel", "#igv-browser", false);
		this.subscriptions.forEach((sub) => {
			sub.unsubscribe();
		});
	}

	getFileName(max_len: number = -1) {
		if (this.session) {
			let fname = this.session.files.kmers.file;
			if (max_len > 0 && fname.length > max_len) {
				fname = "..." + fname.substr(-max_len)
			}
			if (this.session.files.kmers.original_request) {
				let mat = this.session.matrices.find((mt) => { return mt.uid == this.session.files.kmers.original_request })
				if (mat) {
					return " matrix " + mat.name
				} else {
					return " file " + fname;
				}
			} else {
				return " file " + fname;
			}
		} else {
			return "";
		}
	}

	loadKmerTracks() {
		this.browser.loadTrack({ type: "imoka", source: this.trackService, request_type: "sequences", name: "Sequences", visibilityWindow: 1000000, onClick: (el: { query_index: any; }) => { this.showInfo(el.query_index, "sequences"); } });
		this.browser.loadTrack({ type: "imoka", source: this.trackService, name: "Kmers", request_type: "kmers", visibilityWindow: 1000000,  onClick: (el: { query_index: any; }) => { this.showInfo(el.query_index, "kmers"); } });
	}

	refreshTable(event?: any) {
		if (event) {
			if (event.pageSize) {
				this.dtOptions.pageSize = event.pageSize;
				this.dtOptions.pageIndex = event.pageIndex;
			}
			if (event.active) {
				this.dtOptions.order.name = event.active;
				this.dtOptions.order.asc = event.direction == "asc";
			}
			if (event == "search") {
				this.dtOptions.pageIndex = 0;
			}
		}
		this.dataSource.loadKmer(this.dtOptions).then(() => this.cd.markForCheck());
	}

	refreshIdeogram() {
		if (this.ideogram_possible_types.length == 0) {
			this.ideogram_possible_types = [{ key: "unique", name: "Unique k-mers" },
			{ key: "repetitive", name: "Repetitive k-mers" }];
			this.ideo_config.legend = [
				{ name: 'Repetitive k-mer', rows: [{ color: '#F00', name: 'Unique' }, { color: '#00F', name: 'Repetitive' }] },
				{ name: 'Highest expression', rows: [] }
			]

			this.ideo_config.heatmaps = [
				{ key: 'repetitive', thresholds: [['0', '#F00'], ['1', '#00F']] },
				{ key: 'highest_expression', thresholds: [] }];

			this.ideo_config.annotationTracks = [
				{ id: 'repetitive', displayName: 'Repetitive level' },
				{ id: 'highest_expression', displayName: 'Expression track' },]
			let colors = ['#F0F', '#0F0', '#F00', '#00F', '#0FF'];

			this.info.kmers.groups_names.forEach((gn, idx) => {
				this.ideo_config.legend[1].rows.push({ color: colors[idx], name: "Class " + gn })
				this.ideogram_possible_types.push({ name: "Class " + gn, key: idx + "" })
				this.ideo_config.heatmaps[1].thresholds.push([idx + '', colors[idx]])
			});
		}

		this.trackService.getIdeogram({
			filter: this.ideogram_type,
			table_filtered: this.ideo_visible,
			chromosomes: this.ideo_config.chromosomes
		}).then((ideo) => {
			let config = JSON.parse(JSON.stringify(this.ideo_config))
			if (config.chromosomes.length == 0) {
				config.chromosomes = JSON.parse(JSON.stringify(this.ideo_chromosomes));
			}
			config.annotations = ideo.data;
			if (ideo.data.annots.length > 0) {
				config.onDrawAnnots = () => {
					let correct_size = () => {
						$("#_ideogramInnerWrap").css("overflow-x", "auto");
						$("#_ideogramMiddleWrap").css("height", (parseInt($("svg#_ideogram").attr("height")) + 80) + "px");
					}
					setTimeout(correct_size, 100);
				}
			}
			this.ideogram = new Ideogram(config);
			this.ideoStats(config);
		}).catch((err) => {
			console.log(err);
		})
	}

	ideoStats(config: any) {
		this.ideogram_stats = { header: ["Unique", "Repetitive"], row_names: [], data: [], tot_rows: [], tot_columns: [], tot_global: 0 };
		let base_row = [0, 0]
		this.info.kmers.groups_names.forEach((gn, idx) => {
			base_row.push(0)
			this.ideogram_stats.header.push("Class " + gn)
		});
		config.chromosomes.forEach((chr) => {
			let ann = config.annotations.annots.find((el) => { return el.chr == chr })
			if (ann) {
				this.ideogram_stats.row_names.push("chr" + chr);
				let counts = [...base_row];
				ann.annots.forEach((el) => {
					counts[el[3]] += 1;
					counts[2 + el[4]] += 1;
				})
				this.ideogram_stats.data.push(counts);
				this.ideogram_stats.tot_rows.push(ann.annots.length);
				this.ideogram_stats.tot_global += ann.annots.length;
			}
		})
		if (this.ideogram_stats.data.length > 0) {
			this.ideogram_stats.data[0].forEach((el, col) => {
				let col_tot = 0;
				this.ideogram_stats.data.forEach((arr) => {
					col_tot += arr[col];
				})
				this.ideogram_stats.tot_columns.push(col_tot);
			})
		}
	}

	ideoCount(count: number, row: number, column: number) {
		switch (this.ideo_table_norm) {
			case "raw":
				return count;
			case "col":
				return (count / this.ideogram_stats.tot_columns[column]) * 100;
			case "chr":
				return (count / this.ideogram_stats.tot_rows[row]) * 100;
			case "global":
				return (count / this.ideogram_stats.tot_global) * 100;
		}
		return count;
	}

	initDtOptions(): KmerDataTableOptions {
		return {
			displayedColumns: ['best_rank', 'kmer', 'position', 'genes', 'events'],
			search: { value: "" },
			order: { name: 'best_rank', asc: true },
			subset: [],
			bmu: [],
			eventsFilter: [],
			minCount: 0,
			minPred: 0,
			minFC: 0,
			minPval: 1,
			maxMap: -1,
			pageSize: 10,
			pageIndex: 0,
			draw: 0,
			recordsTotal: 0,
			recordsFiltered: 0,
			stats: { genes: [], events: [] }
		};
	}

	loadDataInfo(file_type: string, info: { events: any[]; }) {
		this.info[file_type] = info;
		if (file_type == "kmers") {
			this.dtOptions = this.initDtOptions();
			info.events.forEach(ev => this.dtOptions.eventsFilter.push(ev.name));
		} else if (file_type == "som") {
			this.initSOM();
		} else if (file_type == "importance") {
			this.initImportance();
		}
		this.refreshTable();
	}


	initSOM(): Promise<any> {
		return new Promise<any>((resolve, reject) => {
			if (!this.dtOptions.displayedColumns.includes("som")) {
				this.dtOptions.displayedColumns.unshift("som");
			}
		});
	};

	initImportance() {
		this.subscriptions.push(this.trackService.getData("importance_models").subscribe((resp) => {
			this.data.models = [];
			resp.forEach((mod) => {
				this.data.models.push({ features: mod.features, acc: mod.models[mod.best_model].acc })
			});
			if (!this.dtOptions.displayedColumns.includes("importance")) {
				this.dtOptions.displayedColumns.unshift("importance");
			}
		}));
	};

	changeTab(index: number) {
		this.tab.selectedIndex = index;
		return new Promise((resolve) => {
			setTimeout(() => { resolve(); }, 1000);
		})
	}

	searchBrowser(request: any) {
		let tosearch = "";
		if (typeof request == typeof "string") {
			tosearch = request;
		} else if (request.chromosome) {
			tosearch = request.chromosome + ":" + request.start + "-" + request.end;
		}
		this.changeTab(1).then(() => {
			if ( this.browser ){
				this.browser.search(tosearch);	
			} else {
				setTimeout(()=>{
					this.searchBrowser(tosearch);
				}, 500);
			}
			
		})

	}


	showInfo(id: any, type: any) {
		var that = this;
		that.trackService.getDataByID({ id: id, type: type }).then((resp) => {
			if (resp.message != "SUCCESS") {
				that.toastMessage("ID " + type + "[" + id + "] " + resp.message, "Ouch! ");
			} else {
				if (type == "kmers") {
					/// Need to run in zone for problems with change detection
					this.zone.run(() => { this.dialog.open(KmerInfoComponent, { data: { kmer: resp.data, info: this.info.kmers } }) });
				} else {
					this.zone.run(() => { this.dialog.open(SequenceInfoComponent, { data: { sequence: resp.data, info: this.info.kmers } }) });
				}
			}
		});
	}

	loadExternalTrack() {
		const dialogRef = this.dialog.open(OpenTrackComponent, { data: { tracks: this.externalTracks } })
		dialogRef.afterClosed().subscribe(track => track && this.addExternalTrack(track));
	}

	showGeneOntology() {
		this.trackService.getGenes({ all: false }).then(response => {
			if (response.data && response.data.length > 0) {
				this.dialog.open(PantherGoComponent, { data: { geneList: response.data } });
			} else {
				this.toastMessage("Ops!", "There are no genes in the current list!")
			}
		});
	};


	extract() {
		let data = new InfoData("Extraction");
		let extract_file = (args: any) => {
			this.fileService.getNewFile({ title: "Create a new file" }).then((data_file: string) => {
				if (!data_file || data_file.length == 0) {
					this.toastMessage("No file selected", "Warning");
					return;
				} else {
					this.fileService.saveKmerTable(data_file, args.ftype).then((resp: any) => {
						this.toastMessage("File saved corectly", "Success");
					});
				}
			});
		}
		data.information_list.push(new InfoListElement("Normalized k-mer matrix", "a text file containing the normalized k-mer counts", extract_file, { ftype: "matrix" }));
		data.information_list.push(new InfoListElement("Raw k-mer matrix", "a text file containing the raw k-mer counts", extract_file, { ftype: "matrix_raw" }));
		data.information_list.push(new InfoListElement("TSV file", "a text file containing the informations displayed in the k-mer table", extract_file, { ftype: "tsv" }));
		this.zone.run(() => {
			this.bottomSheet.open(InfoComponent, { data: data });
		});
	}

	analyse() {
		let analyse_data = (args) => {
			switch (args.what) {
				case "rf":
					this.zone.run(() => { this.dialog.open(RandomForestComponent) });
					break
				case "som":
					this.zone.run(() => { this.dialog.open(NewSomComponent) });
					break;
				default:
					this.toastMessage("Analysis " + args.what + " type not found.", "ERROR!")

			}
		}

		let data = new InfoData("Analysis");
		if (this.session.profile.process_config.profiles.length > 0 && this.session.files.kmers.original_request != this.session.files.kmers.file) {
			data.information_list.push(new InfoListElement("Random Forest", undefined, analyse_data, { what: "rf", description: "Create prediction models using RF with a subset of k-mers." }))
			data.information_list.push(new InfoListElement("SOM", undefined, analyse_data, { what: "som", description: "Aggregate the k-mers using a self organizing map and visualize the samples as aboundance maps" }))
		} else {
			if (this.session.profile.process_config.profiles.length == 0) {
				data.information_list.push(new InfoListElement("You need to create a valid profile first."))
			} else {
				data.information_list.push(new InfoListElement("You need to import this k-mer list in the Experiments page."))
			}
		}
		this.zone.run(() => {
			this.bottomSheet.open(InfoComponent, { data: data });
		});
	}



	toastMessage(message: string, title: string) {
		this._snackBar.open(message, title, { duration: 2000 })
	}

	reduceRow(matrix: any, row: number) {
		return matrix[row].reduce((a: any, b: any) => a + b, 0);
	}

	reduceCol(matrix: any, col: number) {
		return matrix.reduce((a: any, b: any[]) => a + b[col], 0);
	}
}
