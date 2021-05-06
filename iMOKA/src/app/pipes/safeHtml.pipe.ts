import {Pipe, PipeTransform} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
 
@Pipe({
  name: 'safeHtml'
})
export class SafeHtmlPipe implements PipeTransform {
 
  constructor(private sanitizer: DomSanitizer) {
  }
 
  transform(value: any, args?: any): any {
    return this.sanitizer.bypassSecurityTrustHtml(value);
  }
 
}


@Pipe({
  name: 'safeURL'
})
export class SafeURLPipe implements PipeTransform {
 
  constructor(private sanitizer: DomSanitizer) {
  }
 
  transform(value: any, args?: any): any {
    return this.sanitizer.bypassSecurityTrustResourceUrl(value);
  }
 
}