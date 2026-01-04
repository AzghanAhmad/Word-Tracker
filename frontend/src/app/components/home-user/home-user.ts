import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-home-user',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home-user.html',
  styleUrl: './home-user.scss',
})
export class HomeUserComponent implements OnInit {
  // Dashboard data
  todayProgress: number = 0;
  todayTarget: number = 0;
  isOnTrack: boolean = false;
  currentStreak: number = 0;
  activePlansCount: number = 0;
  progressPercentage: number = 0;

  isLoading: boolean = true;

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.isLoading = true;

    // Fetch dashboard stats (active plans count)
    this.apiService.getDashboardStats().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.activePlansCount = response.data.activePlans || 0;
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error fetching dashboard stats:', error);
      }
    });

    // Fetch stats (streak and today's progress)
    this.apiService.getStats().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const data = response.data;
          
          // Get current streak
          this.currentStreak = data.currentStreak || 0;

          // Get today's progress from allDaysData
          const today = new Date();
          const todayStr = this.formatDateKey(today);
          
          if (data.allDaysData && Array.isArray(data.allDaysData)) {
            const todayData = data.allDaysData.find((d: any) => d.date === todayStr);
            this.todayProgress = todayData ? (todayData.count || 0) : 0;
          }

          // Calculate today's target from active plans (will also calculate progress percentage and on-track status)
          this.calculateTodayTarget();
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching stats:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  calculateTodayTarget() {
    // Fetch plans to calculate today's target
    this.apiService.getPlans().subscribe({
      next: (response) => {
        if (response.success && response.data && Array.isArray(response.data)) {
          const activePlans = response.data.filter((p: any) => 
            !p.status || p.status !== 'archived'
          );

          let totalTarget = 0;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          activePlans.forEach((plan: any) => {
            if (plan.start_date && plan.end_date && plan.total_word_count) {
              const startDate = new Date(plan.start_date);
              const endDate = new Date(plan.end_date);
              startDate.setHours(0, 0, 0, 0);
              endDate.setHours(0, 0, 0, 0);

              // Only include if today is within plan date range
              if (today >= startDate && today <= endDate) {
                const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                const dailyTarget = totalDays > 0 ? Math.ceil(plan.total_word_count / totalDays) : 0;
                totalTarget += dailyTarget;
              }
            }
          });

          this.todayTarget = totalTarget;
          
          // Recalculate progress percentage and on-track status
          this.progressPercentage = this.todayTarget > 0 
            ? Math.min(100, Math.round((this.todayProgress / this.todayTarget) * 100))
            : 0;
          this.isOnTrack = this.todayProgress >= this.todayTarget * 0.8;
          
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error fetching plans for target calculation:', error);
      }
    });
  }

  formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
