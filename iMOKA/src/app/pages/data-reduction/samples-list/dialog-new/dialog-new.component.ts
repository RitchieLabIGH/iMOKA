import { Component, OnInit, NgZone, ViewChild } from '@angular/core';
import { QueueService } from '../../../../services/queue.service';
import { UemService } from '../../../../services/uem.service';
import { Session } from '../../../../interfaces/session';
import { MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';

@Component({
	selector: 'app-dialog-new',
	templateUrl: './dialog-new.component.html',
	styleUrls: ['./dialog-new.component.css']
})

export class DialogNewComponent implements OnInit {
	@ViewChild('stepper', { static: false }) stepper: MatStepper;
	session: Session;
	tsvControl: FormGroup;
	detailsControl: FormGroup;
	procControl: FormGroup;

	constructor(private queue: QueueService, private uem: UemService, private zone: NgZone, public dialogRef: MatDialogRef<DialogNewComponent>, private fb: FormBuilder) {
		this.tsvControl = this.fb.group({
			raw_file: ['ERR2407636	chemorefractory	ERR2407636', [Validators.pattern(/^([A-Za-z0-9_-]+\s+([^\s;:]+:?[^\s;:]*[;]?)+\s+[^\s]+[\n]?)+$/), Validators.required]],
		});
		this.detailsControl = this.fb.group({
			k_len: [31, [Validators.min(4), Validators.max(150)]],
			minCount: [5, [Validators.min(0), Validators.max(10000)]],
			libraryType: ["NULL"],
			fastqc: [true],
			keepRaw: [false]
		});
		this.procControl = this.fb.group({
			cores: [2, [Validators.min(1), Validators.max(20)]],
			mem: [8, [Validators.min(2), Validators.max(100)]],
			njobs: [1, [Validators.min(1), Validators.max(1000)]]
		});

	}
	isValid() {

		return this.tsvControl.valid && this.detailsControl.valid && this.procControl.valid && this.getIndex() > 0;
	}

	getIndex() {
		return this.stepper ? this.stepper.selectedIndex : -1
	}

	ngOnInit() {
		this.uem.getSession().subscribe(session => {
			this.session = session;
		});

	}

	close() {
		this.dialogRef.close();
	}

	send() {
		let data = { source: this.tsvControl.value, details: this.detailsControl.value, process: this.procControl.value };
		this.queue.sendJob({ name: "preprocess", data: data }).then(() => {
				setTimeout(() => {
					this.zone.run(() => {
						this.close();
					});
				}, 2000);
			});

	}


}
