import { Component, OnInit, NgZone } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { QueueService } from '../../../../services/queue.service';
import { Session, Setting } from '../../../../interfaces/session';
import { UemService } from '../../../../services/uem.service';
import {Subscription} from'rxjs';
import {COMMA, ENTER} from '@angular/cdk/keycodes';

@Component({
	selector: 'app-new-som',
	templateUrl: './new-som.component.html',
})
export class NewSomComponent implements OnInit {
	mainParam: FormGroup;
	procControl: FormGroup;
	error_message: string;
	loading_message: string;
	session: Session;
	mappers: any[] = [];
	annotations: any[] = [];
	subscription : Subscription;
	cftypes : {name : string, des : string}[] = [
		{name : "MLP", des : "Multiple layer perceptron"},
		{name : "linSVC", des : "Linear Support Vector Classifier"},
		{name : "ADA", des : "AdaBoost classifier"},
		{name : "SDG", des : "SDG classifier"},
		{name : "KNEIG", des : "k neighbors classifier"},
		{name : "SVMfourier", des : "SVM fourier"},
		{name : "SVMnystro", des : "SVM nystro"},
		] 
	readonly separatorKeysCodes: number[] = [ENTER, COMMA];
	
	
	constructor(public dialogRef: MatDialogRef<NewSomComponent>,
		private queue: QueueService, private fb: FormBuilder, private zone: NgZone,
		private uem: UemService) {

	}

	ngOnInit() {
		if (this.uem.electron) {
			this.subscription=this.uem.getSession().subscribe(response => {
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
					let cpus = 8, max_cpus=1000;
					if (typeof profile.max_cpu != "undefined"){
						cpus=profile.max_cpu-1;
						max_cpus=profile.max_cpu;
					} 
					this.procControl = this.fb.group({
						cores: [cpus, [Validators.min(1), Validators.max(max_cpus)]],
						mem: [32, [Validators.min(1), Validators.max(100)]],
					});
					this.mainParam = this.fb.group({
						description : [],
						which_features: ["all"],
						cftype : ["MLP"],
						iterations: [1000, [Validators.min(100), Validators.max(1000000)]],
						learn_rate: [0.1, [Validators.min(0.01)]],
						csize : ["2,4", [Validators.pattern("^[0-9]+(,[0-9]+)*$")]],
						nnsize : ["10", [Validators.pattern("^[0-9]+(,[0-9]+)*$")]],
						norm :[true]
					});
				});
			});
		}
	}
	
	send() {
		this.loading_message = "Sending the process..."
		this.error_message = undefined;
		let data = { parameters: this.mainParam.value, process: this.procControl.value }, mat = this.session.matrices.find((mat) => {
			return mat.uid == this.session.files.kmers.original_request;
		});
		if (mat) {
			data.parameters.matrix_uid = mat.uid;
			data.parameters.matrix_name = mat.name;
		} else {
			data.parameters.matrix_uid = "external_file";
			data.parameters.matrix_name = this.session.files.kmers.original_request;
		}
		this.queue.sendJob({ name: "som", data: data }).subscribe((resp) => {
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
			setTimeout(() => {
					this.zone.run(() => {
						this.loading_message = undefined;
						this.close();
					});
			}, 2000);

		});
	}

	isValid() {
		return this.procControl.valid && this.mainParam.valid;
	}
	close() {
		this.subscription.unsubscribe();
		this.dialogRef.close();
	}

}
