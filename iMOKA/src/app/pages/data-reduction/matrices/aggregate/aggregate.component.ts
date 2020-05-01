import { Component, OnInit, Inject, NgZone } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Matrix } from '../../../../interfaces/samples';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { QueueService } from '../../../../services/queue.service';
import { Session, Setting } from '../../../../interfaces/session';
import { UemService } from '../../../../services/uem.service';

@Component({
	selector: 'app-aggregate',
	templateUrl: './aggregate.component.html',
	styleUrls: ['./aggregate.component.css']
})
export class AggregateComponent implements OnInit {
	detailsControl: FormGroup;
	procControl: FormGroup;
	error_message: string;
	loading_message: string;
	session: Session;
	mappers: any[] = [];
	annotations: any[] = [];

	constructor(public dialogRef: MatDialogRef<AggregateComponent>,
		@Inject(MAT_DIALOG_DATA) public matrix: Matrix,
		private queue: QueueService, private fb: FormBuilder, private zone: NgZone, private uem: UemService) {

	}

	ngOnInit() {
		if (this.uem.electron) {
			this.uem.getSession().subscribe(response => {
				this.zone.run(() => {
					console.log(response);
					this.session = response;
					let profile: Setting = this.session.profile.process_config.profiles[this.session.profile.process_config.current_profile];
					if (profile.mappers) {
						this.mappers = profile.mappers;
					}
					if (profile.annotations) {
						this.annotations = profile.annotations;
					}
					let cpus=4;
					if (typeof profile.max_cpu != "undefined") {
						cpus = profile.max_cpu;
					}
					this.procControl = this.fb.group({
						cores: [cpus-1, [Validators.min(1), Validators.max(cpus)]],
						mem: [32, [Validators.min(1), Validators.max(100)]],
					});
					this.detailsControl = this.fb.group({
						accuracy: [85, [Validators.min(0), Validators.max(100)]],
						global_accuracy: [70, [Validators.min(0), Validators.max(100)]],
						shift: [1, [Validators.min(1), Validators.max(5)]],
						de_cov: [50, [Validators.min(1), Validators.max(100)]],
						corr: [0.95, [Validators.min(0.5), Validators.max(1.00)]],
						mapper: [-1],
						annotation: [-1],
					});
				});
			});
		}

	}

	send() {
		this.loading_message = "Sending the process..."
		this.error_message = undefined;

		let data = { matrix: this.matrix, parameters: this.detailsControl.value, process: this.procControl.value };
		this.queue.sendJob({ name: "aggregate", data: data }).subscribe((resp) => {
			this.zone.run(() => {
				this.loading_message = resp.message
			});
		}, err => {
			this.zone.run(() => {
				if (typeof err == "string") {
					this.error_message = err
				} else if (err.message) {
					this.error_message = err.message
					if (err.error && err.error.stderr) {
						this.error_message += "\n" + err.error.stderr;
					}
				} else if (err.stderr) {
					this.error_message = err.stderr
				}
				this.loading_message = undefined;
			});
		}, () => {
			this.zone.run(() => { this.loading_message = "Job in queue. You can check the progress in your dashboard" });
			if (typeof this.error_message == "undefined") {
				setTimeout(() => {
					this.zone.run(() => {
						this.loading_message = undefined;
						this.close();
					});
				}, 2000);
			}

		});
	}

	isValid() {
		return this.procControl.valid && this.detailsControl.valid;
	}
	close() {
		this.dialogRef.close();
	}

}
