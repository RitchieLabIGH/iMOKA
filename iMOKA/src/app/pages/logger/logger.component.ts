import { Component, OnInit, NgZone, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { UemService } from '../../services/uem.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Session } from '../../interfaces/session';
import { Matrix } from '../../interfaces/samples';
import { Subscription, timer } from 'rxjs';
import { QueueSource } from '../../data/queue.source';
import { QueueService } from '../../services/queue.service';
import { JobInfo } from '../../core/info/info.component';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';

@Component({
	selector: 'app-logger',
	templateUrl: './logger.component.html',
	styleUrls: ['./logger.component.css']
})
export class LoggerComponent implements OnInit, OnDestroy {
	session: Session;
	sub_queue: Subscription;
	sub_session: Subscription;
	queue_types = ["running", "jobs", "completed"];
	dtOptions: any = this.initDtOptions();
	dataSource: QueueSource;
	refreshTime: number = 5000;
	refreshRequest: Subscription;
	error: string;
	current_matrix: Matrix;
	constructor(private uem: UemService, private zone: NgZone,
		private sb: MatSnackBar, private queueService: QueueService, private cd: ChangeDetectorRef
		, private bottomSheet: MatBottomSheet, public dialog: MatDialog
	) { }
	ngOnInit() {
		this.sub_session = this.uem.getSession().subscribe(session => {
				this.session = session;
				if (!this.dataSource && this.session && this.session.profile.process_config.profiles.length > 0) {
					this.dataSource = new QueueSource(this.queueService);
					this.dataSource.onRefresh = () => {
						this.zone.run(() => { this.cd.markForCheck() });
						return;
					};
					setTimeout(() => { this.updateRefresh() }, 1000);
				}

		}, err => {
			console.log(err);
		});
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
		this.zone.run(() => {
			this.bottomSheet.open(JobInfo, { data: job });
		});
	}

	delJob(job: any) {
		this.queueService.delJob(job.job.uid).then((res) => {
			this.sbMessage({ title: "Delete job", message: res, opts: { duration: 2000 } })
		}).catch((err) => {
			this.sbMessage({ title: "ERROR! Delete job", message: err.message, opts: { duration: 2000 } })
		}).finally(() => {
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
