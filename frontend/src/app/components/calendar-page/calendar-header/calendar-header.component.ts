import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calendar-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="calendar-header-container">
      <h2 class="month-title">{{ monthName }}</h2>
      
      <div class="header-controls">
        <button class="control-btn today-btn" (click)="today.emit()">Today</button>
        
        <div class="nav-group">
          <button class="nav-btn prev" (click)="prev.emit()">
            <i class="fas fa-chevron-left"></i>
          </button>
          <button class="nav-btn next" (click)="next.emit()">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
        
        <div class="view-group">
          <button class="view-btn" [class.active]="currentView === 'weekly'" (click)="viewChange.emit('weekly')">Weekly</button>
          <button class="view-btn" [class.active]="currentView === 'monthly'" (click)="viewChange.emit('monthly')">Monthly</button>
          <button class="view-btn" [class.active]="currentView === 'yearly'" (click)="viewChange.emit('yearly')">Yearly</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .calendar-header-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0 1.5rem 0;
      background: transparent;
      gap: 1.5rem;
    }

    .month-title {
      font-size: 2rem;
      font-weight: 800;
      color: #1e293b;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .control-btn {
      background: #ffffff;
      color: #1e293b;
      border: 1px solid #e2e8f0;
      padding: 0.6rem 1.25rem;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 600;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      
      &:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        transform: translateY(-1px);
      }
    }

    .nav-group {
      display: flex;
      background: #e2e8f0;
      padding: 4px;
      border-radius: 8px;
      gap: 2px;

      .nav-btn {
        background: transparent;
        border: none;
        color: #64748b;
        padding: 0.5rem 1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(255,255,255,0.5);
          color: #1C2E4A;
        }

        i {
          font-size: 0.8rem;
        }
      }
    }

    .view-group {
      display: flex;
      background: #e2e8f0;
      padding: 4px;
      border-radius: 8px;
      gap: 4px;

        .view-btn {
          background: transparent;
          border: none;
          color: #64748b;
          padding: 0.5rem 1.25rem;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          border-radius: 6px;
          transition: all 0.2s ease;

          &:hover {
            color: #1C2E4A;
            background: rgba(255,255,255,0.5);
          }

          &.active {
            background: #1C2E4A;
            color: white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
        }
      }

    @media (max-width: 768px) {
      .calendar-header-container {
        flex-direction: column;
        align-items: flex-start;
        gap: 1.25rem;
        padding-bottom: 1rem;
      }
      
      .month-title {
        font-size: 1.5rem;
      }

      .header-controls {
        width: 100%;
        gap: 10px;
        flex-wrap: wrap;
      }

      .view-group {
        width: 100%;
        display: flex;
        justify-content: center;
        order: 3;
        
        .view-btn {
          flex: 1;
          padding: 0.5rem 0.5rem;
          font-size: 0.75rem;
        }
      }

      .control-btn {
        padding: 0.5rem 0.75rem;
        font-size: 0.8rem;
      }
    }
  `]
})
export class CalendarHeaderComponent {
  @Input() monthName: string = '';
  @Input() currentView: string = 'monthly';
  @Output() next = new EventEmitter<void>();
  @Output() prev = new EventEmitter<void>();
  @Output() today = new EventEmitter<void>();
  @Output() viewChange = new EventEmitter<string>();
}
