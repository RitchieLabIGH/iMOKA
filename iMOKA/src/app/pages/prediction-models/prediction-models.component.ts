import { Component, OnInit, ViewChild, OnDestroy, NgZone } from '@angular/core';
import { TracksService } from '../../services/tracks.service';

import {UemService} from '../../services/uem.service';
import {Session, Setting, Profile} from '../../interfaces/session';
import {Subscription} from 'rxjs';



@Component( {
    selector: 'app-prediction',
    templateUrl: './prediction-models.component.html',
    styleUrls: ['./prediction-models.component.css'],
} )

export class PredictionModelsComponent implements OnInit {


    constructor(
        private trackService: TracksService, private zone: NgZone, private uem : UemService
    ) {
    };

    session: Session;
    data : any = {};
    importances : any;
    subscriptions: Subscription[]=[];
    
    
    ngOnInit() {
        this.subscriptions.push(this.uem.getSession().subscribe(( session : Session ) => {
            this.session=session;
            this.initImportance();
        } ));
        this.subscriptions.push(this.trackService.getData("importance").subscribe((response)=>{
            let fi={data_boxplot : [], data_barplot :[{showlegend:false, x:[], y:[], type:"scatter"}], display_data:[] ,layout : {autosize: true, title : "Relative Feature Importances" }, from_pos : 0 , to_display : 20};
			console.log(response)
            let sorted_keys=Object.keys(response);
            sorted_keys.sort((a,b)=>{return response[a].rank - response[b].rank});
            for ( let i=0 ; i < sorted_keys.length; i++){
                fi.data_boxplot.push({showlegend:false, name : sorted_keys[i], y : response[sorted_keys[i]].values, type : 'box'})
                fi.data_barplot[0].x.push(i);
                fi.data_barplot[0].y.push(response[sorted_keys[i]].mean);
            }
            this.data.feature_importance =  fi; 
        }));
        this.subscriptions.push(this.trackService.getData( "importance_samples_probabilities").subscribe((response)=>{
            this.importances=response;
        }));
        
    };

    ngOnDestroy() {
        this.subscriptions.forEach((sub)=>{
            sub.unsubscribe();
        });
    }


    initImportance() {
        this.subscriptions.push(this.trackService.getData( "importance_models" ).subscribe(( resp ) => {
            let models = { data: resp, current_model: 0, show_type: "pca" }, best_acc = 0;
            models.data.forEach(( data, datIdx ) => {
                if ( data.acc > best_acc ) {
                    best_acc = data.acc;
                    models.current_model = datIdx;
                }
                data.graphs = {
                    tsne: { data: [], layout: { title: 't-SNE for model ' + datIdx, xaxis: { zeroline: false }, yaxis: { zeroline: false } } },
                    pca: { data: [], layout: { title: 'PCA for model ' + datIdx, xaxis: { zeroline: false }, yaxis: { zeroline: false } } }
                };
                this.session.files.importance.info.groups_names.forEach(( grp, gidx ) => {
                    ["tsne", "pca"].forEach( ty => {
                        let dat = { name: grp, x: [], y: [], text: [], type: "scatter", mode: "markers", hoverinfo: "text", marker: { symbol: [], size: 8 } };
                        if ( data[ty] ) {
                            data[ty].forEach(( val, idx ) => {
                                if ( this.session.files.importance.info.sample_groups[idx] == gidx ) {
                                    dat.x.push( val[0] );
                                    dat.y.push( val[1] );
                                    let text = this.session.files.importance.info.sample_names[idx] + "<br>Predicted probabilites:<br> ";
                                    let max_idx = 0, max_val = 0;
                                    this.session.files.importance.info.groups_names.forEach(( gr, gridx ) => {
                                        text += gr + "=" + data.probabilities[idx][gridx].toPrecision( 2 ) + "<br>";
                                        if ( max_val < data.probabilities[idx][gridx] ) {
                                            max_val = data.probabilities[idx][gridx];
                                            max_idx = gridx;
                                        }
                                    } );
                                    dat.text.push( text )
                                    dat.marker.symbol.push( max_idx )
                                }
                            } );
                            data.graphs[ty].data.push( dat );
                        }
                    } );
                } );
                data.current_model = data.best_model;
            } );
            this.zone.run(()=> { this.data.models = models; });
        } ));
    };


}