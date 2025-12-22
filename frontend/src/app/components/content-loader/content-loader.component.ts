import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-content-loader',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './content-loader.component.html',
    styleUrls: ['./content-loader.component.scss']
})
export class ContentLoaderComponent {
    // Simple component, no logic needed for basic 3-line loader
}
