
class iMOKA {
	
	 createJob(proc){
		 proc.data.creation_time=Date.now();
		 return new Promise((resolve, reject)=>{
			 if ( proc.name == "preprocess" ){
				  resolve(this.preprocess(proc.data));
			  } else if ( proc.name == "reduce"){
				  resolve( this.reduce(proc.data));
			  } else if ( proc.name =="aggregate"){
				resolve( this.aggregate(proc.data));	  
			  } else if (proc.name == "random_forest"){
				  this.random_forest(proc.data).then((res)=>{
					  resolve(res)
				  }).catch(err=>{
					  reject(err);
				  });
			  }else if(proc.name =="som"){
				  this.som(proc.data).then((res)=>{
					  resolve(res);
				  }).catch(err=>{
					  reject(err);
				  })
			  } else if (proc.name =="predict"){
				  this.predict(proc.data).then((res)=>{
					  resolve(res)
				  }).catch((err)=>{
					 reject(err)  
				  })
			  }else {
				  reject({message : "Process " + proc.name + " not recognized." , success : false})
			  }
		 })
		  
	 }
	 
	 timestamp(){
		 return ""+Date.now();
	 }
	 predict(data){
		 
		return new Promise((resolve, reject)=>{
			let out = { commands : [ ] , files : [] ,
		   			copy_files: [] , success : true, uid : data.uid, 
		   			errors : []}, model = data.model.split(" "), sample_dir = "${imoka_home}/samples/"+data.sample+"/";
			let matrix_bin= sample_dir+data.sample+".tsv.sorted.bin" ,
			model_base = "${imoka_home}/experiments/"+model[0]+"/RF/"+model[1];
			out.commands.push("echo \""+matrix_bin+"\tsample\tNA\" > ./matrix.tsv")
			out.commands.push("singularity exec ${singularity_image} iMOKA_core create -i ./matrix.tsv -o ./matrix.json")
			out.commands.push("cat "+model_base+"_models/*.features | sort | uniq > ./features.ls ")
			out.commands.push("singularity exec ${singularity_image} iMOKA_core extract -s ./matrix.json -i ./features.ls -o ./topredict.tsv")
			out.commands.push("for model in "+model_base+"_models/*.pickle ; do singularity exec ${singularity_image} predict.py ./topredict.tsv ${model} ./tmp | awk ' NR > 1 {print}' >> ./predictions.tsv; done \n echo 'predictions completed' ")
			out.commands.push("mkdir -p "+sample_dir+"PRED/")
			out.commands.push("echo '{ \"experiment\" : \""+model[0]+"\" ,  \"model\": \""+model[1]+"\", \"sample\" : \""+data.sample+"\" , ' > ./output ")
			out.commands.push("singularity exec ${singularity_image} awk ' /classnames/ { print; while ( (getline line ) > 0 && line !~ /]/ )  { print line } print line } ' ./tmp  >> ./output ")
			out.commands.push("echo '\"probabilities\" : [ ' >> ./output ")
			out.commands.push("singularity exec ${singularity_image} awk -F '\t' ' NR > 1 { print \",\" }  { line= \"[ \" $4 ; for (i = 5; i <= NF; i++ ) { line = line  \", \" $i  } ; print line \"]\" } END {print \" ] }\"}' ./predictions.tsv >> ./output ")
			out.commands.push("mv ./output "+sample_dir+"/PRED/"+model[0]+"_"+model[1]+".json")
			out.memory = data.process.mem;
			out.threads = data.process.cores;
			resolve(out);
		});
	 }
	 som(data){
		 return new Promise((resolve, reject)=>{
				let req= data.context.getKmerTable({request: data.parameters.which_features == "all",file_type : "matrix"});
			   	let out = { commands : [ ] , files : [] ,
			   			copy_files: [] , success : true, uid : data.uid, 
			   			errors : []}, matrix=[];
			   	req.on("data", (line)=>{
			   		matrix.push(line);
			   	});
			   	req.on("end", ()=>{
			   		out.files.push({name : "matrix.tsv", content : matrix.join("")});
			   		out.files.push({name : "info.json", content : JSON.stringify(data.parameters)+"\n" });
			   		let out_folder="${imoka_home}/experiments/"+data.parameters.matrix_uid+"/SOM/", timest= this.timestamp(), args = this.makeSOMargs(data);
			   		out.commands.push("singularity exec ${singularity_image} SOM.py ./matrix.tsv ./"+timest+" "+args);
			   		out.commands.push("rm -f ./matrix.tsv ./"+timest+"/*/*.pkl ./"+timest+"/*/*.npy ./"+timest+"/*/*.png " )
			   		out.commands.push("mkdir -p "+out_folder)
			   		out.commands.push("mv ./info.json "+out_folder+timest+".info.json ")
			   		out.commands.push("mv ./"+timest+" "+out_folder);
			   		out.memory = data.process.mem;
			   		out.threads = data.process.cores;
			   		resolve(out);
			   	})
			   	req.on("error", (err)=>{
			   		reject(error);
			   	})
			 });
	 }
	 
	 makeSOMargs(data){
		 let args=" -cs "+data.parameters.csize;
		 args+= " -i "+data.parameters.iterations;
		 args+= " -lr "+data.parameters.learn_rate;
		 args+= " -n "+data.parameters.nnsize;
		 args+= " -ct "+data.parameters.cftype;
		 args+= " -m "+ (data.parameters.norm ? "True" : "False");
		 return args;
	 }
	 random_forest(data){
		 return new Promise((resolve, reject)=>{
			let req= data.context.getKmerTable({request: data.parameters.which_features == "all",file_type : "matrix"});
		   	let out = { commands : [ ] , files : [] ,
		   			copy_files: [] , success : true, uid : data.uid, 
		   			errors : []}, matrix=[];
		   	req.on("data", (line)=>{
		   		matrix.push(line);
		   	});
		   	req.on("end", ()=>{
		   		out.files.push({name : "matrix.tsv", content : matrix.join("")});
		   		out.files.push({name : "info.json", content : JSON.stringify(data.parameters)+"\n" });
		   		let out_folder="${imoka_home}/experiments/"+data.parameters.matrix_uid+"/RF/", timest= this.timestamp(), args = this.makeRFargs(data);
		   		out.commands.push("singularity exec ${singularity_image} random_forest.py ./matrix.tsv ./"+timest+" "+args);
		   		out.commands.push("rm -f ./matrix.tsv")
		   		out.commands.push("mkdir -p "+out_folder)
		   		out.commands.push("mv ./info.json "+out_folder+timest+".info.json ")
		   		out.commands.push("mv ./"+timest+"* "+out_folder+"/ ")
		   		out.memory = data.process.mem;
		   		out.threads = data.process.cores;
		   		resolve(out);
		   	})
		   	req.on("error", (err)=>{
		   		reject(error);
		   	})
		 });
	 }
	 
	 makeRFargs(data){
		 let args=" -r "+data.parameters.rounds;
		 args+= " -m "+data.parameters.max_features;
		 args+= " -n "+data.parameters.n_trees;
		 args+= " -c "+data.parameters.cross_validation;
		 args+= " -p "+data.parameters.test_fraction;
		 args+= " -t "+data.process.cores;
		 return args;
	 }
	 
	 parseProcessRaw(raw_content){
		 let  content = raw_content.split("\n"), out= {samples : [] , errors : [] };
		 for (let i = 0 ; i < content.length ; i++){
			let line = content[i].split(/\s+/);
			if ( line.length == 3 ){
				let metadata = line[1].split(";"), sample = { name : line[0], source : line[2].split(";"), metadata : [] };
				metadata.forEach((met)=>{
					let mets = met.split(":");
					if ( mets.length == 2 ){
						if ( mets[1].length == 0 ) mets[1]="NA";
						sample.metadata.push({key :mets[0], value : mets[1] });
					}else {
						sample.metadata.push({key : "Group", value : met });
					}
				});
				out.samples.push(sample);
			} else {
				out.errors.push("Line "+i+" has "+line.length+" columns and will be ignored.");
			}
		 }
		 return out;
	 }
	 
	 preprocess(proc){
		 let out = { commands : [ ] , files : [] , copy_files: [] , success : true, uid : proc.uid, errors : []} ;
		 
		 let sources = this.parseProcessRaw(proc.source.raw_file);
		 if (sources.errors.length > 1 ){
			 out.errors = sources.errors;
		 }
		 let input_file ="";
		 sources.samples.forEach(sam=>{
			 input_file+=sam.name + "\t-\t"+sam.source.join(";")+"\n";
			 sam.k_len = proc.details.k_len;
			 sam.libType = proc.details.libraryType;
			 sam.minCount = proc.details.minCount;
			 out.files.push({name : sam.name+".metadata.json", content : JSON.stringify(sam)+"\n"})
			 out.commands.push("mkdir -p ${imoka_home}/samples/"+sam.name+"/ && rm -fr ${imoka_home}/samples/"+sam.name+"/* && cp ./"+sam.name+".metadata.json ${imoka_home}/samples/"+sam.name+"/" );
		 });
		 out.files.push({"name" : "preprocess_input.tsv", "content" : input_file });
		 let command = "singularity exec ${singularity_image} preprocess.sh -i preprocess_input.tsv " + 
		 	"-o ${imoka_home}/samples/ -k "+proc.details.k_len+" -l "+ proc.details.libraryType+ " -t ${threads} -r ${max_mem_gb} " +
		 	"-m "+ proc.details.minCount +" ";
		 if ( proc.details.keepRaw ) command+=" -K ";
		 if ( proc.details.fastqc ) command+=" -q  ";
		 out.commands.push(command);
		 out.memory = proc.process.mem;
		 out.threads = proc.process.cores;
		return out;
	 }
	 
	 reduce(proc){
		 let out = { commands : [ ] , files : [] , copy_files: [] , success : true, uid : proc.uid, errors : []} ,
		 
		  experiment = "${imoka_home}/experiments/" +  proc.matrix.uid +"/", param = proc.parameters;
		 let command = "singularity exec ${singularity_image} iMOKA_core reduce -i "+ experiment + "matrix.json -o " + experiment + "reduced.matrix "+
		 	" -a " + param.accuracy + " -t " + param.test + " -e " + param.entropyone + " -E " + param.entropytwo + " -c "+ param.crossvalidation + " -s " + param.crossvalidationsd +" -m "+param.min+ " " ;
		 out.commands.push(command);
		 out.memory = proc.process.mem ;  
		 out.threads = proc.process.cores;
		return out;
	 }
	 
	
	 
	 aggregate(proc){
		 let out = { commands : [ ] , files : [] , copy_files: [] , success : true, uid : proc.uid, errors : []} ,
		  experiment = "${imoka_home}/experiments/" +  proc.matrix.uid +"/", param = proc.parameters;
		 if ( ! proc.matrix.reduced ){
			 out.errors.push("Reduced matrix not found");
			 return out;
		 }
		 let mapper ="nomap";
		 
		 if ( param.mapper != -1 || param.mapper != "-1" ){
			 mapper="./mapper_configuration.json";
			 let mconf = {"aligner" : param.mapper}
			 if  ( param.annotation && param.annotation != -1 && param.annotation != "-1"){
				 mconf["annotation"]=param.annotation
			 } else {
				 out.files.push({"name" : "./tmp_ann.bed", "content" : ""} )
				 mconf["annotation"]={"file" : "./tmp_ann.bed", "name" : "nomap" }
			 }
			 out.files.push({"name" :mapper, "content" : JSON.stringify(mconf)+"\n" });
		 }
		 /// To add later : singularity exec ${singularity_image} 
		 let command = "singularity exec ${singularity_image} iMOKA_core aggregate -i "+ experiment + "reduced.matrix -o " + experiment + "aggregated -c "+experiment +"matrix.json " +
		 	" -t " + param.accuracy + " -T " + param.global_accuracy + " -w " + param.shift + " -d " + param.de_cov +
		 	" -m "+ mapper + " --corr " + param.corr +" " ;
		 out.commands.push(command);
		 out.commands.push("rm -f " + experiment + "aggregated.kmers.matrix "+experiment+"aggregated.tsv" )
		 out.memory = proc.process.mem; 
		 out.threads = proc.process.cores;
		return out;
	 }
}

module.exports = iMOKA;