import { Component, OnInit,  OnDestroy, NgZone } from '@angular/core';
import { FileService } from '../../services/file.service';
import { Matrix } from '../../interfaces/samples';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { InfoComponent, InfoData, InfoListElement } from '../../core/info/info.component';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { Session} from '../../interfaces/session';
import { UemService } from '../../services/uem.service';
import { Subscription } from 'rxjs';

@Component({
	selector: 'app-open-files',
	templateUrl: './open-files.component.html',
	styleUrls: ['./open-files.component.css'],
})



export class OpenFilesComponent implements OnInit, OnDestroy {
	constructor(private fileService: FileService,
		private zone: NgZone, private uem: UemService,
		private bottomSheet: MatBottomSheet,
		private _snackBar: MatSnackBar, public dialog: MatDialog) {

	};
	current_matrix: Matrix;
	session: Session;
	subscription: Subscription;
	status: any[];
	new_name:string;
	ngOnInit() {
		
		this.subscription = this.uem.getSession().subscribe((new_session) => {
			this.zone.run(() => {
				this.session = new_session;
				this.status = [];
				console.log(new_session);
				[{ tid: "kmers", des: "K-mer list" }, { tid: "importance", des: "Random Forest importance" }, { tid: "som", des: "Self Organizing Map" }].forEach((ft) => {
					let k = ft.tid, external=true;
					if (this.session.files[k]) {
						let name = this.session.files[k].file.split("/").pop();
						if (this.session.files[k].original_request && k == "kmers") {
							if ( this.session.matrices ){
								let omat = this.session.matrices.find((m) => { return m.uid == this.session.files[k].original_request });
								if (omat) {
									name = omat.name;
									external=false;
								}	
							}
						}
						this.status.push({ name: name, file: this.session.files[k].file, ftype: k, des: ft.des, external : external });
					} else {
						this.status.push({ ftype: k, des: ft.des });
					}
				})
			});
		});
		this.uem.updateSession();
	}

	ngOnDestroy() {
		this.subscription.unsubscribe();
	}
	
	saveExternal(){
		if ( this.new_name && this.new_name.length > 3){
			this.fileService.importKmerList({original_request : this.session.files.kmers.original_request, new_name : this.new_name}).then(()=>{
				this.toastMessage("File imported", "Done");
			}).catch((err)=>{
				this.toastMessage(err.message, "ERROR");
			})
		}
	}


	openExperiment(mat: Matrix) {
		this.zone.run(() => {
			this.current_matrix = mat;
			this.current_matrix.groups_count = [];
			this.current_matrix.groups_names.forEach((gn, idx) => {
				let count=0;
				if ( mat.imported ){
					this.current_matrix.groups.forEach((c)=> c==idx ? count=count+1 : count=count );
					this.current_matrix.groups_count.push({
						name: gn,
						full_name:  gn,
						count: count
					});
				} else {
					this.current_matrix.groups.forEach((c)=> c==gn ? count=count+1 : count=count );
					this.current_matrix.groups_count.push({
						name: gn,
						full_name: (this.current_matrix.groups_full_names ? this.current_matrix.groups_full_names[idx] : gn),
						count: count
					});	
				}
				
			});

		});
	}
	loadData(): Promise<any> {
		return new Promise<any>((resolve, reject) => {
			this.fileService.getFileName({ properties: ["openFile"], filters: [{ name: 'JSON', extension: ['json', 'JSON'] }] }).then((data_file) => {
				if (!data_file || data_file.canceled) {
					console.log("No file selected")
					this.toastMessage("No file selected", "Warning");
					return;
				} else {
					console.log("Sent request")
					this.openFile(data_file.filePaths[0]).then((resp) => {
						this.toastMessage(resp.message, "Done");
						resolve();
					}).catch((err) => {
						this.toastMessage(JSON.stringify(err), "ERROR");
						reject(err);
					})
				}
			});
		});
	}

	openFile(file: string): Promise<any> {
		return new Promise<any>((resolve, reject) => {
			this.fileService.load(file).then((resp) => {
				resolve(resp);
			}).catch((err) => {
				reject(err);
				
			});
		});
	}

	showInfoMatrix() {
		let data = new InfoData("Information for the matrix " + this.current_matrix.name);
		let infos = "<p><strong>UID </strong>: " + this.current_matrix.uid + "<br/>";
		if (this.current_matrix.group_tag_key) {
			infos += "<strong>Group tag:</strong> " + this.current_matrix.group_tag_key + "<br/>";
		}
		infos += "<strong>Groups: </strong><br/><ul>";
		this.current_matrix.groups_count.forEach(mg => {
			infos += "<li title='Full name: " + mg.full_name + "'>" + mg.name + " : " + mg.count + " samples (" + Math.round((mg.count * 100) / this.current_matrix.groups.length) + " % )";
		});
		infos += "</ul><br/>";
		data.information_list.push(new InfoListElement("General infos", undefined, infos));
		this.zone.run(() => {
			this.bottomSheet.open(InfoComponent, { data: data });
		});
	}

	closeFile(ftype: string) {
		this.fileService.closeData(ftype).then((message) => {
			console.log(message);
		});
	}
	toastMessage(message: string, title: string) {
		this._snackBar.open(message, title, { duration: 2000 })
	}

}