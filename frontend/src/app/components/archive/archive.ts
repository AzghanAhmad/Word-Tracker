import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';

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

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadArchivedItems();
  }

  loadArchivedItems() {
    this.isLoading = true;
    this.cdr.detectChanges();

    // Load archived plans
    this.apiService.getArchivedPlans().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.archivedPlans = response.data;
        }
        this.loadArchivedChecklists();
      },
      error: (err) => {
        console.error('Error loading archived plans:', err);
        this.loadArchivedChecklists();
      }
    });
  }

  loadArchivedChecklists() {
    this.apiService.getArchivedChecklists().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.archivedChecklists = response.data;
        }
        this.loadArchivedProjects();
      },
      error: (err) => {
        console.error('Error loading archived checklists:', err);
        this.loadArchivedProjects();
      }
    });
  }

  loadArchivedProjects() {
    this.apiService.getArchivedProjects().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.archivedProjects = response.data;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading archived projects:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  unarchivePlan(id: number) {
    if (confirm('Are you sure you want to restore this plan?')) {
      this.apiService.archivePlan(id, false).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadArchivedItems();
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
            this.loadArchivedItems();
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
            this.loadArchivedItems();
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
            this.loadArchivedItems();
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
            this.loadArchivedItems();
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
            this.loadArchivedItems();
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
}
