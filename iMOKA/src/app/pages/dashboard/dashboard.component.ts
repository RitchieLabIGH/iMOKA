import { Component, OnInit, NgZone, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { UemService } from '../../services/uem.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Session } from '../../interfaces/session';
import { Matrix } from '../../interfaces/samples';
import { Subscription, timer } from 'rxjs';
import { QueueSource } from '../../data/queue.source';
import { QueueService } from '../../services/queue.service';
import { InfoComponent, InfoData, InfoListElement } from '../../core/info/info.component';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';

@Component({
	selector: 'app-dashboard',
	templateUrl: './dashboard.component.html',
	styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
	session: Session;
	sub_session: Subscription;
	error: string;
	current_matrix: Matrix;
	main_plot : boolean=true;
	plots: { matrices?: { layout: any, data: any }, matrix?: { layout: any, data: any } } = {};
	constructor(private uem: UemService, private zone: NgZone,
		private sb: MatSnackBar,  private cd: ChangeDetectorRef
		, private bottomSheet: MatBottomSheet, public dialog: MatDialog
	) { }
	ngOnInit() {
		this.sub_session = this.uem.getSession().subscribe(session => {
			
				this.session = session;
				if (this.session && this.session.matrices && this.session.matrices.length > 0) {
					let mats = {
						data: [{ values: [], labels: [], type: 'pie' }], layout: {
							title: "Samples per matrix in your Workspace", 
							margin : {l : 0 , r : 0 , b : 0 , t : 30},
							height : 230,
							legend: {"orientation": "h"}
						}
					}
					this.session.matrices.forEach((mat) => {
						mats.data[0].values.push(mat.groups.length)
						mats.data[0].labels.push(mat.name)
					})
					this.current_matrix = this.session.matrices[0];
					this.updateCurrentMatrix();
					setTimeout(()=>{
						this.zone.run(() => {
							this.plots.matrices=mats;
						});		
					}, 500)
				}

		}, err => {
			console.log(err);
		});
	}
	selectMatrix(event?: any) {
		if (event && event.points && event.points.length == 1) {
			this.current_matrix = this.session.matrices.find((m) => { return m.name == event.points[0].label; })
			this.zone.run(()=>{
				this.main_plot=false;
			})
			this.updateCurrentMatrix();
		} else {
			this.main_plot=true;
		}
	}
	updateCurrentMatrix() {
		let mat = this.current_matrix;
		let mats = {
			data: [{ values: [], labels: mat.groups_names, type: 'pie' }], layout: {
				title: "Matrix " + mat.name + (mat.group_tag_key ? " (" + mat.group_tag_key + ")" : ""),
				margin : {l : 0 , r : 0 , b : 0 , t : 30},
				height : 230,
				legend: {"orientation": "h"}
			}
		}
		mat.groups_names.forEach((n, i) => {
			let count = 0;
			mat.groups.forEach((g) => {
				if (g == n) count += 1;
			})
			mats.data[0].values.push(count)
		})
		this.zone.run(() => {
			this.plots.matrix=mats;
		})

	}

	ngOnDestroy() {
		if (this.sub_session) this.sub_session.unsubscribe();
	}
	
	sbMessage({ title, message, opts }: { title: any; message: any; opts: any; }) {
		this.zone.run(() => {
			this.sb.open(title, message, opts);
		})
	}

}
