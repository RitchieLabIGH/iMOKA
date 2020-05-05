import { Component, OnInit, ViewChild, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { TracksService, ExternalTrack } from '../../services/tracks.service';

import { KmerTableSource } from '../../data/kmer-table.source';

import { MatTable } from '@angular/material';

import { MatTabGroup } from '@angular/material/tabs';
import { UemService } from '../../services/uem.service';
import { FileService } from '../../services/file.service';
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

import igv from '../../plugins/igv/igv.js';
import * as $ from 'jquery';



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




	addExternalTrackFile(track: ExternalTrack) {
		console.log(track)
		this.zone.run(() => {
			this.browser.loadTrack({ url: track.path, name: track.name }).catch((error: any) => {
				if (error) {
					console.log(error);
				}
			});
		});
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
					igv.createBrowser(document.getElementById('igv-browser'), { genome: this.genome }).then((browser: any) => {
						this.browser = browser;
						this.trackService.getExternalTracks(this.genome).subscribe(extTracks => {
							this.externalTracks = extTracks;
						});
						this.loadKmerTracks();
					});
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



	loadKmerTracks() {
		this.browser.loadTrack({ type: "kmers", source: this.trackService, request_type: "sequences", name: "Sequences", visibilityWindow: -1, groups: this.groups, predictors: this.predictors, onClick: (el: { query_index: any; }) => { this.showInfo(el.query_index, "sequences"); } });
		this.browser.loadTrack({ type: "kmers", source: this.trackService, name: "Kmers", request_type: "kmers", visibilityWindow: -1, groups: this.groups, predictors: this.predictors, onClick: (el: { query_index: any; }) => { this.showInfo(el.query_index, "kmers"); } }, this.browser);
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
			console.log(this.session);
			console.log(this.info.kmers);
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
			this.browser.search(tosearch);
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
					console.log(resp)
				}
			}
		});
	}

	loadExternalTrack() {
		const dialogRef = this.dialog.open(OpenTrackComponent, { data: { tracks: this.externalTracks } })
		dialogRef.afterClosed().subscribe(track => track && this.addExternalTrackFile(track));
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
		let extract_file = function(args: any) {
			args.that.fileService.getNewFile({ title: "Create a new file" }).then((data_file: string | any[]) => {
				console.log("request succeeded")
				console.log(data_file);
				if (!data_file || data_file.length == 0) {
					args.that.toastMessage("No file selected", "Warning", 2);
					return;
				} else {
					args.that.fileService.saveKmerTable(data_file, args.ftype).then((resp: any) => {
						console.log(resp);
						args.that.toastMessage("File saved corectly", "Success", 0);
					});
				}
			});
		}
		data.information_list.push(new InfoListElement("Normalized k-mer matrix", "a text file containing the normalized k-mer counts", extract_file, { ftype: "matrix", that: this }));
		data.information_list.push(new InfoListElement("Raw k-mer matrix", "a text file containing the raw k-mer counts", extract_file, { ftype: "matrix_raw", that: this }));
		data.information_list.push(new InfoListElement("TSV file", "a text file containing the informations displayed in the k-mer table", extract_file, { ftype: "tsv", that: this }));
		this.zone.run(() => {
			this.bottomSheet.open(InfoComponent, { data: data });
		});
	}

	analyse() {
		let analyse_data = (args) => {
			switch (args.what) {
				case "rf":
					this.zone.run(() => {this.dialog.open(RandomForestComponent)});
					break
				case "som":
					this.zone.run(()=>{this.dialog.open(NewSomComponent)});
					break;
				default:
					this.toastMessage("Analysis " + args.what + " type not found.", "ERROR!")

			}
		}

		let data = new InfoData("Analysis");
		if (this.session.profile.process_config.profiles.length > 0 && this.session.files.kmers.original_request != this.session.files.kmers.file) {
			data.information_list.push(new InfoListElement("Random Forest", undefined, analyse_data, {what : "rf", description : "Create prediction models using RF with a subset of k-mers."}))
			data.information_list.push(new InfoListElement("SOM", undefined, analyse_data, {what : "som", description: "Aggregate the k-mers using a self organizing map and visualize the samples as aboundance maps"}))
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
