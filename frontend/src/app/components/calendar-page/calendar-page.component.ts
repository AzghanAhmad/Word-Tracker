import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CalendarHeaderComponent } from './calendar-header/calendar-header.component';
import { CalendarGridComponent } from './calendar-grid/calendar-grid.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [CommonModule, CalendarHeaderComponent, CalendarGridComponent, RouterModule],
  templateUrl: './calendar-page.component.html',
  styleUrls: ['./calendar-page.component.scss']
})
export class CalendarPageComponent implements OnInit {
  currentDate: Date = new Date();
  targets: { [key: string]: number } = {};
  username: string = 'User';

  // View State
  viewMode: 'daily-total' | 'progress-vs-plan' = 'daily-total';
  timeFilter: 'future' | 'all' = 'all';

  get monthName(): string {
    return this.currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  ngOnInit() {
    this.username = localStorage.getItem('username') || 'User';
    this.fetchPlanDays();
  }

  nextMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.fetchPlanDays();
  }

  prevMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.fetchPlanDays();
  }

  goToday() {
    this.currentDate = new Date();
    this.fetchPlanDays();
  }

  setViewType(type: string) {
    console.log('Switching view to:', type);
    // You could implement weekly/yearly logic here
  }

  setViewMode(mode: 'daily-total' | 'progress-vs-plan') {
    this.viewMode = mode;
    console.log('View Mode changed to:', mode);
  }

  setTimeFilter(filter: 'future' | 'all') {
    this.timeFilter = filter;
    console.log('Time Filter changed to:', filter);
  }

  async fetchPlanDays() {
    const userId = localStorage.getItem('user_id');
    console.log('Fetching calendar data for User ID:', userId);

    if (!userId) {
      console.warn('No User ID found in localStorage');
      return;
    }

    // Calendar feature not yet implemented in C backend
    console.log('Calendar feature coming soon!');
    this.targets = {};
  }
}
