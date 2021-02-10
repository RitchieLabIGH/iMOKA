import { Component, OnInit, NgZone, OnDestroy, ViewChild, HostListener, ElementRef } from '@angular/core';
import { TracksService } from '../../services/tracks.service';
import { UemService } from '../../services/uem.service';
import { MatDialog } from '@angular/material/dialog';
import { NodesInfoComponent } from './nodes-info/nodes-info.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabGroup } from '@angular/material';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { Subscription } from 'rxjs';
import { Session } from '../../interfaces/session'
import {MatSort} from '@angular/material/sort';
import { PantherGoComponent } from '../panther-go/panther-go.component';

export interface FeatureSOM {
	name: string,
	bmu: number
}


@Component({
	selector: 'samples-som',
	templateUrl: './samples-som.component.html',
	styleUrls: ['./samples-som.component.css']
})
export class SamplesSomComponent implements OnInit, OnDestroy {
	@ViewChild(MatTabGroup, { static: true }) tab: MatTabGroup;
	@ViewChild('mainPage', { static: true }) element: ElementRef;
	@ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
	@ViewChild(MatSort, {static: false}) sort: MatSort;
	isDtInitialized: boolean = false;

	@HostListener('window:resize', ['$event']) onResize(event?: any) {
		if (this.element) {
			this.win = { height: this.element.nativeElement.offsetHeight, width: this.element.nativeElement.offsetWidth };
			this.tiles = { height: this.win.width / 10, width: this.win.width / 9 };
		}
	}
	constructor(private trackService: TracksService, public dialog: MatDialog, private _snackBar: MatSnackBar, private zone: NgZone, private uem: UemService) {
	}
  	
	featureSource: MatTableDataSource<FeatureSOM> = new MatTableDataSource<FeatureSOM>([]);
	win: { height: number, width: number };
	tiles: { height: number, width: number };
	mapsize: number;
	somTabIndex: number;
	features_per_node: number[];
	subscriptions: Subscription[] = [];
	session: Session;
	data: any = {};
	geneList: any = {};
	clust: number = 0;
	normOption: any;
	clust_select: { id: number, nclust: number }[] = [];
	hexamappes: { indices: any[], importances: any[], averages: any[] } = { indices: [], importances: [], averages: [] }
	catergoryList: any = [];
	selectedNodes: number[] = [];
	clustFilterl: string[] = [];
	catFilterl: string[] = [];
	sampleFilterl: string[] = [];
	hideOptions: boolean = false;
	indices: any;

	tabChange(event: any) {
		if (this.somTabIndex == 2) {
			this.featureSource.paginator = this.paginator;
			this.featureSource.sort = this.sort;
			this.updateFeatures();
		}
	}
	updateFeatures() {
		this.featureSource.data = this.session && this.session.files.som ? this.session.files.som.info.features.filter((el) => {
			return this.selectedNodes.length == 0 || this.selectedNodes.includes(el.bmu);
		}) : [];

	}
	applyFilter(event: Event) {
		const filterValue = (event.target as HTMLInputElement).value;
		this.featureSource.filter = filterValue.trim();
	}
	ngOnInit() {
		this.onResize();
		this.clust_select = [];
		this.normOption = "normByNode";
		this.subscriptions.push(this.uem.getSession().subscribe((session) => {
			this.session = session;
			if (this.session.files.som){
				this.updateFeatures();
				this.update();	
			}
			
		}));
	}


	update(event?: any) {
		this.normOptionUpdate();
		this.getSamplesClusterDistrib();
	}
	ngOnDestroy() {
		this.subscriptions.forEach((sub) => {
			sub.unsubscribe();
		});

	}

	barclustdistClick(data) {
		this.clustFilterl = [data.points[0].pointIndex];
		this.somTabIndex = 0;
		this.update();
	}


	getSOMnodeImportance(): Promise<any> {
		return new Promise<any>((resolve, reject) => {
			this.trackService.getData({ "data": "SOMimportance", "idmap": "importance" }).subscribe((resp) => {
				this.data.mapimportance = resp;
				this.features_per_node = this.data.mapimportance[1].projRAW;
				this.data.graphImportance = {
					data: [
						{ x: Array.from(Array(this.data.mapimportance[0].projSOM.length)).map((e, i) => i + 1), y: this.data.mapimportance[0].projSOM, type: 'bar' },

					],
					layout: {
						width: this.tiles.width * 4, height: this.tiles.height * 3, title: 'Features importance',
						xaxis: {
							autorange: true,
							showgrid: false,
							ticks: '',
							showticklabels: false
						}
					}
				}

				this.data.graphFeatureNumber = {
					data: [
						{ x: Array.from(Array(this.data.mapimportance[1].projSOM.length)).map((e, i) => i + 1), y: this.features_per_node, type: 'bar' },
					],
					layout: {
						width: this.tiles.width * 4, height: this.tiles.height * 3, title: 'Number of k-mers by node',
						xaxis: {
							autorange: true,
							showgrid: false,
							ticks: '',
							showticklabels: false
						}
					}
				}
				resolve();
			}, (err) => {
				console.log(err);
				this.toastMessage(err, "Loading error")
				reject(err);
			});

		});

	}

	hexaClick() {
		let that = this;
		return (d, i, ctrl) => {
			if (!ctrl) {
				if (that.selectedNodes.includes(i)) {
					that.selectedNodes = [];
				} else {
					that.selectedNodes = [i];
				}

			} else {
				if (!that.selectedNodes.includes(i)) {
					that.selectedNodes.push(i);
				} else {
					that.selectedNodes = that.selectedNodes.filter((n) => { return n != i; });
				}
			}
			that.updateFeatures();

			return that.selectedNodes;
		}


	}

	getSOMaveragebyClass(): Promise<any> {
		return new Promise((resolve, reject) => {
			this.trackService.getData({ "data": "SOMaverageclass", "norm": this.normOption }).subscribe((resp) => {
				this.data.mapaverage = resp;
				resolve();
			}, (err) => {
				this.toastMessage(err, "Loading error")
				reject();
			});
		});

	}
	getSOMclusters(): Promise<any> {
		return new Promise<any>((resolve, reject) => {
			this.trackService.getData({ "data": "SOMclusters", "norm": this.normOption }).subscribe((resp) => {
				this.data.samplesSOM = resp;
				this.mapsize = Math.sqrt(this.data.samplesSOM[0].projSOM.length)
				resolve();
			}, (err) => {
				this.toastMessage(err, "Loading error")
				reject();
			});

		});
	}


	getNodeKmerInfo(): Promise<any> {
		return new Promise<any>((resolve, reject) => {
			this.trackService.getData({ "data": "SOMkmers", "nodesIds": this.selectedNodes }).subscribe((resp) => {
				this.data.SOMkmers = resp;
				this.requestGO();
				resolve();
			}, (err) => {
				this.toastMessage(err, "Loading error")
				reject();
			});

		});

	}
	getNodeKmerInfoDistrib(): Promise<any> {
		return new Promise<any>((resolve, reject) => {
			this.trackService.getData({ "data": "SOMexpressionByNode", "nodesIds": this.selectedNodes }).subscribe((resp) => {
				this.zone.run(() => { this.dialog.open(NodesInfoComponent, { data: { data: resp.data, info: resp.info } }) });
				resolve();
			}, (err) => {
				this.toastMessage(err, "Loading error")
				reject();
			});

		});

	}
	getSamplesClusterDistrib(): Promise<any> {
		return new Promise<any>((resolve, reject) => {
			this.trackService.getData({ "data": "SOMsampleDistrib", "nclustid": this.clust }).subscribe((resp) => {
				console.log(resp)
				this.data.clusterdist = { data: resp, layout: { barmode: 'stack' } }
				resolve();
			}, (err) => {
				this.toastMessage(err, "Loading error")
				reject();
			});

		});
	}


	requestGO() {
		if (this.data.SOMkmers.kmers[0].genes) {
			this.geneList = this.data.SOMkmers.kmers.map(el => el.genes);
		} else {
			this.geneList = this.data.SOMkmers.kmers.map(el => el.events[0].gene);
		}
		this.zone.run(() => {
			this.dialog.open(PantherGoComponent, { data: { geneList: this.geneList } });
		})

	}

	updateSelNodesgetonto() {
		if (this.selectedNodes.length != 0) {
			this.getNodeKmerInfo();
		} else {
			this.toastMessage("You need to select at least one node to access to the ontology", "No selected node")
		}
	}


	updateSelNodesgetDistrib() {
		if (this.selectedNodes.length != 0) {
			this.getNodeKmerInfoDistrib();
		} else {
			this.toastMessage("You need to select at least one node to access to the ontology", "No selected node")
		}

	}


	createMapIndice(id: number) {
		let sample = this.data.samplesSOM[id];
		return { onClick: this.hexaClick(), group: sample.classnumber, title: sample.classori, subtitle: sample.labelsamples, width: this.tiles.width, height: this.tiles.height, MapColumns: this.mapsize, MapRows: this.mapsize, color: sample.projSOM, counts: this.features_per_node, sampleid: id };
	}

	createMapAverage(id: number) {
		let sample = this.data.mapaverage[id];
		return { onClick: this.hexaClick(), group: sample.classnumber, title: sample.classori, subtitle: sample.labelsamples, width: this.tiles.width, height: this.tiles.height, MapColumns: this.mapsize, MapRows: this.mapsize, color: sample.projSOM, counts: this.features_per_node, sampleid: 2099 + id };
	}

	updateCluster() {
		this.clust_select = [];
		var clusters = this.data.samplesSOM.map(x => x.bmu);
		for (let i = 0; i < clusters[0].length; i++) {
			var max = Math.max(...clusters.map(x => x[i]))
			if (max > 0) {
				this.clust_select.push({ id: i, nclust: max + 1 })
			}
		}
		this.zone.run(() => {
			this.hexamappes.indices = [];
			this.indices = []
			for (let i = 0; i < this.clust_select[this.clust].nclust; i++) {
				this.hexamappes.indices.push([]);

			}
			for (let i = 0; i < this.data.samplesSOM.length; i++) {
				if (!this.isFiltered(this.data.samplesSOM[i])) {
					this.hexamappes.indices[this.data.samplesSOM[i].bmu[this.clust]].push(this.createMapIndice(i));
				}
			}
			this.hexamappes.indices.forEach((grp) => {
				this.indices.push({ from_pos: 0, to_display: 6, hidden: true });
			});
		})
	}

	isFiltered(sample: any): boolean {
		if (this.sampleFilterl.length == 0 || this.sampleFilterl.includes(sample.labelsamples)) {
			if (this.clustFilterl.length == 0 || this.clustFilterl.includes(sample.bmu[this.clust])) {
				if (this.catFilterl.length == 0 || this.catFilterl.includes(sample.classori)) {
					return false;
				}
			}
		}
		return true;
	}

	normOptionUpdate(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.getSOMclusters().then(() => {
				this.getSOMnodeImportance().then(() => {
					this.zone.run(() => {
						this.hexamappes.importances = [];
						this.hexamappes.importances.push({ onClick: this.hexaClick(), title: "Features importance", width: this.tiles.width, height: this.tiles.height, MapColumns: this.mapsize, MapRows: this.mapsize, color: this.data.mapimportance[0].projSOM, counts: this.features_per_node, sampleid: 999 });
						this.hexamappes.importances.push({ onClick: this.hexaClick(), title: "k-mers per node", width: this.tiles.width, height: this.tiles.height, MapColumns: this.mapsize, MapRows: this.mapsize, color: this.data.mapimportance[1].projSOM, counts: this.features_per_node, sampleid: 999 });
					})
				}).catch((err) => {
					this.toastMessage(err, "ERROR!");
				});

				this.getSOMaveragebyClass().then(() => {
					this.zone.run(() => {
						this.catergoryList = [];
						this.hexamappes.averages = []
						for (let i = 0; i < this.data.mapaverage.length; i++) {
							this.hexamappes.averages.push(this.createMapAverage(i))
							this.catergoryList.push(this.data.mapaverage[i].classori);
						}
						this.updateCluster();
						resolve();
					});
				});


			});
		});

	}

	toastMessage(message: string, title: string) {
		this.zone.run(() => {
			this._snackBar.open(message, title, { duration: 2000 })
		})
	}


}