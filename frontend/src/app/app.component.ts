import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { PublicNavbarComponent } from './components/public-navbar/public-navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { ToastComponent } from './components/shared/toast/toast.component';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, NavbarComponent, PublicNavbarComponent, FooterComponent, ToastComponent],
  template: `
    <div *ngIf="isPublicPage" class="public-layout">
      <app-public-navbar></app-public-navbar>
      <div class="content-wrapper">
        <router-outlet></router-outlet>
      </div>
      <app-footer></app-footer>
    </div>
    <!-- Logged-in Layout (With Sidebar) -->
    <div *ngIf="!isPublicPage" class="app-container">
      <app-sidebar #sidebarComponent></app-sidebar>
      
      <div class="main-content">
        <app-navbar (toggleSidebarEvent)="toggleSidebar()"></app-navbar>
        <div class="content-wrapper">
          <router-outlet></router-outlet>
        </div>
        
        <app-footer></app-footer>
      </div>
    </div>

    <!-- Global Toasts -->
    <app-toast></app-toast>
  `,
  styles: [`
    .public-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: #f9fafb;
    }

    .app-container {
      display: flex;
      min-height: 100vh;
      background-color: #f9fafb;
      position: relative;
      overflow-x: hidden;
    }

    .main-content {
      flex: 1;
      margin-left: 260px;
      transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      width: calc(100% - 260px);
      position: relative;
    }

    .content-wrapper {
      flex: 1;
      padding: 0;
      position: relative;
      background-color: #f9fafb;
    }

    /* Mobile & Small Tablets (< 768px) */
    @media (max-width: 767px) {
      .app-container {
        flex-direction: column;
      }

      .main-content {
        margin-left: 0 !important;
        width: 100% !important;
        padding-top: 0;
      }

      .content-wrapper {
        padding: 0;
        overflow-x: hidden;
      }
    }

    /* Tablets (768px - 1023px) */
    @media (min-width: 768px) and (max-width: 1023px) {
      .main-content {
        margin-left: 250px;
        width: calc(100% - 250px);
      }
    }

    /* Desktop (1024px+) */
    @media (min-width: 1024px) {
      .main-content {
        margin-left: 260px;
        width: calc(100% - 260px);
      }
    }

    /* Large Desktop (1440px+) */
    @media (min-width: 1440px) {
      .content-wrapper {
        width: 100%;
        margin: 0 auto;
      }
    }
  `]
})
export class AppComponent {
  @ViewChild('sidebarComponent') sidebarComponent!: SidebarComponent;

  isPublicPage = true;

  // Pages that should show the public layout (no sidebar)
  publicRoutes = ['/', '/login', '/register', '/privacy', '/terms', '/feedback', '/credits'];

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isPublicPage = this.publicRoutes.includes(event.urlAfterRedirects) ||
        event.urlAfterRedirects === '';
    });
  }


  toggleSidebar() {
    // Call the sidebar's toggle method directly
    if (this.sidebarComponent) {
      this.sidebarComponent.toggleSidebar();
    }
  }
}
