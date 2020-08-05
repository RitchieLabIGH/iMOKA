// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment : any = {
  production: false,
  defaultLanguage : "EN",
  default_profile : true,
	debug : {
		files : ["assets/data/agg.json"],
		queue : 
		[{  type : "completed",
			result : "success",
			code :0,
			times : {
				added : Date.now(),
				started : Date.now()+10000,
				completed : Date.now()+50000
			},
			job : {
				
				uid : "1235456", 
				original_request : {
					name : "preprocess"
				},
			},
			stderr : "Exmaple of short stderr",
			stdout : "Exmaple of short stdout"
		},{ type : "running",
			times : {
				added : Date.now(),
				started : Date.now(),
			},
			job : {
				
				uid : "1235457", 
				original_request : {
					name : "aggregation"
				},
			}, 
			stderr : "Exmaple of long stderr\n".repeat(100),
			stdout : "Exmaple of long stdout\n".repeat(100)
		}]
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
