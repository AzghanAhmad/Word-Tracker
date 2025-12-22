import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { MockDataService } from '../../services/mock-data.service';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.scss']
})
export class CommunityComponent implements OnInit {
  plans: any[] = [];
  filteredPlans: any[] = [];

  // Filters
  selectedActivity: string = 'Any';
  selectedContent: string = 'Any';

  activities = ['Any', 'Writing', 'Editing', 'Proofreading', 'Revising'];
  contentTypes = ['Any', 'Novel', 'Short Story', 'Thesis', 'Blog', 'Essay', 'Script', 'Non-Fiction', 'Book'];

  constructor(
    private apiService: ApiService,
    private router: Router,
    private mockData: MockDataService
  ) { }

  ngOnInit() {
    // Initial fetch from backend
    this.fetchCommunityPlans();
  }

  fetchCommunityPlans() {
    const userType = localStorage.getItem('user_type');

    // Use mock data for demo users
    if (userType === 'demo') {
      this.plans = this.mockData.generateMockCommunityPlans(12);
      this.applyFilters();
      return;
    }

    // Fetch community posts from C backend
    this.apiService.getCommunityPosts().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Map community posts to plan format for display
          this.plans = response.data.map((post: any) => ({
            id: post.id,
            plan_name: post.title,
            author: post.author,
            content: post.content,
            likes: post.likes,
            comments: post.comments,
            created_at: post.created_at,
            // Add mock fields for filtering
            activity_type: 'Writing',
            content_type: 'Blog',
            daily_data: []
          }));
        } else {
          this.plans = [];
        }
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error fetching community posts:', error);
        this.plans = [];
        this.applyFilters();
      }
    });
  }

  applyFilters() {
    this.filteredPlans = this.plans.filter(plan => {
      const matchActivity = this.selectedActivity === 'Any' ||
        (plan.activity_type && plan.activity_type.toLowerCase().includes(this.selectedActivity.toLowerCase()));

      const matchContent = this.selectedContent === 'Any' ||
        (plan.content_type && plan.content_type.toLowerCase().includes(this.selectedContent.toLowerCase()));

      return matchActivity && matchContent;
    });
  }

  openPlan(planId: number) {
    this.router.navigate(['/plan', planId]);
  }

  getSparklinePath(data: number[]): string {
    if (!data || data.length === 0) return '';
    const width = 280;
    const height = 60;
    // For visual variety, scale data
    const max = Math.max(...data, 10);
    const min = 0;

    const points = data.map((val, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((val - min) / (max - min)) * height;
      // Add slight padding to avoid cutting off stroke
      return `${x},${Math.min(Math.max(y, 2), height - 2)}`;
    });

    return `M ${points.join(' L ')}`;
  }
}
