import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-calendar',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 class="text-2xl font-semibold text-gray-900 mb-6">Calendar</h1>
      <p class="text-gray-500">Global calendar view coming soon.</p>
    </div>
  `
})
export class CalendarComponent { }
