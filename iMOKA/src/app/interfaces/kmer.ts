

export interface Kmer {
    kmer : string;
    alignments : Alignment[];
    counts : number[];
    events : Event[];
    graph : string;
    means : number[];
    stdevs : number[];
    values : number[];
    fc : number[];
    importance : number;
    genes : string[];
    ev_types: string[];
}


export interface Alignment {
    chromosome :string;
    start : number;
    end : number;
    strand : string;
}


export interface Event {
    gene : string[];
    info : string;
    type : string;
}



export class KmerDataTableOptions {
	
	displayedColumns: string[]=['best_rank', 'kmer', 'position', 'genes', 'events'];
	search: { value: string }={ value: "" };
	order: { name: string, asc: boolean }={ name: 'best_rank', asc: true };
	subset: string[]=[];
	bmu : number[]=[];
	eventsFilter: string[]=[];
	filters : {
		minCount: number,
		minPred: number[],
		minFC: number[],
		minPval :number[],
		maxMap : number	
	} =  {
				minCount: 0,
				minPred : [],
				minFC: [],
				minPval : [],
				maxMap : 0
			};
	pageSize: number = 10;
	pageIndex: number = 0;
	draw: number= 0;
	recordsTotal: number = 0 ;
	recordsFiltered: number = 0 ;
	stats: { genes: any[], events: any[] } =  { genes: [], events: [] };
	constructor(n_of_groups){
		for (let k of ["minPred", "minFC"]){
			this.filters[k] = new Array(n_of_groups).fill(0);
		}
		this.filters.minPval=  new Array(n_of_groups).fill(1);
	}
}