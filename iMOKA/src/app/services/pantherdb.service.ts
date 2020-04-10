import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
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

export interface PantherDBEnrichmentResult{
    id : string,
    name : string,
    geneID : string,
    pval : number,
    FDR : number
}



@Injectable({
  providedIn: 'root',
})
export class PantherDBService {
    private baseUrl = 'http://www.pantherdb.org/webservices/garuda/tools/enrichment/VER_2/enrichment.jsp?';  // URL to web api
    constructor(private http: HttpClient){}
    
    
    enrichmentAnalysis(options : PantherDBOptions ): Observable<PantherDBEnrichmentResult[]>  {
        console.log("enrichmentAnalysis");
		console.log("options");
        if ( options.type != PDBType.enrichment ){
            return new Observable(observer => {
                observer.error({message : "Given option type is not \"enrichment\""});
            });
        }
		var Options = {
		  responseType: 'text' as 'json'
		};

        const formData = new FormData();
	console.log(options.geneList.map(line => line+="\n"));
        let file = new File(options.geneList.map(line => line+="\n"), "gene_list.txt", {type : "application/octet-stream"});
        formData.append("geneList", file, file.name);
        formData.append("organism", options.organism);
        formData.append("type", options.type);
        formData.append("test_type", options.test_type);
        formData.append("correction", options.correction);
        formData.append("enrichmentType", options.enrichmentType);
        const httpOptions = { responseType: "text" as 'json' };
        return this.http.post<PantherDBEnrichmentResult[]>(this.baseUrl,formData, httpOptions ).pipe(map(this.enrichmentAnalysisDataMapper));
    }
    
    enrichmentAnalysisDataMapper(data : any) : PantherDBEnrichmentResult[]{
		
        //TODO parse the data output to fill the out object
        let out : PantherDBEnrichmentResult[]= [];
		data=data.split("\n");
		for(let iline=0;iline<data.length;iline++){
			let line=data[iline].split("\t");
			if (line.length>4 && line[0]!="Id" ){
				out.push(<PantherDBEnrichmentResult>{
			    id : line[0],
			    name : line[1],
			    geneID : line[2],
			    pval : Number(line[3]),
			    FDR : Number(line[4])
				})
			}
			
		}

        return out;
    }

    

}