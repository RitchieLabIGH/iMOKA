// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import {possible_files, queue_example, samples_example, matrices_example} from './examples';

export const environment : any = {
  production: false,
  defaultLanguage : "EN",
  default_profile : true,
  debug : {
		/*files : possible_files[0] ,*/
		files : possible_files[1] ,
		queue : queue_example,
		samples : samples_example[2],
		/*matrices: false,*/
		matrices : matrices_example,
   },
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
