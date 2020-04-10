import { Component, OnInit, NgZone } from '@angular/core';
import { UemService } from '../../../services/uem.service';
import { Session, Setting, Profile } from '../../../interfaces/session';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
	selector: 'master-setup',
	templateUrl: './master_setup.component.html',
	styleUrls: ['./master_setup.component.css']
})
export class MasterSetupComponent implements OnInit {
	session: Session;
	setting: Setting = new Setting();
	loading: boolean = true;
	modify: boolean = true;
	err_message: string;
	loading_message: string;
	current_profile: number = 0;
	constructor(private uem: UemService, private zone: NgZone, private snack: MatSnackBar) { }
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
				});
			});
		} else {
			this.session = new Session();
			this.session.profile = new Profile();
			this.loading = false;
			this.modify = true;
		}
	}
	remove() {

	}

	save(event?: any) {
		console.log(event);
		this.loading = true;
		this.err_message = undefined;
		this.loading_message = "Checking your profile";
		let tosend = { profile_number: this.current_profile, profile: undefined };
		if (this.modify) {
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
	}

	setProfile(n?: number) {
		if (typeof n == 'undefined') {
			n = this.session.profile.process_config.current_profile;
		}
		this.current_profile = n;
		this.setting = JSON.parse(JSON.stringify(this.session.profile.process_config.profiles[n]));
		this.modify = false;
	}

}
