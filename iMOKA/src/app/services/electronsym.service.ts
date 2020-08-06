import { Injectable } from '@angular/core';
import { IpcRenderer } from 'electron';
import { Session, Profile, Setting } from '../interfaces/session';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
	providedIn: 'root'
})



export class ElectronSymService implements IpcRenderer {
	_once: {} = {};
	_listeners: any = {};
	_session: Session = new Session();
	data: any = {};
	constructor(private http: HttpClient) {
		if (!(<any>window).require) {
			this._session.profile = new Profile();
			if (environment.default_profile) {
				this._session.profile.process_config.current_profile = 0;
				this._session.profile.process_config.profiles = [new Setting()];
				if (environment.debug.matrices ){
					this._session.matrices=environment.debug.matrices; 
				}
			}
			if (environment.debug.files) {
				environment.debug.files.forEach((f) => {
					this.http.get(f).subscribe((data) => {
						this.openFile(data, f)
					})
				})
			}
			this._session.profile.id = "ElectronSymProfile";
			this._session.profile.name = "ElectronSymProfile";
		}
	}

	eventNames(): (string | symbol)[] {
		throw new Error("Method not implemented.");
	}
	prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
		throw new Error("Method not implemented.");
	}
	prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
		throw new Error("Method not implemented.");
	}
	listenerCount(type: string | symbol): number {
		throw new Error("Method not implemented.");
	}
	emit(event: string | symbol, ...args: any[]): boolean {
		throw new Error("Method not implemented.");
	}
	listeners(event: string | symbol): Function[] {
		throw new Error("Method not implemented.");
	}
	getMaxListeners(): number {
		throw new Error("Method not implemented.");
	}
	setMaxListeners(n: number): this {
		throw new Error("Method not implemented.");
	}
	addListener(event: string | symbol, listener: (...args: any[]) => void): this {
		throw new Error("Method not implemented.");
	}
	sendToHost(channel: string, ...args: any[]): void {
		throw new Error("Method not implemented.");
	}
	sendTo(webContentsId: number, channel: string, ...args: any[]): void {
		throw new Error("Method not implemented.");
	}
	sendSync(channel: string, ...args: any[]) {
		throw new Error("Method not implemented.");
	}

	openFile(content: any, file_name: string) {
		if (content.kmers) {
			content.kmers.forEach((km, idx) => { km.best_rank = idx; })
			this.data.kmers = content;
			this.initEvents();
			this._session.files["kmers"] = { file: file_name, info: content.info, original_request: file_name };
			this.release("File k-mer read.")
			this.sendSession();
		} else {
			this.release("File not recognized!")
		}
	}


	send(channel: string, ...args: any[]): void {
		console.log("Sending " + channel + " with args:");
		console.log(args)
		let full_channel = "";
		if (args.length > 1) {
			if ((args[1].action == "getSession" || args[1].action == "updateSession") && this._listeners["getSession"]) {
				this.sendSession()
			} else if (args[1].action == "saveProfile") {
				this._listeners[channel + "-" + args[0]].forEach((list) => {
					list({}, { "message": "Some messages....", code: 0 });
				})
				setTimeout(() => {
					if (args[1].profile) {
						if (this._session.profile.process_config.profiles.length > args[1].profile_number) {
							this._session.profile.process_config.profiles[args[1].profile_number] = args[1].profile;
						} else {
							this._session.profile.process_config.profiles.push(args[1].profile);
						}
					}
					this._session.profile.process_config.current_profile = args[1].profile_number;
					this._listeners[channel + "-" + args[0]].forEach((list) => {
						list({}, { "message": "COMPLETED", code: 0 });
					})
					this._listeners[channel + "-" + args[0]] = [];
				}, 2000)

			} else if (args[1].action == "getFile") {
				var input = document.createElement('input');
				input.type = 'file';
				input.onchange = (e: any) => {
					this.block("Reading the file...")
					var file = e.target.files[0];
					var reader = new FileReader();
					reader.readAsText(file, 'UTF-8');
					reader.onload = (readerEvent: any) => {
						var content = JSON.parse(readerEvent.target.result);
						this.openFile(content, file.name);
					}
				}
				input.click();

			} else if (args[1].data == "samples") {
				this._listeners[channel + "-" + args[0]].forEach((list) => {
					let samples = environment.debug.samples ? environment.debug.samples : [];
					this.data.samples = { number: samples.length, total_kmers: samples.reduce((prev, x) => { return prev + x.total_suffix }, 0) };
					list({}, { "message": "SUCCESS", code: 0, data: samples, recordsTotal: samples.length, recordsFiltered: samples.length, stats: {} });
				})
			} else if (args[1].data == "kmers") {
				console.log("Sending to " + channel + "-" + args[0])
				full_channel = channel + "-" + args[0];
				this._listeners[full_channel].forEach((list) => {
					let data_to_send = [];
					for (let i = args[1].pageIndex * args[1].pageSize; i <= (args[1].pageIndex + 1) * args[1].pageSize; i++) {
						data_to_send.push(this.regenerate(this.data.kmers.kmers[i]));
					}
					let response = {
						"data": data_to_send, "message": "SUCCESS", "draw": args[1].draw, code: 0,
						"recordsTotal": this.data.kmers.kmers.length,
						"recordsFiltered": this.data.kmers.kmers.length,
						"stats": { genes: this.data.kmers.info.genes, events: this.data.kmers.info.events }
					};
					list({}, response);
				})

			} else if (args[1].data == "data_by_id") {
				let request = args[1], resp;
				let el_id = request.request.id, el_type = request.request.type;
				if (typeof el_id == "number") {
					let dat = this.data[request.file_type][el_type].find((el) => {
						return el.id == el_id;
					});
					if (dat) {
						resp = { "data": this.regenerate(dat), "message": "SUCCESS" };
					}
				} else {
					let dat = this.data[request.file_type][el_type].find((el) => {
						return el.kmer == el_id;
					});
					if (dat) {
						resp = { "data": this.regenerate(dat), "message": "SUCCESS", code: 0 };
					}

				}
				full_channel = channel + "-" + args[0];
				this._listeners[full_channel].forEach((list) => {
					list({}, resp);
				})
			} else if (args[1].data == "queue") {
				this._listeners["queue"].forEach((list) => {
					list({}, { code: 0, data: environment.debug.queue })
				})
			} else if (args[1].data == "ideogram") {
				full_channel = channel + "-" + args[0];
				this._listeners[full_channel].forEach((list) => {
					let data = this.getIdeo(args[1]);
					list({}, { code: 0, data: data });

				});
			}
		} else if (channel == "getSession") {
			this.sendSession();
		}
		if (this._once[full_channel]) {
			this._listeners[full_channel] = undefined;
			this._once[full_channel] = undefined;
		}

	}

	getIdeo(config) {
		console.log(config)
		let annotations={keys: ["name","start","length", "repetitive", "highest_expression"],
			 annots : [] },  aln, hexpr, unique_n;
			let tmp_annot={};
			for ( var k = 0 ; k < this.data.kmers.kmers.length ; k++ ){
					if (this.data.kmers.kmers[k].alignments ){
	                    for (var i=0; i <  this.data.kmers.kmers[k].alignments.length; i++ ){
	                        aln=this.data.kmers.kmers[k].alignments[i];
							if (! tmp_annot[aln.chromosome]) tmp_annot[aln.chromosome]=[]
							hexpr=[0, -1];
							this.data.kmers.kmers[k].means.forEach((m, idx)=>{
								if ( m > hexpr[0] ) {
									hexpr=[m, idx]
								}
							})
							unique_n=this.data.kmers.kmers[k].alignments.length  == 1 ? 0 : 1;
							tmp_annot[aln.chromosome].push(["seq_"+k+"_"+i, aln.start, aln.end-aln.start, unique_n, hexpr[1] ])
						}
					}
			}
			Object.keys(tmp_annot).forEach((key)=>{
				if ( key.match( /^chr[0-9XY]+$/ )) annotations.annots.push({"chr": key.replace("chr", ""), "annots" : tmp_annot[key]})
				
			})
		return annotations;
	}

	initEvents() {
		this.data.kmers.info.events = [];
		this.data.kmers.info.genes = [];
		let events = {}, genes = {}, dat, masked;
		this.data.kmers.kmers.forEach((el, idx) => {
			dat = this.regenerate(el)
			masked = "filtered";
			if (!this.data.kmers.masks || !this.data.kmers.masks.kmers || this.data.kmers.masks.kmers[idx]) masked = "visible";
			if (dat.events) {
				dat.ev_types.forEach(ev => {
					if (!events[ev]) events[ev] = { visible: 0, filtered: 0 };
					events[ev][masked] = events[ev][masked] + 1;
				});
				dat.genes.forEach(g => {
					if (!genes[g]) genes[g] = { visible: 0, filtered: 0 };
					genes[g][masked] = genes[g][masked] + 1;
				});
			}
		});
		Object.keys(events).forEach(k => this.data.kmers.info.events.push({ name: k, visible: events[k].visible, filtered: events[k].filtered }));
		Object.keys(genes).forEach(k => this.data.kmers.info.genes.push({ name: k, visible: genes[k].visible, filtered: genes[k].filtered }));
	}

	clone(ref: any) {
		return JSON.parse(JSON.stringify(ref));
	}

	regenerate(kmer: any) {
		let dat = this.clone(kmer);
		if (dat.signatures) {
			for (let el in dat.signatures) {
				dat.signatures[el] = this.clone(this.data.kmers.signatures[dat.signatures[el]]);
			}
		}
		if (dat.kmer && this.data.models) {
			dat.score = this.data.models.info.feature_prevalence[this.data.models.info.feature_to_index[dat.kmer]];
		}
		if (dat.kmer && this.data.importance) {
			dat.importance = this.data.importance.features_importances[dat.kmer]
		}
		if (dat.events) {
			dat.genes = [];
			dat.ev_types = [];
			dat.events.forEach(ev => {
				ev.gene.forEach(g => {
					if (!dat.genes.includes(g)) dat.genes.push(g)
				})
				if (!dat.ev_types.includes(ev.type)) dat.ev_types.push(ev.type);
			})
		}
		return dat;
	}

	sendSession() {
		this._listeners["getSession"].forEach((list) => {
			list({}, { "message": "SUCCESS", "session": this._session })
		});
	}

	block(message: string) {
		this._listeners["message"].forEach((list) => {
			list({}, { "message": message, action: "block", type: "action" })
		})
	}
	release(message: string) {
		this._listeners["message"].forEach((list) => {
			list({}, { "message": message, action: "release", type: "action" })
		})
	}
	message(message: string) {
		this._listeners["message"].forEach((list) => {
			list({}, { "message": message })
		})
	}
	removeListener(channel: string, listener: (...args: any[]) => void): this {
		throw new Error("Method not implemented.");
	}
	removeAllListeners(channel: string): this {
		this._listeners[channel] = undefined;
		return this;
	}
	once(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void): this {
		console.log("Requested once(" + channel + ")")
		if (!this._listeners[channel]) this._listeners[channel] = []
		this._listeners[channel].push(listener);
		this._once[channel] = true;
		return this;
	}
	on(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void): this {
		console.log("Requested on(" + channel + ")")
		if (!this._listeners[channel]) this._listeners[channel] = []
		this._listeners[channel].push(listener);
		return this;
	}
	invoke(channel: string, ...args: any[]): Promise<any> {
		throw new Error("Method not implemented.");
	}

}