

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