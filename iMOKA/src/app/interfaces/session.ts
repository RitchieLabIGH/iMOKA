import {Matrix} from './samples'

export class Session {
    profile :Profile;
    files : any;
    matrices : Matrix[];
}

export class Profile {
    name : string = "public" ;
    id : string;
    picture : string = "";
    process_config : {
       profiles : Setting[];
       current_profile : number;
    } = { profiles : [] ,  current_profile : -1};
}

export class MapConfiguration {
    name : string="Default Blat";
    command : string="blat";
    flag_in :string=" ";
    flag_multi_thread : string="";
    flag_out : string=" ";
	io_order : "io";
    options : string=" -out=pslx -stepSize=5 -repMatch=2253 -minScore=30 -minIdentity=90 /blat_ref/hg38.2bit ";
    output_type : string ="pslx";
    parallel : number=  -1 ;
}

export class AnnotationConfiguration {
    name : string = "Default Annotation";
    file : string = "/blat_ref/gencode.v29.annotation.noIR.gtf";
}
export class Setting {
    connection_type : string = "local";
    setting_name:string = "New setting";
    storage_folder : string= "~/iMOKA/";
	original_image : string;
	image_version : string;
	singularity_version:string;
	remote_image:boolean;
    username : string;
    password : string;
    cluster_type : string= "slurm";
    ssh_auth : string = "UsernamePassword";
    ssh_address : string;
    private_key : string="~/.ssh/id_rsa";
    module_load : string="";
    mappers : MapConfiguration[];
    annotations : AnnotationConfiguration[];
	os ? : string;
	max_cpu ? :number;
}


export class Message {
	constructor(message? : string){
		this.message=message;
	}
    error ? : any;
    code ? : number;
    message ?: any;
	type ? :string;
	action ?:string;
}



