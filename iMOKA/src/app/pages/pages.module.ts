import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KMerListComponent } from './k-mer-list/k-mer-list.component';
import { PantherGoComponent } from './panther-go/panther-go.component';
import { SamplesSomComponent } from './samples-som/samples-som.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AngularMaterialModule } from '../angular-material/angular-material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { ServicesModule } from '../services/services.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { RouterModule } from '@angular/router';

import * as $ from 'jquery';
import * as PlotlyJS from 'plotly.js/dist/plotly.js';

import { PlotlyModule } from 'angular-plotly.js';
import { FileImportanceComponent } from './prediction-models/file-importance/file-importance.component';
import { FileKmerComponent } from './k-mer-list/dialog/file-kmer/file-kmer.component';
import { KmerInfoComponent } from './k-mer-list/dialog/kmer-info/kmer-info.component';
import { SequenceInfoComponent } from './k-mer-list/dialog/sequence-info/sequence-info.component';
import { OpenTrackComponent } from './k-mer-list/dialog/open-track/open-track.component';
import { DataTablesModule } from 'angular-datatables';
import { SetupComponent } from './setup/setup.component';
import { SamplesListComponent } from './data-reduction/samples-list/samples-list.component';
import { DialogNewComponent } from './data-reduction/samples-list/dialog-new/dialog-new.component';
import { DataReductionComponent } from './data-reduction/data-reduction.component';
import { MatricesComponent } from './data-reduction/matrices/matrices.component';
import { AggregateComponent } from './data-reduction/matrices/aggregate/aggregate.component';
import { ReduceComponent } from './data-reduction/matrices/reduce/reduce.component';
import { MapSetupComponent } from './setup/subpages/map_setup.component';
import { MasterSetupComponent } from './setup/subpages/master_setup.component';
import { OpenFilesComponent } from './open-files/open-files.component';
import { PredictionModelsComponent } from './prediction-models/prediction-models.component';
import { ModelDisplayComponent } from './prediction-models/model-display/model-display.component';

import { RandomForestComponent } from './k-mer-list/dialog/random-forest/random-forest.component';
import {NewSomComponent} from './k-mer-list/dialog/som/new-som.component';
import { CoreModule } from '../core/core.module';
import { NodesInfoComponent } from './samples-som/nodes-info/nodes-info.component'
import { HexamapComponent } from './samples-som/hexamap/hexamap.component';

import {AboutComponent} from './about/about.component';

PlotlyModule.plotlyjs = PlotlyJS;


@NgModule({
	declarations: [
		OpenFilesComponent,
		KMerListComponent,
		PantherGoComponent,
		SamplesSomComponent,
		NodesInfoComponent,
		DashboardComponent,
		FileImportanceComponent,
		FileKmerComponent,
		KmerInfoComponent,
		SequenceInfoComponent,
		OpenTrackComponent,
		SetupComponent,
		SamplesListComponent,
		DialogNewComponent,
		DataReductionComponent,
		MatricesComponent,
		AggregateComponent,
		ReduceComponent,
		MapSetupComponent,
		MasterSetupComponent,
		PredictionModelsComponent,
		ModelDisplayComponent,
		RandomForestComponent,
		HexamapComponent,
		AboutComponent,
		NewSomComponent,
	],
	imports: [
		CommonModule,
		AngularMaterialModule,
		PlotlyModule,
		FormsModule,
		BrowserModule,
		RouterModule,
		ServicesModule,
		FlexLayoutModule,
		DataTablesModule,
		ReactiveFormsModule,
		CoreModule,
	],
	entryComponents: [
		OpenTrackComponent,
		FileImportanceComponent,
		KmerInfoComponent,
		SequenceInfoComponent,
		DialogNewComponent,
		PantherGoComponent,
		AggregateComponent,
		ReduceComponent,
		RandomForestComponent,
		NodesInfoComponent,
		NewSomComponent,
	]
})
export class PagesModule { }
