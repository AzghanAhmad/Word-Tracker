import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarDayComponent } from '../calendar-day/calendar-day.component';

export interface CalendarCell {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  target: number;
  events: any[];
}

@Component({
  selector: 'app-calendar-grid',
  standalone: true,
  imports: [CommonModule, CalendarDayComponent],
  template: `
    <div class="calendar-container">
      <!-- Weekday Headers -->
      <div class="weekdays-row">
        <div class="weekday" *ngFor="let day of weekDays">{{ day }}</div>
      </div>

      <!-- Days Grid -->
      <div class="days-grid">
        <app-calendar-day
          *ngFor="let cell of cells"
          [dayNumber]="cell.dayNumber"
          [isCurrentMonth]="cell.isCurrentMonth"
          [isToday]="cell.isToday"
          [isSelected]="cell.isSelected"
          [target]="cell.target"
          [events]="cell.events"
          [class.past-date]="timeFilter === 'future' && isPastDate(cell.date)"
          (click)="selectDate(cell.date)"
        ></app-calendar-day>
      </div>
    </div>
  `,
  styles: [`
    .calendar-container {
      background: #fff;
      border: 1px solid #ccc; // Main calendar border
    }

    .weekdays-row {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      border-bottom: 2px solid #ccc;
      background: #fff;
    }

    .weekday {
      text-align: center;
      font-weight: 700;
      color: #31b0d5; // Cyan color from image
      font-size: 0.9rem;
      padding: 10px 0;
      border-right: 1px solid #ddd;
      
      &:last-child {
        border-right: none;
      }
    }

    .days-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      background: #fff;
    }
  `]
})
export class CalendarGridComponent implements OnChanges {
  @Input() currentDate: Date = new Date();
  @Input() targets: { [key: string]: number } = {};
  @Input() viewMode: 'daily-total' | 'progress-vs-plan' = 'daily-total';
  @Input() timeFilter: 'future' | 'all' = 'all';

  weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  cells: CalendarCell[] = [];
  selectedDate: Date | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentDate'] || changes['targets'] || changes['viewMode'] || changes['timeFilter']) {
      this.generateGrid();
    }
  }

  selectDate(date: Date) {
    this.selectedDate = date;
    this.generateGrid(); // Re-render to update selection state
  }

  generateGrid() {
    this.cells = [];
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(year, month, 1);
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Previous Month Padding
    for (let i = 0; i < startDayOfWeek; i++) {
      const dayNum = daysInPrevMonth - startDayOfWeek + 1 + i;
      const date = new Date(year, month - 1, dayNum);
      this.cells.push(this.createCell(date, dayNum, false, today));
    }

    // Current Month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      this.cells.push(this.createCell(date, i, true, today));
    }

    // Next Month Padding
    const remainingCells = 42 - this.cells.length;
    for (let i = 1; i <= remainingCells; i++) {
      const date = new Date(year, month + 1, i);
      this.cells.push(this.createCell(date, i, false, today));
    }
  }

  createCell(date: Date, dayNumber: number, isCurrentMonth: boolean, today: Date): CalendarCell {
    const isToday = date.getTime() === today.getTime();
    const isSelected = this.selectedDate ? date.getTime() === this.selectedDate.getTime() : false;

    return {
      date,
      dayNumber,
      isCurrentMonth,
      isToday,
      isSelected,
      target: this.getTargetForDate(date),
      events: this.getEventsForDate(date)
    };
  }

  getTargetForDate(date: Date): number {
    // If filtering for future, and date is in the past (before today), return 0
    if (this.timeFilter === 'future' && this.isPastDate(date)) {
      return 0;
    }

    // Format YYYY-MM-DD manually to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return this.targets[dateStr] || 0;
  }

  getEventsForDate(date: Date): any[] {
    // Placeholder logic for real events
    // In a real app, this would check a list of plans/sessions
    const events: any[] = [];

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    // Re-implementing the mock logic but in a way that's ready for real data
    // Only show for current month for demo purposes
    if (date.getMonth() === this.currentDate.getMonth()) {
      if (day % 7 === 0 || day % 8 === 0) {
        events.push({ title: 'Plan Update', value: day + ' words' });
      }
      if (day === 21) {
        events.push({ title: 'Deadline', value: 'FINAL', isDeadline: true });
      }
    }

    return events;
  }

  isPastDate(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Be careful with object comparison, use timestamps
    return date.getTime() < today.getTime();
  }
}
