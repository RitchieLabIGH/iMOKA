import { NgModule , ModuleWithProviders} from '@angular/core';
import { CommonModule } from '@angular/common';
import {FileService} from './file.service';
import {TracksService} from './tracks.service';
import {PantherDBService} from './pantherdb.service';
import {UemService} from './uem.service';
import {QueueService} from './queue.service';
import {SamplesService} from './samples.service'
const SERVICES = [
  FileService,
  TracksService,
  PantherDBService,
  UemService,
  QueueService,
  SamplesService,
];

@NgModule({
  imports: [
    CommonModule,
  ],
  providers: [
    ...SERVICES,
  ],
})
export class ServicesModule {
  static forRoot(): ModuleWithProviders {
    return <ModuleWithProviders>{
      ngModule: ServicesModule,
      providers: [
        ...SERVICES,
      ],
    };
  }
}
