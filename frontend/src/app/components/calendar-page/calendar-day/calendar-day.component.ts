import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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
        <div class="deadline-badge" *ngIf="isDeadline">DEADLINE</div>
        
        <!-- Daily Total Mode: Show separate boxes for planned and actual words -->
        <div *ngIf="viewMode === 'daily-total' && plans && plans.length > 0" class="daily-total-container">
          <div class="total-box planned-box">
            <span class="total-label">Planned</span>
            <span class="total-words">{{ getTotalPlannedWords() | number }} words</span>
          </div>
          
          <div class="total-box actual-box" *ngIf="getTotalActualWords() > 0">
            <span class="total-label">Progress</span>
            <span class="total-words">{{ getTotalActualWords() | number }} words</span>
          </div>

          <!-- Missed Badge for past dates if progress < planned -->
          <div class="total-box missed-box" *ngIf="isPastDate() && getTotalActualWords() < getTotalPlannedWords()">
            <span class="total-label">Missed</span>
            <span class="total-words">{{ (getTotalPlannedWords() - getTotalActualWords()) | number }} words</span>
          </div>
        </div>
        
        <!-- Progress vs Plan Mode: Show individual plan pills -->
        <div *ngIf="viewMode === 'progress-vs-plan' && plans && plans.length > 0" class="plans-container">
          <div *ngFor="let plan of plans; trackBy: trackByPlanId" class="plan-pill" 
               [style.background-color]="plan.dashboard_color || plan.color_code || '#273853'"
               [class.pill-completed]="plan.actualProgress >= (plan.dailyTarget || 0) && (plan.dailyTarget || 0) > 0"
               [class.pill-missed]="isPastDate() && (!plan.actualProgress || plan.actualProgress < (plan.dailyTarget || 0))"
               (click)="onPlanClick($event, plan)">
             <div class="pill-color"></div>
             <span class="name">{{ plan.title || plan.plan_name }}</span>
             <span class="plan-stats">
               <span class="actual-count">{{ (plan.actualProgress || 0) | number }}</span>
               <span class="separator" *ngIf="plan.dailyTarget > 0">/</span>
               <span class="target-count" *ngIf="plan.dailyTarget > 0">{{ plan.dailyTarget | number }}</span>
             </span>
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
      border: 1px solid #f1f5f9;

      &:hover {
        background-color: #f8fafc;
        border-color: #e2e8f0;
        z-index: 10;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      }

      &.other-month {
        background-color: #fafbfc;
        opacity: 0.5;
        
        .day-number {
          color: #cbd5e1;
        }
      }

      &.today {
        background-color: #f0f9ff;
        border: 2px solid #0ea5e9;
        .day-number {
          background: #0ea5e9;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          box-shadow: 0 2px 4px rgba(14, 165, 233, 0.2);
        }
      }

      &.selected {
        background-color: #f8fafc;
        border: 2px solid #0ea5e9;
        z-index: 20;
      }
    }

    .day-header {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 8px;
    }

    .day-number {
      font-size: 0.825rem;
      font-weight: 600;
      color: #64748b;
    }

    .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .deadline-badge {
        background: #ef4444;
        color: white;
        text-align: center;
        font-size: 0.55rem;
        font-weight: 800;
        padding: 2px 4px;
        border-radius: 4px;
        letter-spacing: 0.05em;
        margin-bottom: 4px;
    }

    .daily-total-container {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: auto;
    }

    .total-box {
        padding: 4px 8px;
        border-radius: 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.7rem;
        transition: all 0.2s;

        &:hover {
          filter: brightness(0.95);
        }
    }

    .planned-box {
        background: #eff6ff;
        color: #1d4ed8;
        border: 1px solid #dbeafe;
    }

    .actual-box {
        background: #f0fdf4;
        color: #15803d;
        border: 1px solid #dcfce7;
    }

    .missed-box {
        background: #fef2f2;
        color: #b91c1c;
        border: 1px solid #fee2e2;
    }

    .total-label {
        font-weight: 600;
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.02em;
    }

    .total-words {
        font-weight: 700;
    }

    /* Plan Pills */
    .plans-container {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .plan-pill {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 0.7rem;
        color: #ffffff;
        background: #111827 !important; // Match the black pill in the image
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        margin-bottom: 2px;
        
        .name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-weight: 700;
            color: #22d3ee; // Cyan title as in image
        }

        .plan-stats {
            flex-shrink: 0;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 2px;
            color: #ffffff;

            .separator {
                color: #f59e0b; // Orange separator as in image
                font-weight: 800;
                margin: 0 2px;
            }

            .target-count {
                opacity: 0.9;
            }
        }

        &.pill-completed {
          border-left: 3px solid #10b981;
        }

        &.pill-missed {
          border-left: 3px solid #ef4444;
        }
    }

    @media (max-width: 640px) {
      .day-cell {
        min-height: 100px;
        padding: 4px;
      }
      
      .total-box {
          padding: 2px 4px;
          .total-label { display: none; }
          .total-words { font-size: 0.65rem; }
      }
    }
  `]
})
export class CalendarDayComponent {
  private router = inject(Router);

  @Input() date: Date = new Date();
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

  onPlanClick(event: MouseEvent, plan: any) {
    event.stopPropagation();
    const planId = plan.id || plan.plan_id;
    if (planId) {
      this.router.navigate(['/plans', planId]);
    }
  }

  isPastDate(): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellDate = new Date(this.date);
    cellDate.setHours(0, 0, 0, 0);
    return cellDate.getTime() < today.getTime();
  }

  // Debug: log when plans change
  ngOnChanges(changes: SimpleChanges) {
    if (changes['plans'] && this.isCurrentMonth) {
      const plans = changes['plans'].currentValue || [];
      if (plans.length > 0) {
        console.log(`Calendar Day - Day ${this.dayNumber}, Plans: ${plans.length}`, plans.map(p => p.title || p.plan_name));
      }
    }
  }

  trackByPlanId(index: number, plan: any): any {
    return plan.id || index;
  }

  getTotalWords(): number {
    if (!this.plans || this.plans.length === 0) {
      return 0;
    }

    // Sum up all words (actual progress if available, otherwise target)
    return this.plans.reduce((total, plan) => {
      const words = (plan.actualProgress && plan.actualProgress > 0)
        ? plan.actualProgress
        : (plan.dailyTarget || 0);
      return total + words;
    }, 0);
  }

  getTotalActualWords(): number {
    if (!this.plans || this.plans.length === 0) {
      return 0;
    }

    // Sum up all actual words across all plans
    return this.plans.reduce((total, plan) => {
      return total + (plan.actualProgress || 0);
    }, 0);
  }

  getTotalPlannedWords(): number {
    if (!this.plans || this.plans.length === 0) {
      return 0;
    }

    // Sum up all planned/target words across all plans
    return this.plans.reduce((total, plan) => {
      return total + (plan.dailyTarget || 0);
    }, 0);
  }
}
