import { Component, NgZone, Input } from '@angular/core';




@Component( {
    selector: 'app-model-display',
    templateUrl: './model-display.component.html',
    styleUrls: ['../prediction-models.component.css']
} )

export class ModelDisplayComponent {

    @Input() model:any;
    @Input() graph:any;
    @Input() session:any;

    reduceRow( matrix: any, row: number ) {
        return matrix[row].reduce(( a, b ) => a + b, 0 );
    }

    reduceCol( matrix: any, col: number ) {
        return matrix.reduce(( a, b ) => a + b[col], 0 );
    }

}