import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import * as panther from '../../services/pantherdb.service';
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';


@Component({
	selector: 'panther-go',
	templateUrl: './panther-go.component.html',
	styleUrls: ['./panther-go.component.css']
})


export class PantherGoComponent implements OnInit {
	@ViewChild(MatSort, { static: true }) sort: MatSort;
	@ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
	//@Input("geneList") geneList: string[];
	geneList: any = [];
	loaded = false;
	dtOptions: DataTables.Settings = {};

	countGOids: any = {};
	graphdata: any = {};
	graphpvaldata: any = {};
	parentname: any = [];

	datatabletest: any = [];
	pvals: any = [];
	fdrs: any = [];
	displayedColumns: string[] = ['name', 'genename', 'child', 'pval', 'fdr'];
	dataSource: any = {};


	colors = ["#ffb317", "#f94646", "#feffa0", "#ffce69", "#4fce00", "#fc724f", "#fbfc90", "#21b5e2", "#00bd6a", "#52319b"];




	results: panther.PantherDBEnrichmentResult[] = [];
	panther_options: panther.PantherDBOptions = {
		organism: panther.PDBOrganism.HUM,
		type: panther.PDBType.enrichment,
		test_type: panther.PDBTestType.FISHER,
		correction: panther.PDBCorrection.FDR,
		enrichmentType: panther.PDBEnrichmentType.function,
		geneList: [],
	};
	PDBEnrichmentTypeKeys: any = {};
	PDBTestTypeKeys: any = {};
	PDBCorrectionKeys: any = {};
	enrichment_results: panther.PantherDBEnrichmentResult[];

	constructor(protected pService: panther.PantherDBService, private dialogRef: MatDialogRef<PantherGoComponent>, @Inject(MAT_DIALOG_DATA) data) {
		this.geneList = data.geneList;

	}



	ngOnInit() {
		console.log(this);
		console.log(this.geneList);

		this.PDBEnrichmentTypeKeys = Object.keys(panther.PDBEnrichmentType);
		this.PDBTestTypeKeys = Object.keys(panther.PDBTestType);
		this.PDBCorrectionKeys = Object.keys(panther.PDBCorrection);
		this.enrichmentAnalysis();


	}

	enrichmentAnalysis() {
		console.log(this);
		this.panther_options.geneList = this.geneList;
		console.log("Asking to the service");

		this.datatabletest = [];
		this.loaded = true;
		this.pService.enrichmentAnalysis(this.panther_options).subscribe(results => {
			console.log("Service gave results");
			this.results = results;
			console.log(results);
			this.groupGoterms();



		});
	}
	groupGoterms() {
		let goIDs = this.results.map(x => x.name);
		//let goNames=this.results.map(x =>x.name);
		this.countGOids = this.count(goIDs);
		console.log(this.countGOids);
		let uniquego = []
		for (var k in this.countGOids) {
			if (this.countGOids[k] < 2) {
				delete this.countGOids[k];
				uniquego.push(k);
			}
		}
		let countGOidsVals = Object.values(this.countGOids);
		let countGOidsKeys = Object.keys(this.countGOids);
		let indices = [];
		let sortedvalGO = [];
		let sortedGOlabel = [];
		for (let i = 0; i < countGOidsVals.length; ++i) indices[i] = i;
		indices.sort(function(a, b) { return countGOidsVals[a] > countGOidsVals[b] ? -1 : countGOidsVals[a] > countGOidsVals[b] ? 1 : 0; });
		for (let i = 0; i < indices.length; ++i) {
			sortedvalGO.push(countGOidsVals[indices[i]]);
			sortedGOlabel.push(countGOidsKeys[indices[i]]);
		}
		/*this.graphdata = {
			labels: sortedGOlabel,//Object.keys(this.countGOids),
			datasets: [{
				data: sortedvalGO,// Object.values(this.countGOids),
				backgroundColor: this.colors[0],
			}],

		};
		this.graphdata.labels.push(uniquego.join(','));
		this.graphdata.datasets[0].data.push(uniquego.length);
		*/

		this.graphdata = {
			data: [
				{ x: sortedGOlabel, y: sortedvalGO, type: 'bar' },

			],
			layout: {
				width: 420, height: 240, title: 'Number of gene by GO term',
				xaxis: {
					autorange: true,
					showgrid: false,
					ticks: '',
					showticklabels: false
				}
			}
		}

		//console.log(this.graphdata);
		//build table tree data
		var id = 1;

		var ctGO = 0;
		console.log(this)
		sortedvalGO.forEach(function(val) {
			var parentid = id;
			//var parentidtest=id;
			//special case for the last go term who group all the genes alone
			if (ctGO == sortedvalGO.length - 1) {


				id += 1;
				//parentidtest=this.datatabletest.length;
				this.results.forEach(function(res) {
					if (sortedGOlabel[ctGO].split(',').indexOf(res.name) > -1) {

						//this.datatabletest[this.datatabletest.length-1].child.push({ id: id, name: res.name, genename:res.geneID ,pval:res.pval , fdr:res.FDR, parent:parentid })
						this.datatabletest.push({ id: id, name: res.name, genename: "1 gene", pval: res.pval, fdr: res.FDR, parent: 0, child: [] });
						this.datatabletest[this.datatabletest.length - 1].child.push({ id: id, name: res.name, genename: res.geneID, pval: res.pval, fdr: res.FDR, parent: parentid })

						//this.datatabletest[this.datatabletest.length-1].child+="<p>"+res.geneID+"</p>"
						id += 1;
					}
				}, this);
				ctGO += 1;
			} else {
				//normal case

				this.datatabletest.push({ id: id, name: sortedGOlabel[ctGO], genename: val, pval: "", fdr: "", parent: 0, child: [] });
				id += 1;
				var idparent = id - 1;
				this.results.forEach(function(res) {
					if (res.name == sortedGOlabel[ctGO]) {
						if (id == idparent + 1) {

							this.datatabletest[this.datatabletest.length - 1].pval = res.pval;
							this.datatabletest[this.datatabletest.length - 1].fdr = res.FDR;
							this.pvals.push(res.pval);
							this.fdrs.push(res.fdr)
							this.parentname.push(res.name)
						}


						this.datatabletest[this.datatabletest.length - 1].child.push({ id: id, name: res.name, genename: res.geneID, pval: res.pval, fdr: res.FDR, parent: parentid })
						//this.datatabletest[this.datatabletest.length-1].child+= "<li>"+res.geneID+"<li>"
						id += 1;
					}
				}, this);
				ctGO += 1;
			}
		}, this);

		console.log("this.datatabletest ");
		console.log(this.datatabletest);
		this.dataSource = new MatTableDataSource(this.datatabletest);
		this.dataSource.sort = this.sort;
		this.dataSource.paginator = this.paginator;
		this.loaded = false;
		console.log("this.dataSource ");
		console.log(this.dataSource);


		console.log("sorting...")


		var n = this.pvals.slice(0).sort()
		var a = [];
		for (var x in n) {
			var i = this.pvals.indexOf(n[x]);
			a.push(this.parentname[i]);
			this.pvals[i] = null;
		}
		this.pvals = n;
		this.parentname = a;


		//Plotly
		this.graphpvaldata = {
			data: [
				{ x: this.parentname, y: this.pvals, type: 'bar' },

			],
			layout: {
				width: 420, height: 240, title: 'Pval by GO term',
				xaxis: {
					autorange: true,
					showgrid: false,
					ticks: '',
					showticklabels: false
				}
			} //
		}

	}
	count(arr) {
		return arr.reduce((prev, curr) => (prev[curr] = ++prev[curr] || 1, prev), {});
	}
	applyFilter(filterValue: string) {
		this.dataSource.filter = filterValue.trim().toLowerCase();
	}




}
