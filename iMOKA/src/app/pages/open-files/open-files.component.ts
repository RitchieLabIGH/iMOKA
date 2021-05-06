import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { FileService } from '../../services/file.service';
import { Matrix } from '../../interfaces/samples';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { InfoComponent, InfoData, InfoListElement } from '../../core/info/info.component';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { Session } from '../../interfaces/session';
import { UemService } from '../../services/uem.service';
import {SamplesService} from '../../services/samples.service';
import { Subscription } from 'rxjs';

@Component({
	selector: 'app-open-files',
	templateUrl: './open-files.component.html',
	styleUrls: ['./open-files.component.css'],
})



export class OpenFilesComponent implements OnInit, OnDestroy {
	constructor(private fileService: FileService,
		private zone: NgZone, private uem: UemService,
		private bottomSheet: MatBottomSheet, private sampleService : SamplesService,
		private _snackBar: MatSnackBar, public dialog: MatDialog) {

	};
	current_matrix: Matrix;
	session: Session;
	subscription: Subscription;
	status: any[];
	new_name: string;
	confirm_delete : any;
	loading: boolean;
	ngOnInit() {
		this.subscription = this.uem.getSession().subscribe((new_session) => {
			if (!this.loading) {
				this.loading = true
				if (new_session.matrices) new_session.matrices.sort((mata, matb) => { return mata.name < matb.name ? -1 : 1 });
				this.session = new_session;
				this.status = [];
				[{ tid: "kmers", des: "K-mer list" }, { tid: "importance", des: "Random Forest importance" }, { tid: "som", des: "Self Organizing Map" }].forEach((ft) => {
					let k = ft.tid, external = true;
					if (this.session.files[k]) {
						let name = this.session.files[k].file.split("/").pop();
						if (this.session.files[k].original_request && k == "kmers") {
							if (this.session.matrices) {
								let omat = this.session.matrices.find((m) => { return m.uid == this.session.files[k].original_request });
								if (omat) {
									name = omat.name;
									external = false;
									if ( ! this.current_matrix ){
										this.openExperiment(omat);	
									}
								}
							}
						}
						this.status.push({ name: name, file: this.session.files[k].file, ftype: k, des: ft.des, external: external });
					} else {
						this.status.push({ ftype: k, des: ft.des });
					}
				})
				let m_id= this.current_matrix ? this.session.matrices.findIndex((mat)=> {return mat.uid == this.current_matrix.uid}) : -1;
				if ( m_id  ==-1){
					this.current_matrix=undefined;
				} else {
					this.openExperiment(this.session.matrices[m_id]);
				}
				if ( ! this.current_matrix &&  this.session.matrices.length > 0 ){
					this.openExperiment(this.session.matrices[0]);
				}
				this.loading = false;
			}
		});
	}

	ngOnDestroy() {
		this.subscription.unsubscribe();
	}

	saveExternal() {
		if (this.new_name && this.new_name.length >= 3) {
			this.fileService.importKmerList({ original_request: this.session.files.kmers.original_request, new_name: this.new_name }).then(() => {
				this.toastMessage("File imported", "Done");
			}).catch((err) => {
				this.toastMessage(err.message, "ERROR");
			})
		}
	}


	openExperiment(mat: Matrix) {
		this.zone.run(() => {
			this.current_matrix = mat;
			this.current_matrix.groups_count = [];
			this.current_matrix.groups_names.forEach((gn, idx) => {
				let count = 0;
				this.current_matrix.groups.forEach((c) => c == gn ? count = count + 1 : count = count);
				this.current_matrix.groups_count.push({
					name: gn,
					full_name: gn,
					count: count
				});
			});
		});
	}
	loadData(): Promise<any> {
		return new Promise<any>((resolve, reject) => {
			this.fileService.getFileName({ properties: ["openFile"], filters: [{ name: 'JSON', extension: ['json', 'JSON'] }] }).then((data_file) => {
				if (!data_file || data_file.canceled) {
					this.toastMessage("No file selected", "Warning");
					return;
				} else {
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
		});
	}
	toastMessage(message: string, title: string) {
		this._snackBar.open(message, title, { duration: 2000 })
	}
	
	delete(what : string){
      if ( this.confirm_delete == what){
          this.sampleService.deleteMatrix(what).then((res)=>{
              this.toastMessage(res.message, "SUCCESS");
			  this.refresh();
              this.confirm_delete=undefined;
          }).catch((err)=>{
              this.toastMessage(err.message, "ERROR");
          });
      } else {
          this.confirm_delete=what;
          this.toastMessage("You are going to delete this experiment and all \
			the associated files. If you are sure, click delete again.", "WARNING");
      }
      
  }
	
	refresh(){
		this.uem.refreshSession();
	}
	
	import(){
		this.fileService.getFileName({title : "Select the zip file",properties : ['openFile'] , filters : [{name : "Compressed file" , extensions : ["zip"]}]  }).then((data_file)=>{
			if (!data_file || data_file.canceled || data_file.filePaths.length != 1) {
					this.toastMessage("Choose a file.", "Warning");
					return;
				} else {
					this.fileService.importExperiment(data_file.filePaths[0]).then((resp: any) => {
						if (resp.code == 0 ){
							this.refresh();
							let data = new InfoData("Experiment " +resp.message.name + " imported.");
							resp.message.messages.forEach((mex)=>{
								data.information_list.push(new InfoListElement(mex.title, mex.description, mex.message));	
							})
							this.zone.run(() => {
								this.bottomSheet.open(InfoComponent, { data: data });
							});
						} else {
							this.toastMessage(resp.message, "Error!" );
						}
					});
				}
		})
	}
	
	export(){
		let data = new InfoData("Export the experiment " + this.current_matrix.name);
		let export_exp = function(args: any) {
			args.that.fileService.getFileName({ title: "Save the experiment in this directory as "+ args.that.current_matrix.uid+".zip",buttonLabel : "Select", properties : ["createDirectory", "openDirectory"]  }).then((data_file:  any) => {
				if (!data_file || data_file.canceled || data_file.filePaths.length != 1) {
					args.that.toastMessage("Choose a directory with the Select button.", "Warning");
					return;
				} else {
					args.that.fileService.exportExperiment(args.uid, data_file.filePaths[0], args.with_samples).then((resp: any) => {
					});
				}
			});
		}
		data.information_list.push(new InfoListElement("Export only the results", undefined, export_exp, { with_samples : false, uid: this.current_matrix.uid, that: this, title: "Export" ,description:"Export the folder containing all the experiments, but not the samples. It can be imported in another environment using the dedicated button. The file name will be: "+ this.current_matrix.uid+".zip"  }));
		if (! this.current_matrix.imported){
			data.information_list.push(new InfoListElement("Export the results and the samples", undefined, export_exp, { with_samples : true, uid: this.current_matrix.uid, that: this, title: "Export" ,description:"Export the folder containing all the experiments and the samples. It can be imported in another environment using the dedicated button. The file name will be: "+ this.current_matrix.uid+".zip" }));	
		}
		this.zone.run(() => {
			this.bottomSheet.open(InfoComponent, { data: data });
		});	
	}

}