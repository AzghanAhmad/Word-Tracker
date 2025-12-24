import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FeatureCardsComponent } from '../feature-cards/feature-cards.component';

@Component({
    selector: 'app-dashboard-home',
    standalone: true,
    imports: [CommonModule, RouterLink, FeatureCardsComponent],
    templateUrl: './dashboard-home.component.html',
    styleUrls: ['./dashboard-home.component.scss']
})
export class DashboardHomeComponent { }
