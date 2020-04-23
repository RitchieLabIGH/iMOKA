import { Component, OnInit, NgZone, OnDestroy, ViewChild, HostListener , ElementRef} from '@angular/core';
import { FileService } from '../../services/file.service';
import { TracksService } from '../../services/tracks.service';
import { UemService } from '../../services/uem.service';
import { MatDialog } from '@angular/material/dialog';
import { FormControl } from '@angular/forms';
import { NodesInfoComponent } from './nodes-info/nodes-info.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabGroup } from '@angular/material';


import { Subscription } from 'rxjs';
import { Session } from '../../interfaces/session'

import { PantherGoComponent } from '../panther-go/panther-go.component';


@Component({
	selector: 'samples-som',
	templateUrl: './samples-som.component.html',
	styleUrls: ['./samples-som.component.css']
})
export class SamplesSomComponent implements OnInit, OnDestroy {

	@ViewChild(MatTabGroup, { static: true }) tab: MatTabGroup;
	@ViewChild('mainPage', {static:true}) element : ElementRef;
	@HostListener('window:resize', ['$event']) onResize(event?) {
			if ( this.element ){
				this.win = { height : this.element.nativeElement.offsetHeight, width : this.element.nativeElement.offsetWidth};
				this.tiles={ height : this.win.width / 10, width : this.win.width / 9};	
			}
	}
	constructor( private trackService: TracksService ,public dialog: MatDialog, private _snackBar: MatSnackBar, private zone: NgZone, private uem: UemService) {
	}
	win : {height : number, width : number};
	tiles : {height : number, width : number};
	mapsize: number;
	somTabIndex:number;
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
	indices : any;
	ngOnInit() {
		this.onResize();
		this.clust_select = [];
		this.normOption = "normByNode";
		this.subscriptions.push(this.uem.getSession().subscribe((session) => {
			this.session = session;
			this.update();
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
		console.log(data);
		this.clustFilterl = [data.points[0].pointIndex];
		this.somTabIndex = 0;
		this.update();
	}


	getSOMnodeImportance(): Promise<any> {
		return new Promise<any>((resolve, reject) => {
			this.trackService.getData({ "data": "SOMimportance", "idmap": "importance" }).subscribe((resp) => {
				console.log("SOMimportance")
				console.log(resp)
				this.data.mapimportance = resp;
				
				this.data.graphImportance = {
					data: [
						{ x: Array.from(Array(this.data.mapimportance[0].projSOM.length)).map((e, i) => i + 1), y: this.data.mapimportance[0].projSOM, type: 'bar' },

					],
					layout: {
						width: this.tiles.width * 4 , height: this.tiles.height *3 , title: 'Features importance',
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
						{ x: Array.from(Array(this.data.mapimportance[1].projSOM.length)).map((e, i) => i + 1), y: this.data.mapimportance[1].projRAW, type: 'bar' },
					],
					layout: {
						width: this.tiles.width * 4 , height: this.tiles.height * 3 , title: 'Number of k-mers by node',
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
	hexaClick(){
		let that = this;
		return (d, i, ctrl)=>{
			if ( ! ctrl ){
				if ( that.selectedNodes.includes(i)){
					that.selectedNodes = [];
				} else {
					that.selectedNodes = [i];	
				}
				
			} else {
				if ( ! that.selectedNodes.includes(i)) {
					that.selectedNodes.push(i);	
				} else {
					that.selectedNodes=that.selectedNodes.filter((n)=>{return n!=i;});
				}
			}
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
				console.log("SOMsampleDistrib")
				console.log(resp)
				this.data.clusterdist = { data: resp, layout: { barmode: 'stack' } }
				resolve();
			}, (err) => {
				this.toastMessage(err, "Loading error")
				reject();
			});

		});
	}
	testonto() {
		this.dialog.open(PantherGoComponent, { data: { geneList: "TSPOAP1,TSPOAP1,VPS41,FAM160A2,RHOA,GBA2,CELSR1,CELSR1,SLC46A1,UBE2A,DDX18,MAVS,GPATCH2L,CHRD,UQCC1,ALG13,TSC2,KNOP1,VPS35L,LZTS2,PITRM1,PITRM1-AS1,PITRM1,ACCS,C12orf49,HSPA9,APBB3,ABCC5,ABCC5,EIF4G1,ARHGEF2,ARHGEF2,SAFB2,SAFB2,NDUFA10,NPHP4,SELENOS,IQCA1,PER2,RAP1GAP2,RAP1GAP2,ARHGEF11,AP4B1,PCSK6,EPHA2,ADAMTSL4,AL356356.1,ADAM15,UBAP2L,INTS3,CAMK2G,CAMK2G,ARFGAP2,TIAL1,TRIP12,KLF10,RNF207,DVL3,SHANK2,NFIA,STK36,RPL9,UVSSA,UVSSA,ZNF641,SLC3A2,SLC16A4,SHOX2,KCNAB1,TRIM56,FAM241B,GATM,EFEMP2,FAM86B3P,AC109992.1,ATR,PHYKPL,TMEM80,POLE,D2HGDH,ADO,AC025048.6,AP1S2,ABAT,SF3A3,RPS23,ZNF33A,NOL4L,CPLANE1,DENND4B,PCMTD2,TRAF3IP1,TRAF3IP1,RUFY2,PLPP6,CFAP44,TSPAN4,C17orf67,NEURL4,NEURL4,DDX3X,FADS3,AL139011.1,AC234582.1,AC244197.3,LINC00893,LINC00894,LINC00106,UBE2V1,RN7SL657P,SLC6A14,SLC4A8,ZFYVE26,CELSR1,PPIE,VWA8,SLC25A51,SYMPK,PANK2,ZBTB1,ZNF337,RFX1,RERE,GABPB2,DGKZ,KIN,SPON2,NEU3,ARL5A,STK36,BMT2,TRIM68,ZNF417,SNX33,GSTM2,AC116351.1,ZNF585B,AC036111.1,AL021920.2,".split(',') } });
	}
	requestGO() {
		if (this.data.SOMkmers.kmers[0].genes) {
			this.geneList = this.data.SOMkmers.kmers.map(el => el.genes);
		} else {
			this.geneList = this.data.SOMkmers.kmers.map(el => el.events[0].gene);
		}
		this.dialog.open(PantherGoComponent, { data: { geneList: this.geneList } });

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
		return {onClick : this.hexaClick(), group : sample.classnumber, title: sample.classori, subtitle: sample.labelsamples, width: this.tiles.width, height: this.tiles.height, MapColumns: this.mapsize, MapRows: this.mapsize, color: sample.projSOM, sampleid: id };
	}

	createMapAverage(id: number) {
		let sample= this.data.mapaverage[id];
		return {onClick : this.hexaClick(), group : sample.classnumber , title: sample.classori, subtitle :sample.labelsamples, width: this.tiles.width, height: this.tiles.height, MapColumns: this.mapsize, MapRows: this.mapsize, color: sample.projSOM, sampleid: 2099 + id };
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
			this.indices=[]
			for (let i = 0; i < this.clust_select[this.clust].nclust; i++) {
				this.hexamappes.indices.push([]);
				
			}
			for (let i = 0; i < this.data.samplesSOM.length; i++) {
				if (! this.isFiltered(this.data.samplesSOM[i]) ){
					this.hexamappes.indices[this.data.samplesSOM[i].bmu[this.clust]].push(this.createMapIndice(i));	
				}
			}
			this.hexamappes.indices.forEach((grp)=>{
				this.indices.push({from_pos:0, to_display: 6 , hidden: true});
			});
		})
	}
	
	isFiltered(sample :any): boolean{
		if ( this.sampleFilterl.length == 0 || this.sampleFilterl.includes(sample.labelsamples) ){
			if (this.clustFilterl.length == 0 || this.clustFilterl.includes(sample.bmu[this.clust])){
				if ( this.catFilterl.length == 0 || this.catFilterl.includes(sample.classori)){
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
						this.hexamappes.importances.push({onClick : this.hexaClick(), title: "Features importance", width: this.tiles.width, height: this.tiles.height, MapColumns: this.mapsize, MapRows: this.mapsize, color: this.data.mapimportance[0].projSOM, sampleid: 999 });
						this.hexamappes.importances.push({onClick : this.hexaClick(), title: "k-mers per node", width: this.tiles.width, height: this.tiles.height, MapColumns: this.mapsize, MapRows: this.mapsize, color: this.data.mapimportance[1].projSOM, sampleid: 999 });
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