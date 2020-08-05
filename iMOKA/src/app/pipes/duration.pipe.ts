import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'duration'
})
export class DurationPipe implements PipeTransform {

  transform(value: number): string {
	let seconds = Math.floor(value /1000);
	if ( seconds > 60 ){
		let minutes = Math.floor(seconds / 60);
		if ( minutes > 60 ){
			let hours =Math.floor( minutes / 60);
			return hours + ":" + (minutes % 60 )+":"+(seconds % 60); 
		} else {
			return minutes+":"+(seconds % 60);
		}	
	} else {
		return "00:"+seconds ;
	}
	 
  }

}
