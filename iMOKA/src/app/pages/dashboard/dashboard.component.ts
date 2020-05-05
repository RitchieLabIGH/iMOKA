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
	sub_queue: Subscription;
	sub_session: Subscription;
	queue_types = ["running", "jobs", "completed"];
	dtOptions: any = this.initDtOptions();
	dataSource: QueueSource;
	refreshTime: number = -1;
	refreshRequest: Subscription;
	error: string;
	current_matrix: Matrix;
	revisions : {matrix : number} = {matrix : 0};
	plots: { matrices?: { layout: any, data: any }, matrix?: { layout: any, data: any } } = {};

	constructor(private uem: UemService, private zone: NgZone,
		private sb: MatSnackBar, private queueService: QueueService, private cd: ChangeDetectorRef
		, private bottomSheet: MatBottomSheet, public dialog: MatDialog
	) { }
	ngOnInit() {
		this.sub_session = this.uem.getSession().subscribe(observer => {
			this.zone.run(() => {
				this.session = observer;
				if (this.session && this.session.matrices && this.session.matrices.length > 0) {
					this.plots.matrices = { data: [{ values: [], labels: [], type: 'pie' }], layout: {
						 title: "Samples per matrix in your Workspace", height: 350 ,
					legend: {
   						 x: 1,
    					xanchor: 'right',
    					y: 1
  					} } }
					this.session.matrices.forEach((mat) => {
						this.plots.matrices.data[0].values.push(mat.groups.length)
						this.plots.matrices.data[0].labels.push(mat.name)
					})
					this.current_matrix = this.session.matrices[0];
					this.updateCurrentMatrix();
				}
				if (!this.dataSource && this.session && this.session.profile.process_config.profiles.length > 0) {
					this.dataSource = new QueueSource(this.queueService);
					this.dataSource.onRefresh = () => {
						this.zone.run(() => { this.cd.markForCheck() });
						return;
					};
					setTimeout(() => { this.refreshTable() }, 1000);
				}

			});
		}, err => {
			console.log(err);
		});
	}
	selectMatrix(event: any) {
		if (event.points && event.points.length == 1) {
			this.current_matrix = this.session.matrices.find((m) => { return m.name == event.points[0].label; })
			this.updateCurrentMatrix();
		}
	}
	updateCurrentMatrix() {
		let mat = this.current_matrix;
		this.plots.matrix = { data: [{ values: [], labels: mat.groups_names, type: 'pie' }], layout: {
			 title: "Matrix " + mat.name + (mat.group_tag_key ? " ("+mat.group_tag_key+")" : ""), height: 350 ,
		legend: {
   						 x: 1,
    					xanchor: 'right',
    					y: 1	
  					}
		} }
		mat.groups_names.forEach((n, i) => {
			let count = 0;
			mat.groups.forEach((g)=>{
				if ( g == n ) count+=1;
			})
			this.plots.matrix.data[0].values.push(count)
		})
		this.zone.run(()=>{
			this.revisions.matrix+=1;
			console.log(this.revisions)	
		})
		
	}
	updateRefresh() {
		if (this.refreshRequest) this.refreshRequest.unsubscribe();
		if (this.refreshTime > 0) {
			this.refreshRequest = timer(0, this.refreshTime).subscribe(() => {
				this.zone.run(() => { this.refreshTable(); })
			});
		} else {
			this.zone.run(() => { this.refreshTable(); })
		}
	}

	ngOnDestroy() {
		if (this.sub_session) this.sub_session.unsubscribe();
		if (this.refreshRequest) this.refreshRequest.unsubscribe();

	}
	jobInfo(job: any) {
		let data = new InfoData("Job " + job.job.original_request.name + " informations");
		let times = new InfoListElement("Times");
		let time = new Date(job.times.added);
		times.content = "<ul><li><strong>Added:</strong>" + time.toLocaleDateString('en-EN') + "</li>";
		if (job.times.started) {
			time = new Date(job.times.started);
			times.content += "<li><strong>Start date:</strong> " + time.toLocaleDateString('en-EN') + "</li>";
		}
		if (job.times.completed) {
			time = new Date(job.times.completed);
			times.content += "<li><strong>Completed date:</strong> " + time.toLocaleDateString('en-EN') + "</li>";
			let diff = Math.abs(job.times.completed - job.times.started), hours: string | number, min: string | number, sec: string | number;
			hours = Math.floor(diff / 3600000);
			diff -= hours * 3600000;
			min = Math.floor(diff / 60000);
			diff -= min * 60000;
			sec = Math.floor(diff / 1000);
			times.content += "<li><strong>Running time:</strong> " + hours + ":" + ("0" + min).slice(-1) + ":" + ("0" + sec).slice(-2) + "</li>";
		}
		times.content += "</ul>";
		data.information_list.push(times);
		data.information_list.push(new InfoListElement("Output log", undefined, "<pre>" + job.stdout + "</pre>"));
		data.information_list.push(new InfoListElement("Error log", undefined, "<pre>" + job.stderr + "</pre>"));
		this.zone.run(() => {
			this.bottomSheet.open(InfoComponent, { data: data });
		});
	}

	delJob(job: any) {
		this.queueService.delJob(job.job.uid).subscribe(res => {
			this.sbMessage({ title: "Delete job", message: res.message, opts: { duration: 2000 } })
		}, err => {
			this.sbMessage({ title: "ERROR! Delete job", message: err.message, opts: { duration: 2000 } })
		}, () => {
			this.updateRefresh();
		});
	}

	sbMessage({ title, message, opts }: { title: any; message: any; opts: any; }) {
		this.zone.run(() => {
			this.sb.open(title, message, opts);
		})
	}

	initDtOptions() {
		return {
			displayedColumns: ['name', 'status', 'result', 'added', 'started', 'end', 'running', 'actions'],
			search: { value: "" },
			order: { name: 'added', asc: false },
			pageSize: 10,
			pageIndex: 0,
			draw: 0,
			recordsTotal: 0,
			recordsFiltered: 0,
			stats: {}
		};
	}

	refreshTable(event?: any) {
		if (event) {
			if (event.pageSize) {
				this.dtOptions.pageSize = event.pageSize;
				this.dtOptions.pageIndex = event.pageIndex;
			}
			if (event.active) {
				this.dtOptions.order.name = event.active;
				this.dtOptions.order.asc = event.direction == "asc";
			}
			if (event == "search") {
				this.dtOptions.pageIndex = 0;
			}
		}
		this.dataSource.loadQueue(this.dtOptions);
	}

}
