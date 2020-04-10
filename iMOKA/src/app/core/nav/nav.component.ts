import { Component } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import {Session} from '../../interfaces/session';
import {UemService} from '../../services/uem.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css'],
})

export class NavComponent {

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );
  session : Session;
  constructor(private breakpointObserver: BreakpointObserver, private uem:UemService) {
      this.uem.getSession().subscribe(session=>{
          this.session=session;
      });
  }
  

}
