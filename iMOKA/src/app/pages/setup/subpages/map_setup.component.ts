import { Component, OnInit,  NgZone } from '@angular/core';
import {UemService} from '../../../services/uem.service';
import {Session, Setting, AnnotationConfiguration, MapConfiguration} from '../../../interfaces/session';
import {MatSnackBar} from '@angular/material/snack-bar';


@Component({
  selector: 'map-setup',
  templateUrl: './map_setup.component.html',
  styleUrls: ['./master_setup.component.css']
})
export class MapSetupComponent implements OnInit {
  session : Session;
  setting : Setting;
  loading : boolean = true;
  modify_mapper : boolean = true;
  modify_ann : boolean =true;
  err_message: string;
  loading_message : string;
  current_profile : number=0;
  current_map: number = 0;
  current_ann: number = 0;

  constructor(private uem : UemService,  private zone:NgZone , private snack:MatSnackBar) { }
  ngOnInit() {
      if (this.uem.electron){
          this.uem.getSession().subscribe(response=>{
              this.zone.run(()=>{
                  this.session=response;
                  if (this.session && typeof this.session.profile.process_config.current_profile != "undefined" &&  this.session.profile.process_config.profiles.length > 0 ){
                      this.current_profile=this.session.profile.process_config.current_profile;
                      this.setProfile(this.current_profile);
                      this.modify_mapper=false;
                      this.modify_ann=false;
                  } 
                  this.loading=false;
             });
         });
      }
  }
  
  save(event?:any){
      this.loading=true;
      this.err_message=undefined;
      this.loading_message="Checking your profile";
      let tosend={profile_number : this.current_profile, profile:undefined };
      if (this.modify_mapper || this.modify_ann){
          tosend.profile=this.setting; 
      }
      
      this.uem.saveProfile(tosend).subscribe(
              result=>{
                  this.zone.run(()=>{
                      this.loading_message = result.message;
                  });
              }, 
              error =>{
                  this.zone.run(()=>{
                      if ( typeof error == "string"){
                          this.err_message = error;
                      } else {
                          this.err_message = JSON.stringify(error);
                      }
                      
                  });
              }, () =>{
              this.zone.run(()=>{
                  this.loading=false;
                  this.modify_mapper=false;
                  this.modify_ann=false;
              });}
       );
      if ( event ) {
          return false
      };
  }
  
  
  setProfile(n?: number){
      if ( typeof n == 'undefined' ){
          n = this.session.profile.process_config.current_profile;
      }
      this.current_profile=n;
      this.setting=JSON.parse(JSON.stringify(this.session.profile.process_config.profiles[n]));
	  if (this.setting.update){
		this.setting.update = false;
      }
      this.modify_ann= false;
      this.modify_mapper= false;
  }
  
  newMap(n?: number){
      if ( this.setting ){
          if (! this.setting.mappers ){
              this.setting.mappers= [];
          }
          if ( n ){
              this.setting.mappers[n]=new MapConfiguration();
          } else {
              this.setting.mappers.push(new MapConfiguration());
              n=this.setting.mappers.length -1;
          }
          this.zone.run(()=>{
              this.current_map=n;
              this.modify_mapper=true;
          })
      }else {
          console.log("Error! No setting selected!")
      }
  }
  
  removeMap(){
      if (this.setting && this.setting.mappers[this.current_map]){
          this.setting.mappers.splice(this.current_map, 1);
          this.modify_mapper=true;
          this.save();
          this.zone.run(()=>{
              this.current_map=0;
          })
          
      }
  }
  newAnn(n?: number){
      if ( this.setting ){
          if (! this.setting.annotations ){
              this.setting.annotations= [];
          }
          if ( n ){
              this.setting.annotations[n]=new AnnotationConfiguration();
          } else {
              this.setting.annotations.push(new AnnotationConfiguration());
              n=this.setting.annotations.length -1;
          }
          this.zone.run(()=>{
              this.current_ann=n;
              this.modify_ann=true;
          })
      }else {
          console.log("Error! No setting selected!")
      }
  }
  
  removeAnn(){
      if (this.setting && this.setting.annotations[this.current_ann]){
          this.setting.annotations.splice(this.current_ann, 1);
          this.modify_ann=true;
          this.save();
          this.zone.run(()=>{
              this.current_ann=0;
          })
          
      }
  }
}
