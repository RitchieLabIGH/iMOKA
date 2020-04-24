import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';
import { map } from 'rxjs/operators/map';


export enum PDBOrganism { /// TODO : add other organisms
    HUM = "Homo sapiens",
}
export enum PDBType {
    enrichment = "enrichment"
}
export enum PDBTestType {
    FISHER = "FISHER",
    BINOMIAL = "BINOMIAL"
}

export enum PDBEnrichmentType {
    function="function", 
    process="process_testvalue", 
    cellular_location="cellular_location", 
    protein_class="protein_class", 
    pathway="pathway", 
    fullGO_function="fullGO_function", 
    fullGO_process="fullGO_process", 
    fullGO_component="fullGO_component", 
    reactome="reactome"
}
export enum PDBCorrection {
    FDR = "FDR",
    BONFERRONI = "BONFERRONI",
    NONE = "NONE"
}


export interface PantherDBOptions {
    organism? : PDBOrganism,
    type : PDBType,
    test_type? : PDBTestType,
    correction? : PDBCorrection,
    enrichmentType? : PDBEnrichmentType,
    geneList? : string[],
}

export class PatherDataRow{
    id : string;
    name : string;
    genes : string[];
    pval : number;
    fdr?: number;
}



@Injectable({
  providedIn: 'root',
})
export class PantherDBService {
    private baseUrl = 'http://www.pantherdb.org/webservices/garuda/tools/enrichment/VER_2/enrichment.jsp?';  // URL to web api
    constructor(private http: HttpClient){}
    
    enrichmentAnalysis(options : PantherDBOptions ): Promise<PatherDataRow[]>  {
        if ( options.type != PDBType.enrichment ){
            return new Promise((resolve, reject) => {
                reject({message : "Given option type is not \"enrichment\""});
            });
        }
        const formData = new FormData();
        let file = new File(options.geneList.map(line => line+="\n"), "gene_list.txt", {type : "application/octet-stream"});
        formData.append("geneList", file, file.name);
        formData.append("organism", options.organism);
        formData.append("type", options.type);
        formData.append("test_type", options.test_type);
        formData.append("correction", options.correction);
        formData.append("enrichmentType", options.enrichmentType);
        const httpOptions = { responseType: "text" as 'json' };
        return this.http.post<PatherDataRow[]>(this.baseUrl,formData, httpOptions ).pipe(map(this.enrichmentAnalysisDataMapper)).toPromise();
    }
    
    enrichmentAnalysisDataMapper(data : any) : PatherDataRow[]{
        let out : PatherDataRow[]= [];
		data.split("\n").forEach((line_s : string)=>{
			if ( line_s.match(/^GO/) ){
				let line = line_s.split("\t")
				if ( out.length > 0 && out[out.length-1].id == line[0]){
					out[out.length-1].genes.push(line[2])
				} else {
					out.push({genes:[line[2]], id:line[0], name : line[1], pval: Number(line[3]) })
					if ( line.length == 5 ){
						out[out.length-1].fdr = Number(line[4])
					}
				}
			}
		});
        return out;
    }

    

}