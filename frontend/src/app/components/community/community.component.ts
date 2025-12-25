import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { filter } from 'rxjs/operators';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, FormsModule, ContentLoaderComponent],
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.scss']
})
export class CommunityComponent implements OnInit {
  plans: any[] = [];
  filteredPlans: any[] = [];
  isLoading = true;

  // Filters
  selectedActivity: string = 'Any';
  selectedContent: string = 'Any';

  activities = ['Any', 'Writing', 'Editing', 'Proofreading', 'Revising'];
  contentTypes = ['Any', 'Novel', 'Short Story', 'Thesis', 'Blog', 'Essay', 'Script', 'Non-Fiction', 'Book'];

  constructor(
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    // Initial fetch from backend
    this.fetchCommunityPlans();
    
    // Reload on navigation back to this page
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      if (event.url === '/community') {
        this.fetchCommunityPlans();
      }
    });
  }

  fetchCommunityPlans() {
    this.isLoading = true;
    this.cdr.detectChanges();
    
    const userType = localStorage.getItem('user_type');

    // Use mock data for demo users
    if (userType === 'demo') {
      this.plans = [];
      this.applyFilters();
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    // Fetch public plans from backend
    this.apiService.getCommunityPosts().subscribe({
      next: (response) => {
        console.log('Community response:', response);
        if (response.success && response.data) {
          // Map public plans for display
          this.plans = response.data.map((plan: any) => ({
            id: plan.id,
            title: plan.title,
            goal_amount: plan.goal_amount || 0,
            goal_unit: plan.goal_unit || 'words',
            progress_percent: plan.progress_percent || 0,
            total_progress: plan.total_progress || 0,
            activity_type: plan.activity_type || 'Writing',
            content_type: plan.content_type || 'Novel',
            creator_username: plan.creator_username || 'Anonymous',
            description: plan.description || '',
            start_date: plan.start_date,
            end_date: plan.end_date,
            status: plan.status,
            graph_data: plan.graph_data || [0, 0, 0, 0, 0]
          }));
        } else {
          this.plans = [];
        }
        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching community plans:', error);
        this.plans = [];
        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
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
