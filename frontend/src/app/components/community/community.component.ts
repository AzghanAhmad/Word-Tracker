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
          this.plans = response.data.map((plan: any) => {
            // Parse and format dates in local timezone
            let startDate = plan.start_date;
            let endDate = plan.end_date;
            
            if (startDate) {
              const parsedStartDate = this.parseDate(startDate);
              if (parsedStartDate) {
                startDate = this.formatDateLocal(parsedStartDate);
              }
            }
            
            if (endDate) {
              const parsedEndDate = this.parseDate(endDate);
              if (parsedEndDate) {
                endDate = this.formatDateLocal(parsedEndDate);
              }
            }
            
            return {
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
              start_date: startDate,
              end_date: endDate,
              status: plan.status,
              graph_data: plan.graph_data || [0, 0, 0, 0, 0]
            };
          });

          // Pre-calculate graph points and paths for performance
          this.plans.forEach(plan => {
            plan.graph_points = this.calculateGraphPoints(plan.graph_data);
            plan.graph_path = this.generatePathFromPoints(plan.graph_points);
          });

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

  private calculateGraphPoints(data: number[]): any[] {
    if (!data || data.length === 0) return [];
    const width = 280;
    const height = 60;
    const max = Math.max(...data, 10);
    const min = 0;

    return data.map((val, index) => {
      const x = data.length > 1
        ? (index / (data.length - 1)) * width
        : width / 2;
      const y = height - ((val - min) / (max - min)) * height;
      // Clamp y to keep inside view
      return {
        x,
        y: Math.min(Math.max(y, 4), height - 4),
        value: val
      };
    });
  }

  private generatePathFromPoints(points: any[]): string {
    if (!points || points.length === 0) return '';
    const pathPoints = points.map(p => `${p.x},${p.y}`);
    return `M ${pathPoints.join(' L ')}`;
  }

  // Helper function to format date in local timezone (YYYY-MM-DD)
  private formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Helper function to parse date from various formats
  private parseDate(dateValue: any): Date | null {
    if (!dateValue) return null;
    
    // Handle JSON string containing MySqlDateTime object
    if (typeof dateValue === 'string' && dateValue.startsWith('{')) {
      try {
        const parsed = JSON.parse(dateValue);
        if (parsed.Year && parsed.Month && parsed.Day) {
          return new Date(parsed.Year, parsed.Month - 1, parsed.Day);
        }
      } catch (e) {
        // If JSON parse fails, continue to other formats
      }
    }
    
    // Handle string dates (YYYY-MM-DD format from backend or ISO format)
    if (typeof dateValue === 'string') {
      let dateStr = dateValue;
      if (dateValue.includes('T')) {
        // If it's ISO format, parse as Date to handle timezone conversion
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date;
        }
        dateStr = dateValue.split('T')[0]; // Fallback: extract date part
      }
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
      }
      // Try standard Date parsing
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    
    // Handle MySqlDateTime-like objects (already parsed)
    if (dateValue && typeof dateValue === 'object') {
      if (dateValue.Year && dateValue.Month && dateValue.Day) {
        return new Date(dateValue.Year, dateValue.Month - 1, dateValue.Day);
      }
    }
    
    // Try standard Date parsing as fallback
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
}
