import { Component, OnInit, Inject, NgZone } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Matrix } from '../../../interfaces/samples';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { QueueService } from '../../../services/queue.service';
import { Session, Setting } from '../../../interfaces/session';
import { UemService } from '../../../services/uem.service';

@Component({
	selector: 'app-aggregate',
	templateUrl: './aggregate.component.html',
	styleUrls: ['./aggregate.component.css']
})
export class AggregateComponent implements OnInit {
	detailsControl: FormGroup;
	procControl: FormGroup;
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
					this.session = response;
					let profile: Setting = this.session.profile.process_config.profiles[this.session.profile.process_config.current_profile];
					if (profile.mappers) {
						this.mappers = profile.mappers;
					}
					if (profile.annotations) {
						this.annotations = profile.annotations;
					}
					let cpus = profile.max_cpu && profile.connection_type == "local" ? profile.max_cpu : 100;
					this.procControl = this.fb.group({
						cores: [cpus < 4 ? cpus : 4, [Validators.min(1), Validators.max(cpus)]],
						mem: [32, [Validators.min(1), Validators.max(100)]],
					});
					this.detailsControl = this.fb.group({
						accuracy: [85, [Validators.min(0), Validators.max(100)]],
						global_accuracy: [70, [Validators.min(0), Validators.max(100)]],
						shift: [1, [Validators.min(1), Validators.max(5)]],
						de_cov: [50, [Validators.min(1), Validators.max(100)]],
						perfectMatch: [false],
						consistency : [2, [Validators.min(0.5), Validators.max(5)]],
						mapper: [-1],
						annotation: [-1],
					});
				});
			});
		}

	}

	send() {
		let data = { matrix: this.matrix, parameters: this.detailsControl.value, process: this.procControl.value };
		this.queue.sendJob({ name: "aggregate", data: data }).then(() => {
			setTimeout(() => {
					this.zone.run(() => {
						this.close();
					});
				}, 2000);
		});
	}

	isValid() {
		return this.procControl.valid && this.detailsControl.valid;
	}
	close() {
		this.dialogRef.close();
	}

}
