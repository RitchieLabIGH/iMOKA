import { Component, Input , Inject, OnInit} from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {ExternalTrack} from '../../../../services/tracks.service';
import {FileService} from '../../../../services/file.service';

@Component({
  selector: 'app-open-track',
  templateUrl: "./open-track.component.html",
  styleUrls: ['./open-track.component.css']
})




export class OpenTrackComponent implements OnInit {

    constructor( protected ref: MatDialogRef<OpenTrackComponent>, 
            @Inject(MAT_DIALOG_DATA) public data: {tracks : ExternalTrack[]} , public fs:FileService) { }

    ngOnInit(): void {
        this.track = new ExternalTrack();
    }
	track :ExternalTrack; 
	local: boolean = false;
	allFormats  = {
		"annotation" : [
			"bed","gff3","gtf",	"genePred",	"genePredExt","peaks","narrowPeak",
			"broadPeak","bigBed","bedpe", "refgene"
			],
		"alignment" : ["bam", "cram"],
		"wig" : ["wig", "bigWig", "bedGraph" ],
		"variant" : ["vcf"],
		"seg" : ["seg"],
		"spliceJunctions" : ["bed"],
		"gwas" : ["gwas", "bed"],
		"interaction" : ["bedpe"],
		
	};
	
	get formats(){
		let v = this.track.type;
		if ( v && this.allFormats[v] ){
			return this.allFormats[v];
		} else {
			return [];	
		}
		
	}
    submit() {
        this.ref.close( this.track );
    }

	addFile(type:string){
		this.fs.getFileName({}).then((res)=>{
			if ( ! res.canceled && res.filePaths.length == 1 ){
				this.track[type]="serve://"+res.filePaths[0]
			}
		});
	}
	fileName(type:string){
		return this.track[type].split("/").pop();
	}
	isOk(){
		return this.track.path && this.track.name;
	}

}
