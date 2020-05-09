import { Component } from '@angular/core';

class Video {
	url:string;
	title: string;
}

@Component({
	selector: 'app-video',
	templateUrl: './video.component.html'
})

export class VideoComponent{
	
	videos : Video[] = [
		{ url : 'https://www.youtube.com/embed/nytx95dsbtw' , title: 'MUSE - Montpellier University of Excellence' } ,
		{url : 'https://www.youtube.com/embed/VWRah09PxlE' , title : 'Montpellier University'}
	];
	current_video : Video = this.videos[0];
	constructor(){
		
	}
}