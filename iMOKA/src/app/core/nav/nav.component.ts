import { Component, NgZone , OnInit} from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Session, Message } from '../../interfaces/session';
import { UemService } from '../../services/uem.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
	selector: 'app-nav',
	templateUrl: './nav.component.html',
	styleUrls: ['./nav.component.css'],
})

export class NavComponent implements OnInit{

	isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
		.pipe(
			map(result => result.matches),
			shareReplay()
		);
	session: Session;
	messages: Message[]=[];
	hideAlert : boolean=true;
	active_block: boolean = false;
	init_message:string="Loading your profile...";
	blocked : any;
	constructor(private breakpointObserver: BreakpointObserver, private zone : NgZone, private uem: UemService,private alert: MatSnackBar,) {
		
	}
	ngOnInit(){
		this.uem.getSession().subscribe(session => {
			this.zone.run(()=>{
				this.session = session;
			})
		});
		this.uem.getMessage().subscribe(message => {
			if (message && this.session ) {
				switch (message.type) {
					case "alert": {
						this.alert.open(message.message, "Message", { duration: 5000 })
					}
					case "action" : {
						if ( message.action == "block"){
							this.active_block=true;
							this.zone.run(()=>{
								this.blocked=message;
							})
							break;	
						}
						if (message.action == "release"){
							if ( this.blocked && this.active_block){
								this.zone.run(()=>{
									message.progress=100;
									this.blocked = message;
									this.active_block=false;
								});	
							}
							setTimeout(()=>{
								this.zone.run(()=>{
									if (! this.active_block){
										this.blocked = undefined;	
									}
								})	
							}, this.blocked && this.blocked.length > 10 ? 3000 : 1000);
							break;
						}
					}
					default: {
						this.messages.push(message)
						this.showAlert(typeof message.message == "string" ? message.message : JSON.stringify(message.message), message.title ? message.title : "Message");
					}
				}
			} else {
				if ( message && message.action == "block"){
					this.zone.run(()=>{
						this.init_message = message.message;
					})
				}
			}
		});
		
	}
	showAlert(message:string, title:string){
		this.zone.run(()=>{
			this.alert.open(message, title, {duration : 2000})
		})
	}


}
