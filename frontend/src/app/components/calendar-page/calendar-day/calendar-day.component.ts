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
        <div *ngFor="let event of events" class="event-pill" [class.deadline]="event.isDeadline">
          <span class="dot"></span> {{ event.title }}
        </div>

        <!-- Progress vs Plan Mode -->
        <div *ngIf="viewMode === 'progress-vs-plan'" class="plans-container">
          <div *ngFor="let plan of plans" class="plan-pill">
             <div class="pill-color" [style.background-color]="plan.color_code || '#6366f1'"></div>
             <span class="name">{{ plan.title }}</span>
             <span class="count">{{ plan.dailyTarget | number }}w</span>
          </div>
        </div>

        <!-- Daily Total Mode -->
        <div *ngIf="viewMode === 'daily-total'" class="daily-mode-wrapper">
          <div class="deadline-badge" *ngIf="isDeadline">DEADLINE</div>

          <div class="stats-row" *ngIf="target > 0 && !isDeadline">
             <div class="stat-group">
                <span class="label">Target</span>
                <span class="val">{{ target | number }}</span>
             </div>
             <div class="stat-group" [class.success]="actual >= target">
                <span class="label">Actual</span>
                <span class="val">{{ actual | number }}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .day-cell {
      background: #fff;
      height: 100%;
      min-height: 140px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      position: relative;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid transparent;

      &:hover {
        background-color: #f8fafc;
        border-color: #e2e8f0;
        z-index: 10;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      }

      &.other-month {
        background-color: #fafbfc;
        
        .day-number {
          color: #cbd5e1;
        }
      }

      &.today {
        background-color: #f0f9ff;
        .day-number {
          background: #0ea5e9;
          color: white;
          width: 26px;
          height: 26px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          box-shadow: 0 2px 4px rgba(14, 165, 233, 0.2);
        }
      }

      &.selected {
        background-color: #f8fafc;
        box-shadow: inset 0 0 0 2px #0ea5e9;
        z-index: 20;
      }
    }

    .day-header {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 8px;
    }

    .day-number {
      font-size: 0.875rem;
      font-weight: 600;
      color: #334155;
      transition: all 0.2s;
    }

    .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* Daily Mode Styles */
    .daily-mode-wrapper {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: auto;
    }

    .stats-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
        background: #f1f5f9;
        border-radius: 8px;
        padding: 6px 8px;
    }

    .stat-group {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;

        .label {
            font-size: 0.65rem;
            font-weight: 600;
            color: #64748b;
        }

        .val {
            font-size: 0.75rem;
            font-weight: 700;
            color: #1e293b;
        }

        &.success .val {
            color: #059669;
        }
    }

    .deadline-badge {
        background: #ef4444;
        color: white;
        text-align: center;
        font-size: 0.6rem;
        font-weight: 800;
        padding: 2px 6px;
        border-radius: 6px;
        letter-spacing: 0.05em;
        box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
    }

    /* Plan Pills */
    .plans-container {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .plan-pill {
        display: flex;
        align-items: center;
        gap: 6px;
        background: #ffffff;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 0.7rem;
        border: 1px solid #e2e8f0;
        transition: transform 0.1s;

        &:hover {
            transform: translateX(2px);
        }
        
        .pill-color {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }

        .name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: #475569;
            font-weight: 500;
        }

        .count {
            font-weight: 700;
            color: #1e293b;
        }
    }

    @media (max-width: 640px) {
      .day-cell {
        min-height: 100px;
        padding: 6px;
      }
      
      .day-number {
        font-size: 0.75rem;
      }

      .stats-row {
          padding: 4px;
      }
      
      .stat-group {
          .label { font-size: 0.55rem; }
          .val { font-size: 0.65rem; }
      }

      .plan-pill {
          padding: 2px 4px;
          gap: 4px;
          .pill-color { width: 6px; height: 6px; }
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
  @Input() actual: number = 0;
  @Input() events: any[] = [];
  @Input() isDeadline: boolean = false;
  @Input() plans: any[] = [];
  @Input() viewMode: 'daily-total' | 'progress-vs-plan' = 'daily-total';
}
