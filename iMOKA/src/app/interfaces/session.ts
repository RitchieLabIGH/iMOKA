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
    name : string="Default GMAP";
    command : string="gmap";
    flag_in :string=" ";
    flag_multi_thread : string="-t";
    flag_out : string=">";
    log_base : string="./gmap_log";
    options : string="-f samse -K 100000000 -d hg38 -D /gmap_ref/";
    output_type : string ="sam";
    parallel : number=  -1 ;
}

export class AnnotationConfiguration {
    name : string;
    file : string;
}
export class Setting {
    connection_type : string = "local";
    setting_name:string = "New setting";
    storage_folder : string= "~/iMOKA/";
	original_image : string = "https://sourceforge.net/projects/imoka/files/iMOKA_core/iMOKA";
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
}



