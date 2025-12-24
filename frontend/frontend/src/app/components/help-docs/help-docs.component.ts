import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-help-docs',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './help-docs.component.html',
    styleUrls: ['./help-docs.component.scss']
})
export class HelpDocsComponent { }
