import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { MockDataService } from '../../services/mock-data.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats: any = {
    totalPlans: 0,
    totalWords: 0,
    activePlans: 0,
    completedPlans: 0
  };
  plans: any[] = [];

  constructor(
    private apiService: ApiService,
    private mockData: MockDataService
  ) { }

  ngOnInit() {
    const userType = localStorage.getItem('user_type');

    // Fetch real dashboard stats from backend
    this.apiService.getDashboardStats().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          console.log('Dashboard stats:', response.data);
          this.stats = response.data;
        }
      },
      error: (error) => {
        console.error('Error fetching dashboard stats:', error);
        // Fallback to mock data on error
        if (userType !== 'demo') this.stats = this.mockData.generateMockStats();
      }
    });

    // Fetch real plans from backend
    this.apiService.getPlans().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.plans = response.data.map((p: any) => ({
            ...p,
            progress: p.target_amount > 0 ? Math.round((p.completed_amount / p.target_amount) * 100) : 0
          }));
        }
      },
      error: (error) => {
        console.error('Error fetching plans:', error);
        if (userType !== 'demo') this.plans = this.mockData.generateMockPlans(8);
      }
    });
  }
}
