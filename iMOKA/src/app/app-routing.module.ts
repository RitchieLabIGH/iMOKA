import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {DashboardComponent} from './pages/dashboard/dashboard.component';
import {KMerListComponent} from './pages/k-mer-list/k-mer-list.component';
import {SamplesSomComponent} from './pages/samples-som/samples-som.component';
import {SetupComponent} from './pages/setup/setup.component';
import {SamplesListComponent } from './pages/samples-list/samples-list.component';
import {MatricesComponent} from './pages/matrices/matrices.component';
import {OpenFilesComponent} from './pages/open-files/open-files.component';
import {PredictionModelsComponent} from './pages/prediction-models/prediction-models.component';
import {AboutComponent} from './pages/about/about.component';
import {LoggerComponent} from './pages/logger/logger.component';

const routes: Routes = [
  {path : 'dashboard', component : DashboardComponent},
  {path  : '',  redirectTo: '/dashboard', pathMatch: 'full' },
  {path : 'klist',component : KMerListComponent},
  {path : 'som',component : SamplesSomComponent},
  {path : 'setup', component : SetupComponent},
  {path : 'samples' , component :SamplesListComponent },
  {path : 'matrices' , component :MatricesComponent },
  {path : 'files' , component :OpenFilesComponent },
  {path : 'models' , component : PredictionModelsComponent},
  {path : 'about', component : AboutComponent},
  {path : 'logger' , component: LoggerComponent},
                        ];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash : true})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
