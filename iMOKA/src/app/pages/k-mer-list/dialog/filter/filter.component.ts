import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
	selector: 'app-filter',
	templateUrl: './filter.component.html',
})
export class FilterComponent implements OnInit, OnDestroy {
	dtOptions : any;
	groups : string[];
	constructor( protected ref: MatDialogRef<FilterComponent>, @Inject(MAT_DIALOG_DATA) public inData: any) {
		this.dtOptions = JSON.parse(JSON.stringify(inData.dtOptions));
		this.groups = inData.groups;
	}

	ngOnInit() {
		
	}
	ngOnDestroy() {

	}
	 submit() {
        this.ref.close( this.dtOptions );
    }
}
