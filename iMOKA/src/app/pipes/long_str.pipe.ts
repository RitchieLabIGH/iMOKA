import {Pipe, PipeTransform} from '@angular/core';
 
@Pipe({
  name: 'long_str'
})
export class LongStrPipe implements PipeTransform {
 
  constructor() {
  }
 
  transform(value: string, length: number=20): any {
	return value.length > length ? "..." + value.substr(-length) : value;
    
  }
 
}
