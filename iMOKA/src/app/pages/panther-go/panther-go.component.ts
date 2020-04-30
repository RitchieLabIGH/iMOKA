import { Component, Inject, OnInit, ViewChild, OnDestroy, ElementRef } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { PantherDBService, PatherDataRow, PantherDBOptions, PDBOrganism, PDBType, PDBTestType, PDBCorrection, PDBEnrichmentType } from '../../services/pantherdb.service';
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';

@Component({
	selector: 'panther-go',
	templateUrl: './panther-go.component.html',
	styleUrls: ['./panther-go.component.css']
})



export class PantherGoComponent implements OnInit, OnDestroy {
	@ViewChild(MatSort, { static: true }) sort: MatSort;
	@ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
	@ViewChild('mainPage', { static: true }) element: ElementRef;
	loading = true;
	countGOids: any = {};
	graphs: {genes? : any, pvals? : any}={};
	parentname: any = [];
	table_uri:string;
	displayedColumns: string[] = ['name', 'goid', 'ngenes', 'genes', 'pval', 'fdr'];
	dataSource: MatTableDataSource<PatherDataRow> = new MatTableDataSource<PatherDataRow>();

	colors = ["#ffb317", "#f94646", "#feffa0", "#ffce69", "#4fce00", "#fc724f", "#fbfc90", "#21b5e2", "#00bd6a", "#52319b"];
	win: { height: number, width: number };



	results: PatherDataRow[] = [];
	panther_options: PantherDBOptions = {
		organism: PDBOrganism.HUM,
		type: PDBType.enrichment,
		test_type: PDBTestType.FISHER,
		correction: PDBCorrection.FDR,
		enrichmentType: PDBEnrichmentType.function,
		geneList: [],
	};
	PDBEnrichmentTypeKeys: any = {};
	PDBTestTypeKeys: any = {};
	PDBCorrectionKeys: any = {};

	constructor(protected pService: PantherDBService, @Inject(MAT_DIALOG_DATA) data: { geneList: string[] }) {
		this.panther_options.geneList = data.geneList;
	}


	ngOnInit() {
		this.PDBEnrichmentTypeKeys = Object.keys(PDBEnrichmentType);
		this.PDBTestTypeKeys = Object.keys(PDBTestType);
		this.PDBCorrectionKeys = Object.keys(PDBCorrection);
		this.dataSource.sort = this.sort;
		this.dataSource.paginator = this.paginator;
		this.enrichmentAnalysis();
	}
	ngOnDestroy() {
	}
	enrichmentAnalysis() {
		this.loading = true;
		this.pService.enrichmentAnalysis(this.panther_options).then((results) => {
			if (this.element) {
				this.win = { height: this.element.nativeElement.offsetHeight, width: this.element.nativeElement.offsetWidth };
			}
			this.displayedColumns = this.displayedColumns.filter((el) => el != "fdr")
			if (this.panther_options.correction == PDBCorrection.FDR) {
				this.displayedColumns.push("fdr");
			}
			results.sort((a,b)=> a.pval < b.pval ? 1 : -1 );
			this.dataSource.data = results;
			this.dataSource._updateChangeSubscription();
			this.groupGoGraphs();
		}).finally(() => {
			this.loading = false;
		});
	}
	groupGoGraphs() {
		let data = [];
		this.dataSource.data.forEach((el) => {
			data.push({ pval: -Math.log10(el.pval), genes: el.genes.length, name: el.name })
		});
		data.sort((a, b) => {
			return a.genes < b.genes ? -1 : 1;
		})
		this.graphs.genes = {
			data: [
				{
					x: data.map(dat => dat.genes), y: data.map(dat => dat.name), type: 'bar',
					orientation: 'h'
				},
			],
			layout: {
				width: (this.win ? Math.round(this.win.width / 2.3) : 420), height: 400, title: 'Number of genes by GO term',
				xaxis: {
					title: 'Number of genes',
				},
				yaxis: {
					title: '',
					range: [data.length - 10, data.length],
				}, margin : {l : 200}
				

			},
		}
		data.sort((a, b) => {
			return a.pval < b.pval ? -1 : 1;
		})
		//Plotly
		this.graphs.pvals = {
			data: [
				{
					x: data.map(dat => dat.pval), y: data.map(dat => dat.name), type: 'bar',
					orientation: 'h'
				},
			],
			layout: {
				width: (this.win ? Math.round(this.win.width / 2.3) : 420), height: 400, title: 'p-value by GO term',
				xaxis: {
					title: 'p-value (-log10)'
				},
				yaxis: {
					title: '',
					range: [data.length - 10, data.length]	
				}, margin : {l : 200}
			}
		}

	}

	applyFilter(filterValue: string) {
		this.dataSource.filter = filterValue.trim().toLowerCase();
	}

	downloadTsv() {
		let fdr = this.panther_options.correction == PDBCorrection.FDR ;
		let out = "OntologyID\tOntologyName\tp-value"+(fdr? "\tFDR" : "")+"\tgenes\n";
		this.dataSource.data.forEach((val) => {
			out+=val.name +"\t"+val.id + "\t"+val.pval + "\t"+ (fdr? val.fdr +"\t" : "")+val.genes.join(";")+"\n";
		});
		this.table_uri='data:text/plain;charset=utf-8,' + encodeURIComponent(out);
		return true;
		
	}



}
