
import {Sample} from '../app/interfaces/samples';
export const possible_files = [[], ["assets/data/agg.json"]]

export const queue_example= [{  type : "completed",
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

let lots_of_samples = [], max_samples=22;

for ( let i=0; i< max_samples; i++){
	let sam=new Sample();
	sam.metadata=[];
	sam.count_file="test_"+i;
	sam.id="sample_"+i;
	sam.k_len=31;
	sam.libType="NA";
	sam.source=["ERR"+i];
	sam.minCount=5;
	sam.total_suffix=1000000 + Math.round(Math.random()*100000)
	sam.total_prefix=10000 + Math.round(Math.random()*1000)
	sam.total_count=9000000 + Math.round(Math.random()*1000000)
	sam.name="Sample "+i
	sam.metadata=[{key : "Study", value : "Test"}, {key :"DrugA" , value : i < (max_samples/2) ? "Responsive" : "Resistant" }]
	lots_of_samples.push(sam)
	
}
export const samples_example = [[],[lots_of_samples[0], lots_of_samples[1]], lots_of_samples];

export const matrices_example = require('./matrices.json');
