
export class Sample {
    rawData : string;
    fastqc : string;
    count_file : string;
    tags : string[];
    metadata : Metadata[];
    k_len: number;
    name : string;
    id : string;
    profile_id : string;
    prefix_size : number;
    total_count : number;
    total_suffix : number;
    total_predix : number;
    min_counts : number;
    library_type : string;
}

export class Metadata {
    key : string;
    value : string;
}

export class Matrix {
    count_files ? : string[] = [];
    groups ? : string[] | number[]=[];
    groups_names ? : string[]=[];
    groups_full_names ? : string[]=[];
    groups_count ? : any;
    group_tag_key ? : string;
    names ? : string[]=[];
    k_len : number;
    rescale_factor ? : number = 1e9;
    total_counts ? : number[] = [];
    name : string;
    uid : string;
    reduced ? : any;
    aggregated ? : any;
    isOpen : boolean;
    models : any[];
    som : any[];
	imported : boolean=false;
    stats ? : any[];
}
