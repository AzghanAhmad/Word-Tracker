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
      padding: 0 0 1rem 0;
      background: transparent;
    }

    .month-title {
      font-size: 1.8rem;
      font-weight: 400;
      color: #666;
      margin: 0;
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .control-btn {
      background: #7a869a;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      
      &:hover {
        background: #6b778c;
      }
    }

    .nav-group {
      display: flex;
      background: #2c3e50;
      border-radius: 4px;
      overflow: hidden;

      .nav-btn {
        background: transparent;
        border: none;
        color: white;
        padding: 0.5rem 0.8rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-right: 1px solid #34495e;

        &:last-child {
          border-right: none;
        }

        &:hover {
          background: #34495e;
        }

        i {
          font-size: 0.8rem;
        }
      }
    }

    .view-group {
      display: flex;
      background: #2c3e50;
      border-radius: 4px;
      overflow: hidden;

      .view-btn {
        background: transparent;
        border: none;
        color: #95a5a6;
        padding: 0.5rem 1rem;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 500;
        border-right: 1px solid #34495e;

        &:last-child {
          border-right: none;
        }

        &:hover {
          color: white;
          background: #34495e;
        }

        &.active {
          background: #1a252f;
          color: white;
        }
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
