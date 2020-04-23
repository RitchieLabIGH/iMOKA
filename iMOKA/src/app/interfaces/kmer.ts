

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
	displayedColumns: string[];
	search: { value: string };
	order: { name: string, asc: boolean };
	subset: string[];
	bmu : number[];
	eventsFilter: string[];
	minCount: number;
	minPred: number;
	minFC: number;
	minPval: number;
	pageSize: number;
	pageIndex: number;
	draw: number;
	recordsTotal: number;
	recordsFiltered: number;
	stats: { genes: any[], events: any[] };
}