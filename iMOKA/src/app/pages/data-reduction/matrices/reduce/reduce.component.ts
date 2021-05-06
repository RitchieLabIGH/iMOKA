import { Component, OnInit, Inject, NgZone } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Matrix } from '../../../../interfaces/samples';
import { Setting } from '../../../../interfaces/session';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { QueueService } from '../../../../services/queue.service';
import { UemService } from '../../../../services/uem.service';

@Component({
	selector: 'app-reduce',
	templateUrl: './reduce.component.html',
	styleUrls: ['./reduce.component.css']
})
export class ReduceComponent implements OnInit {

	detailsControl: FormGroup;
	procControl: FormGroup;
	constructor(public dialogRef: MatDialogRef<ReduceComponent>,
		@Inject(MAT_DIALOG_DATA) public matrix: Matrix, private uem: UemService,
		private queue: QueueService, private fb: FormBuilder, private zone: NgZone) {

	}

	ngOnInit() {
		this.uem.getSession().subscribe((session) => {
			let profile: Setting = session.profile.process_config.profiles[session.profile.process_config.current_profile];
			let cpus = profile.max_cpu && profile.connection_type == "local" ? profile.max_cpu : 100;
			this.procControl = this.fb.group({
				cores: [cpus < 4 ? cpus : 4, [Validators.min(1), Validators.max(cpus)]],
				mem: [16, [Validators.min(1), Validators.max(100)]],
			});
			this.detailsControl = this.fb.group({
				accuracy: [65, [Validators.min(50), Validators.max(99)]],
				min: [5, Validators.min(0) ],
				test: [0.25, [Validators.min(0.05), Validators.max(0.50)]],
				crossvalidation: [100, [Validators.min(10), Validators.max(1000)]],
				crossvalidationsd: [0.5, [Validators.min(0.05), Validators.max(5)]],
				entropyone: [0.25, [Validators.min(0.05), Validators.max(1)]],
				entropytwo: [0.05, [Validators.min(0.005), Validators.max(1)]],
			});
		});
	}
	send() {

		let data = { matrix: this.matrix, parameters: this.detailsControl.value, process: this.procControl.value };
		this.queue.sendJob({ name: "reduce", data: data }).then(() => {
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
