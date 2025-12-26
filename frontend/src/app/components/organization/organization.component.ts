import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { filter, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

interface Project {
  id?: number;
  name: string;
  subtitle?: string;
  description?: string;
  is_private?: boolean;
  created_at?: string;
}

@Component({
  selector: 'app-organization',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './organization.component.html',
  styleUrls: ['./organization.component.scss']
})
export class OrganizationComponent implements OnInit, OnDestroy {
  projects: Project[] = [];
  isLoading = false;
  showCreateForm = false;
  showEditForm = false;
  selectedProject: Project | null = null;
  errorMessage: string = '';
  private routerSubscription?: Subscription;

  newProject: Project = {
    name: '',
    subtitle: '',
    description: '',
    is_private: false
  };

  constructor(
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    // Load data on initial load
    this.loadProjects();

    // Subscribe to router events to reload data when navigating to this route
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // Reload data when navigating to organization route
      if (event.urlAfterRedirects.includes('/organization-plan')) {
        this.loadProjects();
      }
    });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  loadProjects() {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges(); // Force initial loader display

    this.apiService.getProjects()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges(); // Force update on complete
        })
      )
      .subscribe({
        next: (response: any) => {
          if (response.success || Array.isArray(response)) {
            this.projects = response.data || response || [];
          } else {
            this.projects = [];
          }
        },
        error: (err: any) => {
          console.error('Failed to load projects', err);
          this.errorMessage = err.error?.message || 'Failed to load projects. Please try again.';
          this.projects = [];
          this.cdr.detectChanges(); // Force update on error
        }
      });
  }

  toggleCreateForm() {
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false;
    this.selectedProject = null;
    if (!this.showCreateForm) {
      this.newProject = { name: '', subtitle: '', description: '', is_private: false };
    }
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  createProject() {
    if (!this.newProject.name?.trim()) {
      this.errorMessage = 'Project name is required';
      this.cdr.detectChanges();
      return;
    }

    if (this.newProject.name.length > 255) {
      this.errorMessage = 'Project name must be 255 characters or less';
      this.cdr.detectChanges();
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;
    this.cdr.detectChanges();

    this.apiService.createProject(this.newProject)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            this.showCreateForm = false;
            this.newProject = { name: '', subtitle: '', description: '', is_private: false };
            this.loadProjects();
          } else {
            this.errorMessage = res.message || 'Failed to create project';
          }
        },
        error: (err: any) => {
          console.error('Failed to create project', err);
          this.errorMessage = err.error?.message || 'Failed to create project. Please try again.';
        }
      });
  }

  editProject(project: Project) {
    this.selectedProject = { ...project };
    this.showEditForm = true;
    this.showCreateForm = false;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  cancelEdit() {
    this.showEditForm = false;
    this.selectedProject = null;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  updateProject() {
    if (!this.selectedProject) return;

    if (!this.selectedProject.name?.trim()) {
      this.errorMessage = 'Project name is required';
      this.cdr.detectChanges();
      return;
    }

    if (this.selectedProject.name.length > 255) {
      this.errorMessage = 'Project name must be 255 characters or less';
      this.cdr.detectChanges();
      return;
    }

    if (!this.selectedProject.id) {
      this.errorMessage = 'Invalid project ID';
      this.cdr.detectChanges();
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;
    this.cdr.detectChanges();

    this.apiService.updateProject(this.selectedProject.id, {
      name: this.selectedProject.name,
      subtitle: this.selectedProject.subtitle,
      description: this.selectedProject.description,
      is_private: this.selectedProject.is_private
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            this.showEditForm = false;
            this.selectedProject = null;
            this.loadProjects();
          } else {
            this.errorMessage = res.message || 'Failed to update project';
          }
        },
        error: (err: any) => {
          console.error('Failed to update project', err);
          this.errorMessage = err.error?.message || 'Failed to update project. Please try again.';
        }
      });
  }

  deleteProject(project: Project) {
    if (!project.id) return;

    if (!confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;
    this.cdr.detectChanges();

    this.apiService.deleteProject(project.id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            this.loadProjects();
          } else {
            this.errorMessage = res.message || 'Failed to delete project';
          }
        },
        error: (err: any) => {
          console.error('Failed to delete project', err);
          this.errorMessage = err.error?.message || 'Failed to delete project. Please try again.';
        }
      });
  }

  viewProjectDetails(project: Project) {
    // Navigate to project details page or show modal
    // Future: Implement project details view
    // For now, clicking on project card does nothing
  }
}
