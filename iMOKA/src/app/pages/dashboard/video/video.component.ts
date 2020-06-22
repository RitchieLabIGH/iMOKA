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
		{url: 'https://www.youtube.com/embed/KNrYGpEFm2k', title : 'iMOKA presentation'},
		{url: 'https://www.youtube.com/embed/p_mGVVzs5KQ', title : 'iMOKA tutorial 1'},
		{url: 'https://www.youtube.com/embed/RYPOIMq9EU0', title : 'iMOKA tutorial 2'},
		{url: 'https://www.youtube.com/embed/VfRKrT_UtYg', title : 'iMOKA tutorial 3'},
		{url: 'https://www.youtube.com/embed/EasSkYrVvBk', title : 'iMOKA tutorial 4'},
		{ url : 'https://www.youtube.com/embed/nytx95dsbtw' , title: 'MUSE - Montpellier University of Excellence' } ,
		{url : 'https://www.youtube.com/embed/VWRah09PxlE' , title : 'Montpellier University'}
	];
	current_video : Video = this.videos[0];
	constructor(){
		
	}
}