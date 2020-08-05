import { Component, Inject } from '@angular/core';
import {MAT_BOTTOM_SHEET_DATA, MatBottomSheet, MatBottomSheetRef} from '@angular/material/bottom-sheet';


export class InfoData {
    constructor( public title : string, 
    public information_list : InfoListElement[]=[]){};
	summary : string;
}

export class InfoListElement {
    constructor(public title? : string, public subtitle? :string,public content? : any, public args? : any){};
}

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.css']
})
export class InfoComponent {

  constructor(@Inject(MAT_BOTTOM_SHEET_DATA) public data: InfoData) { 
      
  }

}

@Component({
  selector: 'app-job-info',
  templateUrl: './job-info.component.html',
  styleUrls: ['./info.component.css']
})
export class JobInfo {
	
}