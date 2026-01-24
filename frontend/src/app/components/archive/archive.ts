import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface ArchivedItem {
  id: number;
  name?: string;
  title?: string;
  type: 'plan' | 'checklist';
  created_at: string;
  archived_at?: string;
}

@Component({
  selector: 'app-archive',
  standalone: true,
  imports: [CommonModule, RouterModule, ContentLoaderComponent],
  templateUrl: './archive.html',
  styleUrls: ['./archive.scss']
})
export class ArchiveComponent implements OnInit {
  archivedPlans: any[] = [];
  archivedChecklists: any[] = [];
  archivedProjects: any[] = [];
  isLoading = true;
  activeTab: 'plans' | 'checklists' | 'projects' = 'plans';

  // Pagination
  itemsPerPage = 20;
  plansPage = 1;
  checklistsPage = 1;
  projectsPage = 1;

  // Getters for counts to prevent change detection errors
  get plansCount(): number {
    return this.archivedPlans?.length || 0;
  }

  get checklistsCount(): number {
    return this.archivedChecklists?.length || 0;
  }

  get projectsCount(): number {
    return this.archivedProjects?.length || 0;
  }

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadArchivedItems();
  }

  loadArchivedItems() {
    this.isLoading = true;
    // Use setTimeout to defer reset - prevents change detection error during initial render
    setTimeout(() => {
      this.archivedPlans = [];
      this.archivedChecklists = [];
      this.archivedProjects = [];

      // Load all archived items in parallel using forkJoin
      forkJoin({
        plans: this.apiService.getArchivedPlans().pipe(
          catchError(err => {
            console.error('Error loading archived plans:', err);
            return of({ success: false, data: [] });
          })
        ),
        checklists: this.apiService.getArchivedChecklists().pipe(
          catchError(err => {
            console.error('Error loading archived checklists:', err);
            return of({ success: false, data: [] });
          })
        ),
        projects: this.apiService.getArchivedProjects().pipe(
          catchError(err => {
            console.error('Error loading archived projects:', err);
            return of({ success: false, data: [] });
          })
        )
      }).subscribe({
        next: (results) => {
          // Update all arrays in a single change detection cycle using setTimeout
          // This prevents ExpressionChangedAfterItHasBeenCheckedError
          setTimeout(() => {
            this.archivedPlans = results.plans?.success && results.plans?.data
              ? Array.isArray(results.plans.data) ? results.plans.data : []
              : [];
            this.archivedChecklists = results.checklists?.success && results.checklists?.data
              ? Array.isArray(results.checklists.data) ? results.checklists.data : []
              : [];
            this.archivedProjects = results.projects?.success && results.projects?.data
              ? Array.isArray(results.projects.data) ? results.projects.data : []
              : [];
            this.isLoading = false;
            this.cdr.markForCheck();
          }, 0);
        },
        error: (err) => {
          console.error('Error loading archived items:', err);
          setTimeout(() => {
            this.archivedPlans = [];
            this.archivedChecklists = [];
            this.archivedProjects = [];
            this.isLoading = false;
            this.cdr.markForCheck();
          }, 0);
        }
      });
    }, 0);
  }

  unarchivePlan(id: number) {
    if (confirm('Are you sure you want to restore this plan?')) {
      this.apiService.archivePlan(id, false).subscribe({
        next: (response) => {
          if (response.success) {
            // Reload after a short delay to avoid change detection issues
            setTimeout(() => {
              this.loadArchivedItems();
            }, 100);
          }
        },
        error: (err) => {
          console.error('Error unarchiving plan:', err);
        }
      });
    }
  }

  unarchiveChecklist(id: number) {
    if (confirm('Are you sure you want to restore this checklist?')) {
      this.apiService.archiveChecklist(id, false).subscribe({
        next: (response) => {
          if (response.success) {
            // Reload after a short delay to avoid change detection issues
            setTimeout(() => {
              this.loadArchivedItems();
            }, 100);
          }
        },
        error: (err) => {
          console.error('Error unarchiving checklist:', err);
        }
      });
    }
  }

  unarchiveProject(id: number) {
    if (confirm('Are you sure you want to restore this project?')) {
      this.apiService.archiveProject(id, false).subscribe({
        next: (response) => {
          if (response.success) {
            // Reload after a short delay to avoid change detection issues
            setTimeout(() => {
              this.loadArchivedItems();
            }, 100);
          }
        },
        error: (err) => {
          console.error('Error unarchiving project:', err);
        }
      });
    }
  }

  deletePlan(id: number) {
    if (confirm('Are you sure you want to permanently delete this plan? This action cannot be undone.')) {
      this.apiService.deletePlan(id).subscribe({
        next: (response) => {
          if (response.success) {
            // Reload after a short delay to avoid change detection issues
            setTimeout(() => {
              this.loadArchivedItems();
            }, 100);
          }
        },
        error: (err) => {
          console.error('Error deleting plan:', err);
        }
      });
    }
  }

  deleteChecklist(id: number) {
    if (confirm('Are you sure you want to permanently delete this checklist? This action cannot be undone.')) {
      this.apiService.deleteChecklist(id).subscribe({
        next: (response) => {
          if (response.success) {
            // Reload after a short delay to avoid change detection issues
            setTimeout(() => {
              this.loadArchivedItems();
            }, 100);
          }
        },
        error: (err) => {
          console.error('Error deleting checklist:', err);
        }
      });
    }
  }

  deleteProject(id: number) {
    if (confirm('Are you sure you want to permanently delete this project? This action cannot be undone.')) {
      this.apiService.deleteProject(id).subscribe({
        next: (response) => {
          if (response.success) {
            // Reload after a short delay to avoid change detection issues
            setTimeout(() => {
              this.loadArchivedItems();
            }, 100);
          }
        },
        error: (err) => {
          console.error('Error deleting project:', err);
        }
      });
    }
  }

  setActiveTab(tab: 'plans' | 'checklists' | 'projects') {
    this.activeTab = tab;
  }

  // Pagination Methods
  get paginatedPlans(): any[] {
    const startIndex = (this.plansPage - 1) * this.itemsPerPage;
    return this.archivedPlans.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get paginatedChecklists(): any[] {
    const startIndex = (this.checklistsPage - 1) * this.itemsPerPage;
    return this.archivedChecklists.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get paginatedProjects(): any[] {
    const startIndex = (this.projectsPage - 1) * this.itemsPerPage;
    return this.archivedProjects.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPlansPages(): number {
    return Math.ceil(this.archivedPlans.length / this.itemsPerPage);
  }

  get totalChecklistsPages(): number {
    return Math.ceil(this.archivedChecklists.length / this.itemsPerPage);
  }

  get totalProjectsPages(): number {
    return Math.ceil(this.archivedProjects.length / this.itemsPerPage);
  }

  setPage(page: number, type: 'plans' | 'checklists' | 'projects') {
    const totalPages = type === 'plans' ? this.totalPlansPages : (type === 'checklists' ? this.totalChecklistsPages : this.totalProjectsPages);
    if (page >= 1 && page <= totalPages) {
      if (type === 'plans') this.plansPage = page;
      else if (type === 'checklists') this.checklistsPage = page;
      else if (type === 'projects') this.projectsPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getPages(total: number, current: number): any[] {
    const delta = 2;
    const range = [];
    const rangeWithDots: any[] = [];
    let l;

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  }

  /**
   * Safely converts a date value to a string that can be used with DatePipe
   * Handles string, Date object, MySqlDateTime JSON string, or object with date properties
   */
  getDateString(dateValue: any): string {
    if (!dateValue) {
      return '';
    }

    // If it's already a string, check if it's a JSON object string (MySqlDateTime serialized)
    if (typeof dateValue === 'string') {
      // Check if it looks like a JSON object (starts with {)
      if (dateValue.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(dateValue);
          // Handle MySqlDateTime JSON format: {"IsValidDateTime":true,"Year":2025,"Month":12,"Day":29,...}
          if (parsed && typeof parsed === 'object' && parsed.Year && parsed.Month !== undefined && parsed.Day) {
            if (parsed.IsValidDateTime === true) {
              const year = parsed.Year;
              const month = String(parsed.Month).padStart(2, '0');
              const day = String(parsed.Day).padStart(2, '0');
              const hour = parsed.Hour !== undefined ? String(parsed.Hour).padStart(2, '0') : '00';
              const minute = parsed.Minute !== undefined ? String(parsed.Minute).padStart(2, '0') : '00';
              const second = parsed.Second !== undefined ? String(parsed.Second).padStart(2, '0') : '00';
              return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
            }
            return '';
          }
        } catch (e) {
          // Not JSON, try to parse as regular date string
        }
      }
      // Regular date string - validate it can be parsed
      try {
        const testDate = new Date(dateValue);
        if (!isNaN(testDate.getTime())) {
          return dateValue;
        }
      } catch (e) {
        // Invalid date string
        return '';
      }
      return dateValue;
    }

    // If it's a Date object, convert to ISO string
    if (dateValue instanceof Date) {
      return dateValue.toISOString();
    }

    // If it's an object, try to extract date string
    if (typeof dateValue === 'object') {
      // Handle MySqlDateTime object format directly
      if (dateValue.Year && dateValue.Month !== undefined && dateValue.Day) {
        if (dateValue.IsValidDateTime === true || dateValue.IsValidDateTime === undefined) {
          const year = dateValue.Year;
          const month = String(dateValue.Month).padStart(2, '0');
          const day = String(dateValue.Day).padStart(2, '0');
          const hour = dateValue.Hour !== undefined ? String(dateValue.Hour).padStart(2, '0') : '00';
          const minute = dateValue.Minute !== undefined ? String(dateValue.Minute).padStart(2, '0') : '00';
          const second = dateValue.Second !== undefined ? String(dateValue.Second).padStart(2, '0') : '00';
          return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
        }
        return '';
      }

      // Try common date object properties
      if (dateValue.date) {
        return this.getDateString(dateValue.date);
      }
      if (dateValue.value) {
        return this.getDateString(dateValue.value);
      }

      // Try to parse as JSON string and extract date
      try {
        const jsonStr = JSON.stringify(dateValue);
        return this.getDateString(jsonStr); // Recursively parse the JSON string
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    // Fallback: try to convert to string and parse as date
    try {
      const dateStr = String(dateValue);
      return this.getDateString(dateStr); // Recursively try string parsing
    } catch (e) {
      // Ignore conversion errors
    }

    // Last resort: return empty string
    return '';
  }
}
