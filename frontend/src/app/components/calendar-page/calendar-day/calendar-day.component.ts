import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calendar-day',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="day-cell" 
         [class.other-month]="!isCurrentMonth" 
         [class.today]="isToday"
         [class.selected]="isSelected">
      
      <div class="day-header">
        <span class="day-number">{{ dayNumber }}</span>
      </div>
      
      <div class="content-area">
        <div *ngFor="let event of events" class="event-bar" [class.deadline]="event.isDeadline">
          {{ event.title }}: {{ event.value }}
        </div>

        <div class="target-badge" *ngIf="target > 0">
          {{ target | number }} words
        </div>
      </div>
    </div>
  `,
  styles: [`
    .day-cell {
      background: #fff;
      border-right: 1px solid #ddd;
      border-bottom: 1px solid #ddd;
      height: 140px;
      padding: 5px;
      display: flex;
      flex-direction: column;
      position: relative;
      cursor: pointer;
      transition: background-color 0.1s ease;

      &:hover {
        background-color: #f9f9f9;
      }

      &.other-month {
        background-color: #fff; // Keep white like image
        
        .day-number {
          color: #ccc;
        }
      }

      &.today {
        background-color: #fff9db; // Light yellow background from image
      }

      &.selected {
        outline: 2px solid #31b0d5;
        outline-offset: -2px;
        z-index: 1;
      }
    }

    .day-header {
      display: flex;
      justify-content: flex-end;
      padding: 2px;
    }

    .day-number {
      font-size: 0.95rem;
      font-weight: 400;
      color: #31b0d5; // Blue number from image
    }

    .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-top: 4px;
    }

    .event-bar {
      background-color: #444; // Dark grey background
      color: white;
      font-size: 0.75rem;
      padding: 3px 6px;
      border-radius: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 500;
      border: 1px solid #222;

      &.deadline {
        background-color: #000;
        font-weight: 700;
      }
    }

    .target-badge {
      font-size: 0.7rem;
      color: #555;
      text-align: right;
      padding: 2px;
    }

    @media (max-width: 768px) {
      .day-cell {
        height: 100px;
      }
    }
  `]
})
export class CalendarDayComponent {
  @Input() dayNumber: number = 1;
  @Input() isCurrentMonth: boolean = true;
  @Input() isToday: boolean = false;
  @Input() isSelected: boolean = false;
  @Input() target: number = 0;
  @Input() events: any[] = [];
}
