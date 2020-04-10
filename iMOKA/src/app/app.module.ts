import { BrowserModule, HAMMER_GESTURE_CONFIG } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {PagesModule} from './pages/pages.module'
import {CoreModule} from './core/core.module';

/// Gestures
import { GestureConfig } from '@angular/material';

import * as $ from "jquery";
import { LayoutModule } from '@angular/cdk/layout';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    CoreModule,
    PagesModule,
    LayoutModule,
  ],
  providers : [{provide : HAMMER_GESTURE_CONFIG, useClass: GestureConfig}],
  bootstrap: [AppComponent],
  exports : [],
})
export class AppModule { }
