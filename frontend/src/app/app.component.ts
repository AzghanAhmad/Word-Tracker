import { Component, ViewChild, ViewEncapsulation, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { ToastComponent } from './components/shared/toast/toast.component';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, NavbarComponent, FooterComponent, ToastComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="app-wrapper">
      <!-- Unified Navbar -->
      <app-navbar 
        [isPublic]="isPublicPage" 
        [isMenuOpen]="getMenuOpenState()"
        (toggleSidebarEvent)="toggleSidebar()">
      </app-navbar>
      
      <div class="layout-body" [class.with-sidebar]="!isPublicPage">
        <!-- Sidebar and Main Content for Authenticated Layout -->
        <app-sidebar *ngIf="!isPublicPage" #sidebarComponent></app-sidebar>
        
        <main [class.main-content]="!isPublicPage" [class.public-content]="isPublicPage">
          <div class="content-wrapper">
            <router-outlet></router-outlet>
          </div>
          <app-footer></app-footer>
        </main>
      </div>
    </div>

    <!-- Global Toasts -->
    <app-toast></app-toast>
  `,
  styles: [`
    .app-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: #f9fafb;
    }

    .layout-body {
      display: flex;
      flex: 1;
      width: 100%;
      position: relative;
      margin-top: 80px; /* Offset for fixed navbar */
    }

    /* Public layout doesn't need flex container properties */
    .public-content {
      width: 100%;
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    /* Authenticated layout with sidebar */
    .main-content {
      flex: 1;
      margin-left: 250px; /* Sidebar width */
      transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      min-height: calc(100vh - 80px); /* Adjust for header height */
      display: flex;
      flex-direction: column;
      width: calc(100% - 250px);
      position: relative;
    }

    .content-wrapper {
      flex: 1;
      padding: 0;
      position: relative;
    }

    /* Responsiveness */
    @media (max-width: 1023px) {
      .main-content {
        margin-left: 0;
        width: 100%;
      }
      .layout-body {
        margin-top: 80px;
      }
    }
  `]
})
export class AppComponent implements AfterViewInit {
  @ViewChild('sidebarComponent') sidebarComponent!: SidebarComponent;

  isPublicPage = true;

  // Pages that should show the public layout (no sidebar)
  publicRoutes = ['/', '/login', '/register', '/privacy', '/terms', '/feedback', '/credits', '/forgot-password', '/forgot-username', '/contact'];

  constructor(private router: Router, private cdr: ChangeDetectorRef) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // Use setTimeout to avoid NG0100 by moving the state change to the next macrotask
      setTimeout(() => {
        this.isPublicPage = this.publicRoutes.includes(event.urlAfterRedirects) ||
          event.urlAfterRedirects === '';
        this.cdr.detectChanges();
      }, 0);
    });
  }

  ngAfterViewInit() {
    // Avoid NG0100 by deferring change detection
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  // State for the menu/sidebar
  private _isSidebarOpen = false;

  getMenuOpenState(): boolean {
    if (this.isPublicPage) {
      return this.isPublicMenuOpen;
    }
    return this._isSidebarOpen;
  }

  ngAfterViewChecked() {
    // Sync the sidebar collapsed state to our local state
    // Use setTimeout to avoid NG0100
    if (!this.isPublicPage && this.sidebarComponent) {
      const isCurrentlyOpen = !this.sidebarComponent.isCollapsed;
      if (this._isSidebarOpen !== isCurrentlyOpen) {
        setTimeout(() => {
          this._isSidebarOpen = isCurrentlyOpen;
          this.cdr.detectChanges();
        }, 0);
      }
    }
  }

  isPublicMenuOpen = false;

  closeMobileMenu() {
    this.isPublicMenuOpen = false;
  }

  toggleSidebar() {
    if (this.isPublicPage) {
      this.isPublicMenuOpen = !this.isPublicMenuOpen;
    } else if (this.sidebarComponent) {
      this.sidebarComponent.toggleSidebar();
      // The sync will happen in AfterViewChecked
    }
  }
}
