import { NgModule, Optional, SkipSelf, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { throwIfAlreadyLoaded } from './module-import-guard';


import { environment } from '../../environments/environment';

import { MAT_DATE_LOCALE } from '@angular/material';
import { AngularMaterialModule } from '../angular-material/angular-material.module';
import { NavComponent } from './nav/nav.component';
import { LayoutModule } from '@angular/cdk/layout';
import { FlexLayoutModule } from '@angular/flex-layout';
import {ServicesModule} from '../services/services.module';
import { InfoComponent, JobInfo } from './info/info.component'

/// Pipes
import {TypeofPipe} from '../pipes/typeof.pipe';
import {SafeHtmlPipe, SafeURLPipe} from '../pipes/safeHtml.pipe';
import {DurationPipe} from '../pipes/duration.pipe';


export const NB_CORE_PROVIDERS = [
  ...ServicesModule.forRoot().providers,
  ]


@NgModule({
  imports: [
    AngularMaterialModule,
    BrowserAnimationsModule,
    CommonModule,
    HttpClientModule,
    RouterModule,
    LayoutModule,
    FlexLayoutModule,
  ],
  declarations: [ NavComponent, InfoComponent, TypeofPipe, SafeHtmlPipe, SafeURLPipe,DurationPipe, JobInfo],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: environment.defaultLanguage }
    
  ],
  entryComponents : [ InfoComponent, JobInfo ],
  exports: [ NavComponent ,TypeofPipe, SafeHtmlPipe, SafeURLPipe, DurationPipe]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    throwIfAlreadyLoaded(parentModule, 'CoreModule');
  }

  static forRoot(): ModuleWithProviders {
    return <ModuleWithProviders>{
      ngModule: CoreModule,
      providers: [
        ...NB_CORE_PROVIDERS,
      ],
    };
  }
}
