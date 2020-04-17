import { Component, OnInit, NgZone } from '@angular/core';
import { UemService } from '../../../services/uem.service';
import {FileService} from '../../../services/file.service';
import { Session, Setting, Profile } from '../../../interfaces/session';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
	selector: 'master-setup',
	templateUrl: './master_setup.component.html',
	styleUrls: ['./master_setup.component.css']
})
export class MasterSetupComponent implements OnInit {
	session: Session;
	setting: Setting = new Setting();
	mainParam : FormGroup;
	remoteParam : FormGroup;
	loading: boolean = true;
	modify: boolean = true;
	err_message: string;
	loading_message: string;
	current_profile: number = 0;
	constructor(private uem: UemService, private fb: FormBuilder,private zone: NgZone, private snack: MatSnackBar, private fs : FileService) { }
	ngOnInit() {
		if (this.uem.electron) {
			this.uem.getSession().subscribe(response => {
				this.zone.run(() => {
					console.log(response);
					this.session = response;
					if (typeof this.session.profile.process_config.current_profile != "undefined" && this.session.profile.process_config.profiles.length > 0) {
						this.current_profile = this.session.profile.process_config.current_profile;
						this.setProfile(this.current_profile);
						this.modify = false;
					} 
					this.loading = false;
					this.updateParam();
				});
			});
		} else {
			this.session = new Session();
			this.session.profile = new Profile();
			this.loading = false;
			this.modify = true;
			this.updateParam();
		}
	}
	remove() {
		console.log("TODO")
	}
	selectFolder(){
		this.fs.getFileName({title : "Select an empty folder for your local iMOKA directory", properties : ["createDirectory", 'openDirectory'], buttonLabel :"Select" }).then((res)=>{
			if ( ! res.canceled && res.filePaths.length == 1 ) {
				this.mainParam.controls.storage_folder.setValue(res.filePaths[0]);
			}
		}).catch((err)=>{
			console.log(err)
		})
	}
	
	setSingularityImage(){
		this.zone.run(()=>{
			this.mainParam.controls.original_image.setValue('https://github.com/RitchieLabIGH/iMOKA/releases/download/v1.0/iMOKA');
		});
	}
	
	setExtSingularityImage(){
		this.zone.run(()=>{
			this.mainParam.controls.original_image.setValue('https://github.com/RitchieLabIGH/iMOKA/releases/download/v1.0/iMOKA_extended');	
		});
	}
	save(event?: any) {
		this.loading = true;
		this.err_message = undefined;
		this.loading_message = "Checking your profile";
		let tosend = { profile_number: this.current_profile, profile: undefined };
		if (this.modify) {
			this.updateSetting();
			tosend.profile = this.setting;
		}
		this.uem.saveProfile(tosend).subscribe(
			result => {
				this.zone.run(() => {
					this.loading_message = result.message;
				});
			},
			error => {
				this.zone.run(() => {
					if (typeof error == "string") {
						this.err_message = error;
					} else {
						this.err_message = JSON.stringify(error);
					}

				});
			}, () => {
				this.zone.run(() => {
					this.loading = false;
					this.modify = false;
					this.setProfile();
				});
			}
		);
		if (event) {
			return false
		};
	}

	clear(new_setting: boolean = false) {
		if (new_setting) {
			this.current_profile = this.session.profile.process_config.profiles.length;
			this.modify = true;
		}
		this.setting = new Setting();
		this.updateParam();
	}
	
	updateSetting(){
		Object.keys(this.mainParam.value).forEach((k)=>{
			this.setting[k]=this.mainParam.value[k]
		});
		Object.keys(this.remoteParam.value).forEach((k)=>{
			this.setting[k]=this.remoteParam.value[k]
		});
	}
	updateParam(){
		this.mainParam = this.fb.group({
			setting_name : [this.setting.setting_name, Validators.required],
			connection_type : [this.setting.connection_type, Validators.required],
			storage_folder : [this.setting.storage_folder, Validators.required],
			original_image : [this.setting.original_image, Validators.required],
			
		})
		this.remoteParam = this.fb.group({
			ssh_address :[this.setting.ssh_address , Validators.required ],
			ssh_auth : [this.setting.ssh_auth, Validators.required],
			username : [this.setting.username],
			password : [],
			private_key : [this.setting.private_key],
			cluster_type : [this.setting.cluster_type],
			module_load : [this.setting.module_load]
			
		})
	}

	setProfile(n?: number) {
		if (typeof n == 'undefined') {
			n = this.session.profile.process_config.current_profile;
		}
		this.current_profile = n;
		this.setting = JSON.parse(JSON.stringify(this.session.profile.process_config.profiles[n]));
		this.updateParam();
		this.modify = false;
	}
	isValid(){
		if ( this.mainParam.value.connection_type == 'local'){
			return this.mainParam.valid;	
		} else {
			return this.mainParam.valid && this.remoteParam.valid;
		}
		
	}
}
