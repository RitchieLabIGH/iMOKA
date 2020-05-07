import { Component, OnInit,  NgZone } from '@angular/core';
import {UemService} from '../../services/uem.service';
import {Session, Profile} from '../../interfaces/session';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.css']
})
export class SetupComponent implements OnInit {
  session : Session;
  err_message: string;
  loading_message : string;
  current_profile : number=0;
  constructor(private uem : UemService,  private zone:NgZone , private snack:MatSnackBar) { }
  ngOnInit() {
      if (this.uem.electron){
          this.uem.getSession().subscribe(response=>{
              this.zone.run(()=>{
                  this.session=response;
             });
         });
      }else {
          this.session= new Session();
          this.session.profile = new Profile();
      }
  }
  

}
