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
  actual: number;
  events: any[];
  isDeadline: boolean;
  plans: any[]; // Plans for this date (for progress-vs-plan mode)
}

@Component({
  selector: 'app-calendar-grid',
  standalone: true,
  imports: [CommonModule, CalendarDayComponent],
  template: `
    <div class="calendar-container">
      <div class="scroll-wrapper">
        <div class="calendar-grid-layout" [class.yearly-view]="calendarView === 'yearly'">
          <!-- Headers -->
          <ng-container *ngIf="calendarView !== 'yearly'">
            <div class="weekday" *ngFor="let day of weekDays">{{ day }}</div>
          </ng-container>
           
           <!-- Content Cells -->
           <app-calendar-day
            *ngFor="let cell of cells"
            [date]="cell.date"
            [dayNumber]="cell.dayNumber"
            [isCurrentMonth]="cell.isCurrentMonth"
            [isToday]="cell.isToday"
            [isSelected]="cell.isSelected"
            [target]="cell.target"
            [actual]="cell.actual"
            [events]="cell.events"
            [isDeadline]="cell.isDeadline"
            [plans]="cell.plans"
            [viewMode]="viewMode"
            [class.past-date-dimmed]="timeFilter === 'future' && isPastDate(cell.date)"
            (click)="selectDate(cell.date)"
          ></app-calendar-day>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .calendar-container {
      background: white;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .scroll-wrapper {
      overflow-x: auto;
      width: 100%;
      -webkit-overflow-scrolling: touch;
      &::-webkit-scrollbar {
        height: 6px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      &::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 10px;
      }
    }

    .calendar-grid-layout {
      display: grid;
      grid-template-columns: repeat(7, minmax(140px, 1fr));
      background: #eef2f6;
      gap: 1px;
      min-width: 100%;
    }

    .calendar-grid-layout.yearly-view {
      grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
      max-height: 70vh;
      overflow-y: auto;
      padding: 10px;
      background: white;
      gap: 4px;
    }

    .weekday {
      background: #ffffff;
      text-align: center;
      font-weight: 700;
      color: #1e293b;
      font-size: 0.75rem;
      padding: 1rem 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      border-bottom: 1px solid #eef2f6;
    }

    ::ng-deep app-calendar-day {
      background: white;
      min-height: 140px;
      display: block;
    }

    @media (max-width: 1024px) {
      .calendar-grid-layout:not(.yearly-view) {
        grid-template-columns: repeat(7, minmax(100px, 1fr));
      }
    }

    @media (max-width: 640px) {
      .calendar-grid-layout:not(.yearly-view) {
        grid-template-columns: repeat(7, minmax(80px, 1fr));
      }
      ::ng-deep app-calendar-day {
        min-height: 100px;
      }
      .weekday {
        padding: 0.5rem 0.25rem;
        font-size: 0.65rem;
      }
    }
  `]
})
export class CalendarGridComponent implements OnChanges {
  @Input() currentDate: Date = new Date();
  @Input() targets: { [key: string]: number } = {};
  @Input() dailyLogs: { [key: string]: number } = {};
  @Input() deadlines: { [key: string]: boolean } = {};
  @Input() plansByDate: { [key: string]: any[] } = {};
  @Input() viewMode: 'daily-total' | 'progress-vs-plan' = 'daily-total';
  @Input() timeFilter: 'future' | 'all' = 'all';
  @Input() calendarView: 'weekly' | 'monthly' | 'yearly' = 'monthly';

  weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  cells: CalendarCell[] = [];
  selectedDate: Date | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentDate'] || changes['targets'] || changes['dailyLogs'] || changes['deadlines'] || changes['plansByDate'] || changes['viewMode'] || changes['timeFilter'] || changes['calendarView']) {
      // Log when plansByDate changes
      if (changes['plansByDate']) {
        const current = changes['plansByDate'].currentValue;
        if (current) {
          const keys = Object.keys(current);
          console.log('Calendar Grid - plansByDate updated:', keys.length, 'dates');
          if (keys.length > 0) {
            const sampleKey = keys[0];
            console.log('Calendar Grid - Sample date plans:', sampleKey, current[sampleKey]?.length || 0, 'plans');
          }
        }
      }
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

    if (this.calendarView === 'weekly') {
      const startOfWeek = this.getStartOfWeek(this.currentDate);
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        this.cells.push(this.createCell(date, date.getDate(), true, today));
      }
    } else if (this.calendarView === 'monthly') {
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
    } else if (this.calendarView === 'yearly') {
      // For yearly, we'll show every day of the year in a long list, 
      // grouped by month for visual clarity
      for (let m = 0; m < 12; m++) {
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, m, d);
          this.cells.push(this.createCell(date, d, true, today));
        }
      }
    }
  }

  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
  }

  createCell(date: Date, dayNumber: number, isCurrentMonth: boolean, today: Date): CalendarCell {
    const isToday = date.getTime() === today.getTime();
    const isSelected = this.selectedDate ? date.getTime() === this.selectedDate.getTime() : false;
    const plans = this.getPlansForDate(date);

    // Debug log for current month cells with plans
    if (isCurrentMonth && plans.length > 0) {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      console.log(`Calendar Grid - Cell ${dayNumber} (${dateStr}): ${plans.length} plans`, plans.map(p => p.title || p.plan_name));
    }

    return {
      date,
      dayNumber,
      isCurrentMonth,
      isToday,
      isSelected,
      target: this.getTargetForDate(date),
      actual: this.getActualForDate(date),
      events: this.getEventsForDate(date),
      isDeadline: this.isDeadlineDate(date),
      plans: plans
    };
  }

  getActualForDate(date: Date): number {
    // If filtering for future, and date is in the past (before today), return 0
    if (this.timeFilter === 'future' && this.isPastDate(date)) {
      return 0;
    }

    // Format YYYY-MM-DD manually to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Return actual words from dailyLogs (works for both daily-total and progress-vs-plan modes)
    // This ensures immediate display of actual words even before plan days are fully fetched
    const actual = this.dailyLogs && this.dailyLogs[dateStr] ? this.dailyLogs[dateStr] : 0;
    return actual;
  }

  getPlansForDate(date: Date): any[] {
    // If filtering for future, and date is in the past (before today), return empty
    if (this.timeFilter === 'future' && this.isPastDate(date)) {
      return [];
    }

    // Format YYYY-MM-DD manually to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Return plans for this date - works for both daily-total and progress-vs-plan modes
    if (!this.plansByDate || typeof this.plansByDate !== 'object') {
      return [];
    }

    const plans = this.plansByDate[dateStr] || [];
    return plans;
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

    // For daily-total mode, we'll show plans individually, so return 0 for target
    // The plans will be shown via getPlansForDate instead
    if (this.viewMode === 'daily-total') {
      return 0;
    }

    return this.targets[dateStr] || 0;
  }

  getEventsForDate(date: Date): any[] {
    // Return empty array - no hardcoded events
    // Events will come from backend data in the future
    return [];
  }

  isDeadlineDate(date: Date): boolean {
    // Format YYYY-MM-DD manually to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return this.deadlines[dateStr] || false;
  }

  isPastDate(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Be careful with object comparison, use timestamps
    return date.getTime() < today.getTime();
  }
}
