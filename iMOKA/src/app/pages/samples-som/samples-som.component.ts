import { Component, OnInit, OnDestroy } from '@angular/core';
import {FileService} from '../../services/file.service';
import {TracksService,ExternalTrack} from '../../services/tracks.service';
import {MatDialog} from '@angular/material/dialog';

import {MatSnackBar} from '@angular/material/snack-bar';

import { Observable, BehaviorSubject, of , pipe} from 'rxjs';
import {  catchError, finalize  } from 'rxjs/operators';

import * as hexamap from '../../plugins/hexamap/hexamap.js';

import {PantherGoComponent} from '../panther-go/panther-go.component';
//import * as $ from 'jquery';

/*export interface GOrepresentation {
	Id:number;// - Id for the associated enrichment type
	Name:string;// - Name of associated id
	GeneId:string;
	P-value:string;// - If the Fisher test is performed or Binomial with no correction, this is the raw P-Value. If the Bonferroni correction is specified, then the Bonferroni correction has been applied to the raw P-Value.
	FDR:string;// - False Discovery Rate if FDR correction is calculated
   
}*/

@Component({
	selector: 'samples-som',
	templateUrl: './samples-som.component.html',
	styleUrls: ['./samples-som.component.css']
})
export class SamplesSomComponent implements OnInit {

	constructor( private fileService: FileService, private trackService: TracksService, public dialog: MatDialog, private _snackBar: MatSnackBar) {


	}
	files: any = [];
	hasKmer: boolean = false;
	hasSom: boolean = false;
	file: any = {};
	info: any = {};
	data: any = {};
	geneList: any = {};
	clust: any;
	normOption: any;
	dtOptions: any = {};
	cols: any = {};
	selectednodes: any = {};
	clust_select: any = [];
	groups: any;
	predictors: any;

	ngOnInit() {

		this.clust = "0";
		this.clust_select=[];
		this.normOption = "normByNode";

	}
	
	initKmers(): Promise<any> {
		return new Promise<any>((resolve, reject) => {

			this.groups = [];
			let palette = ["#4285F4", "#FBBC05", "#9d9f02", "#EA4335", "#FF9900", "#A4C639"];
			for (let i = 0; i < this.info.kmers.info.groups_names.length; i++) {
				this.groups.push({ color: palette[i], name: this.info.kmers.info.groups_names[i] });
			}
			this.predictors = [];
			for (let i = 0; i < this.info.kmers.info.predictors.length; i++) {
				this.predictors.push({ color: palette[i], name: this.info.kmers.info.predictors[i] });
			}

			this.cols.kmers = [{
				title: "ID", data: "id"
			}, {
				title: "Kmer", data: "kmer"
			},
			{
				title: "Events", data: "events"
			}, {
				title: "Genes", data: "genes"
			}, {
				title: "Position", data: (row) => {
					let out = "";
					for (let p in row.alignments) {
						let pos = row.alignments[p].chromosome + ":" + row.alignments[p].start + "-" + row.alignments[p].end;
						out += "<span class='search-in-browser' data-value='" + pos + "'>" + pos + "(" + row.alignments[p].strand + ")</span> ";
					}
					return out == "" ? "NA" : out;
				}

			}
			];
			for (let e in this.info.kmers.info.predictors) {
				this.cols.kmers.push({
					title: this.info.kmers.info.predictors[e].replace(/_/g, " "), data: (row) => {
						return parseFloat(row.values[e]).toPrecision(2);
					}
				});
			}
			for (let e in this.info.kmers.info.groups_names) {
				this.cols.kmers.push({
					title: this.info.kmers.info.groups_names[e], data: (row) => {
						return parseFloat(row.means[e]).toPrecision(2) + "(±" + parseFloat(row.stdevs[e]).toPrecision(2) + ")";
					}
				});
			}
			this.cols.kmers.push({
				title: "More", searchable: false, orderable: false, data: (r) => {
					return '<button class="btn btn-outline-info btn-sm element_info" data-type="kmers" data-id="' + r.original_index + '">Info</button>';
				}
			});
			resolve();

		});
	}
	initSOM(): Promise<any> {
		return new Promise<any>((resolve, reject) => {
			this.normOptionUpdate();
			
		});
	};
	initModels(): Promise<any> {
		return new Promise<any>((resolve, reject) => {
		});
	};
	
	loadData(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.fileService.getFileName({ properties: ["openFile"], filters: [{ name: 'JSON', extension: ['json', 'JSON'] }] }).then((data_file) => {
                if (!data_file || data_file.canceled ) {
                    console.log("No file selected")
                    this.toastMessage("No file selected", "Warning", 2);
                    return;
                } else {
                    console.log("Sent request")
                    this.fileService.load(data_file.filePaths[0]).then((resp) => {
                        console.log(resp)
                        if (resp.message != "SUCCESS") {
                            this.toastMessage(resp.message, "Loading error!!!", 4);
                            reject()
                            return;
                        } else {
                            let file_type = resp.file_type;
                            this.files = this.files.filter((f) => {
                                return f.file_type != file_type;
                            })
                            this.files.push({ file_type: file_type, file: resp.file, file_name: resp.file.split('\\').pop().split('/').pop() });
                            if (file_type == "kmers") {
								//this.loadDataInfo(file_type, resp);
								//this.initKmers();
                                /*this.files.forEach((k) => {
                                    if (k.file_type != "kmers") {
                                        this.closeData(k.file_type);
                                    }
                                });*/
                                this.hasKmer = true;
							 } else if (file_type == "som") {
								//this.initSOM();
								this.hasSom = true;
							
                            }
							this.loadDataInfo(file_type, resp);
                            this.info[file_type].file_name = resp.file.split('\\').pop().split('/').pop();
                            resolve();
                            return;
                        }
                    });
                }
            });
        });
    }

	reset() {

		//document.getElementById('igv-browser').innerHTML = '';
		this.info = {};
		//this.file={};
		this.files = [];
		this.dtOptions = {};
		this.hasKmer=false;
		this.hasSom=false;
		//resolve();
		
	}
	
	getSOMnodeImportance(): Promise<any> {
		return new Promise<any>((resolve, reject) => {
				this.trackService.getData({"data":"SOMimportance","idmap":"importance"}).subscribe((resp) => {
					console.log("SOMimportance");
					console.log(resp);
					this.data.mapimportance=resp;
					resolve();
				},(err) => {
				    console.log(err);
					this.toastMessage(err, "Loading error", 4)
					reject();
				});
			
		});

	}
	
	
	getSOMaveragebyClass(): Promise<any> {
		return new Promise((resolve, reject) => {
				this.trackService.getData({"data":"SOMaverageclass", "norm": this.normOption }).subscribe((resp)=>{
					console.log("SOMaverage");
					console.log(resp);
					this.data.mapaverage=resp;
				
					resolve();
				},(err) => {
					this.toastMessage(err, "Loading error", 4)
					reject();
				});
			
		});

	}
	getSOMclusters(): Promise<any> {
		return new Promise<any>((resolve, reject) => {

			this.trackService.getData({ "data": "SOMclusters", "norm": this.normOption }).subscribe((resp) => {
					console.log("getSOMclusters");
					console.log(resp);
					this.data.samplesSOM = resp;
					this.clust_select =[];
					var clusters=this.data.samplesSOM.map(x=>x.bmu);
					console.log(clusters)
					console.log(this);
					for(let i = 0; i < clusters[0].length; i++){
						var max =Math.max(...clusters.map(x=>x[i]))
						if (max>0){
							this.clust_select.push({id:i,nclust:max+1})
						}
					}
					console.log(this.clust_select);
					resolve();
				},(err) => {
					this.toastMessage(err, "Loading error", 4)
					reject();
			});

		});

	}
	getnodekmerinfo(): Promise<any> {
		return new Promise<any>((resolve, reject) => {

			this.trackService.getData({ "data": "SOMkmers", "nodesIds": this.selectednodes }).subscribe((resp) => {
				console.log("SOMkmers");
				console.log(resp);
				this.data.SOMkmers = resp;
				this.requestGO();
				resolve();
			},(err) => {
					this.toastMessage(err, "Loading error", 4)
					reject();
			});

		});
		/* http://www.pantherdb.org/webservices/garuda/tools/enrichment/VER_2/enrichment.jsp?
		organism=HUMAN
		
		*/

	}
	testonto(){
		this.dialog.open(PantherGoComponent, { data: { geneList: "TSPOAP1,TSPOAP1,VPS41,FAM160A2,RHOA,GBA2,CELSR1,CELSR1,SLC46A1,UBE2A,DDX18,MAVS,GPATCH2L,CHRD,UQCC1,ALG13,TSC2,KNOP1,VPS35L,LZTS2,PITRM1,PITRM1-AS1,PITRM1,ACCS,C12orf49,HSPA9,APBB3,ABCC5,ABCC5,EIF4G1,ARHGEF2,ARHGEF2,SAFB2,SAFB2,NDUFA10,NPHP4,SELENOS,IQCA1,PER2,RAP1GAP2,RAP1GAP2,ARHGEF11,AP4B1,PCSK6,EPHA2,ADAMTSL4,AL356356.1,ADAM15,UBAP2L,INTS3,CAMK2G,CAMK2G,ARFGAP2,TIAL1,TRIP12,KLF10,RNF207,DVL3,SHANK2,NFIA,STK36,RPL9,UVSSA,UVSSA,ZNF641,SLC3A2,SLC16A4,SHOX2,KCNAB1,TRIM56,FAM241B,GATM,EFEMP2,FAM86B3P,AC109992.1,ATR,PHYKPL,TMEM80,POLE,D2HGDH,ADO,AC025048.6,AP1S2,ABAT,SF3A3,RPS23,ZNF33A,NOL4L,CPLANE1,DENND4B,PCMTD2,TRAF3IP1,TRAF3IP1,RUFY2,PLPP6,CFAP44,TSPAN4,C17orf67,NEURL4,NEURL4,DDX3X,FADS3,AL139011.1,AC234582.1,AC244197.3,LINC00893,LINC00894,LINC00106,UBE2V1,RN7SL657P,SLC6A14,SLC4A8,ZFYVE26,CELSR1,PPIE,VWA8,SLC25A51,SYMPK,PANK2,ZBTB1,ZNF337,RFX1,RERE,GABPB2,DGKZ,KIN,SPON2,NEU3,ARL5A,STK36,BMT2,TRIM68,ZNF417,SNX33,GSTM2,AC116351.1,ZNF585B,AC036111.1,AL021920.2,".split(',')	 } });
	}
	requestGO() {
		if(this.data.SOMkmers.kmers[0].genes){
			this.geneList=this.data.SOMkmers.kmers.map(el=>el.genes);
			console.log("case 1");
		}else{
			this.geneList=this.data.SOMkmers.kmers.map(el=>el.events[0].gene);
			console.log("case 2");
		}
		console.log("this.geneList");
		console.log(this.geneList);
		this.dialog.open(PantherGoComponent, { data: { geneList: this.geneList } });

	}
updateSelNodesInfos() {

		let nodesel = (<HTMLInputElement>document.getElementById("listselectednode")).value;
		if (nodesel.length!=0){
			this.selectednodes = nodesel.split(",");

		}}

	updateSelNodesgetonto() {

		let nodesel = (<HTMLInputElement>document.getElementById("listselectednode")).value;
		if (nodesel.length!=0){
			this.selectednodes = nodesel.split(",");
			
			this.getnodekmerinfo();
		}else{
			this.toastMessage("You need to select at least one node to access to the ontology", "No selected node", 3)	
			}
		console.log(this.selectednodes);
		console.log(this.data);


	}
	createmapindice(id) {
		//console.log("createmapindice ligne 91 to uncomment "+id);
		let mapsize = Math.sqrt(this.data.samplesSOM[id].projSOM.length);
		let options = { element: "sommap" + id, width: 150, height: 120, MapColumns: mapsize, MapRows: mapsize, color: this.data.samplesSOM[id].projSOM, sampleid: id };
		//hexamap.init(options);
		//hexamap.createmap(options);
		this.waitForElement(options.element, function() { hexamap.createmap(options) });
		//let toto=new hexamap();
		//toto.createmap(options);
	}
	createmapimportance(id) {
		console.log(this);
		//console.log("createmapindice ligne 91 to uncomment "+id);
		let mapsize = Math.sqrt(this.data.mapimportance[id].projSOM.length);
		let options = { element: "sommapimportance"+id , width: 150, height: 120, MapColumns: mapsize, MapRows: mapsize, color: this.data.mapimportance[id].projSOM, sampleid: 999 };
		//hexamap.init(options);
		//hexamap.createmap(options);
		this.waitForElement(options.element, function() { hexamap.createmap(options) });
		//let toto=new hexamap();
		//toto.createmap(options);
	}
	
	createmapaverage(id) {
		console.log(this);
		//console.log("createmapindice ligne 91 to uncomment "+id);
		let mapsize = Math.sqrt(this.data.mapaverage[id].projSOM.length);
		let options = { element: "sommapaverage"+id , width: 150, height: 120, MapColumns: mapsize, MapRows: mapsize, color: this.data.mapaverage[id].projSOM, sampleid: 2099+id };
		//hexamap.init(options);
		//hexamap.createmap(options);
		this.waitForElement(options.element, function() { hexamap.createmap(options) });
		//let toto=new hexamap();
		//toto.createmap(options);
	}
	waitForElement(elementId, callBack) {
		window.setTimeout(function() {
			var element = document.getElementById(elementId);
			if (element) {
				callBack(elementId, element);
			} else {
				this.waitForElement(elementId, callBack);
			}
		}, 500)
	}


	updateCluster() {
		//var selectObject = document.getElementById('comboA');
		//this.clust = 1
		console.log("updatecluster");

		var that = this
		console.log(that.clust);
		console.log(this.clust);
		var sortedInfo = this.data.samplesSOM.sort(function(a, b) { return parseFloat(a.bmu[that.clust]) - parseFloat(b.bmu[that.clust]); });
		this.data.samplesSOM = sortedInfo;
		for (let i = 0; i < this.data.samplesSOM.length; i++) {
			this.createmapindice(i);
		}

		console.log(this.data);

	}
	normOptionUpdate() {
		this.getSOMclusters().then(() => {

			this.updateCluster();
			this.getSOMnodeImportance().then(()=>{
				
				this.createmapimportance(0);
				this.createmapimportance(1);
			});
			this.getSOMaveragebyClass().then(()=>{
				for (let i = 0; i < this.data.mapaverage.length; i++) {
					this.createmapaverage(i);
				}
			});
		});

	}


	    toastMessage(message: string, title: string, level: number) {
        this._snackBar.open(message, title, {duration : 2000} )
    }
    closeData(file_type: any) {
        this.fileService.closeData(file_type).then((message) => {
            delete this.info[file_type];
            if (file_type == "importance") {
                delete this.data.models;
            }
            if (file_type == "kmers") {
                this.hasKmer = false;
            }
            this.files = this.files.filter(f => f.file_type != file_type);
        });
    }
    loadDataInfo(file_type, info) {
        this.info[file_type] = info;
        if (file_type == "kmers") {
			this.initKmers();
          /*  this.loadKmerTracks();
            this.dtOptions.eventsFilter=[];
            info.events.forEach(ev => this.dtOptions.eventsFilter.push(ev.name));*/
        } else if (file_type == "som") {
            this.initSOM();
        } else if (file_type == "importance") {
           // this.initImportance();
        }
        //this.refreshTable();
    }


}
