import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-public-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  encapsulation: ViewEncapsulation.None,
  template: `
    <nav class="public-navbar">
      <div class="nav-container">
        <!-- Logo Section -->
        <div class="nav-left">
          <a routerLink="/" class="logo">
            <span class="logo-text">ScribeCount</span>
          </a>
          <!-- Desktop Navigation Links -->
          <div class="nav-links desktop-only">
            <a href="#features">Features</a>
            <a href="#community">Community</a>
          </div>
        </div>

        <!-- Desktop Auth Buttons -->
        <div class="nav-right desktop-only">
          <a routerLink="/login" class="btn-login">Log In</a>
          <a routerLink="/register" class="btn-signup">Sign Up</a>
        </div>

        <!-- Mobile Menu Toggle -->
        <button class="mobile-menu-toggle" (click)="toggleMobileMenu()" [class.active]="isMobileMenuOpen">
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>
      </div>

      <!-- Mobile Menu -->
      <div class="mobile-menu" [class.active]="isMobileMenuOpen">
        <div class="mobile-links">
          <a href="#features" (click)="closeMobileMenu()">Features</a>
          <a href="#community" (click)="closeMobileMenu()">Community</a>
        </div>
        <div class="mobile-auth">
          <a routerLink="/login" class="btn-login" (click)="closeMobileMenu()">Log In</a>
          <a routerLink="/register" class="btn-signup" (click)="closeMobileMenu()">Sign Up</a>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    /* ============================================
       BASE NAVBAR STYLES
       ============================================ */
    .public-navbar {
      background: white;
      border-bottom: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }

    .nav-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* ============================================
       LOGO SECTION
       ============================================ */
    .nav-left {
      display: flex;
      align-items: center;
      gap: 3rem;
      flex: 1;

      .logo {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        text-decoration: none;
        transition: opacity 0.2s;
        white-space: nowrap;

        &:hover {
          opacity: 0.8;
        }

        .logo-text {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.02em;
        }
      }

      .nav-links {
        display: flex;
        gap: 2rem;

        a {
          color: #64748b;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.938rem;
          transition: color 0.2s;
          position: relative;

          &:hover {
            color: #3b82f6;
          }

          &::after {
            content: '';
            position: absolute;
            bottom: -4px;
            left: 0;
            width: 0;
            height: 2px;
            background: #3b82f6;
            transition: width 0.3s;
          }

          &:hover::after {
            width: 100%;
          }
        }
      }
    }

    /* ============================================
       AUTH BUTTONS (DESKTOP)
       ============================================ */
    .nav-right {
      display: flex;
      align-items: center;
      gap: 1rem;

      .btn-login {
        color: #374151;
        text-decoration: none;
        font-weight: 600;
        padding: 0.5rem 1.25rem;
        border-radius: 8px;
        font-size: 0.938rem;
        transition: all 0.2s;

        &:hover {
          background: #f3f4f6;
          color: #1f2937;
        }
      }

      .btn-signup {
        background: #3b82f6;
        color: white;
        text-decoration: none;
        padding: 0.6rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.938rem;
        transition: all 0.2s;
        box-shadow: 0 1px 3px rgba(59, 130, 246, 0.3);

        &:hover {
          background: #2563eb;
          box-shadow: 0 4px 6px rgba(59, 130, 246, 0.4);
          transform: translateY(-1px);
        }

        &:active {
          transform: translateY(0);
        }
      }
    }

    /* ============================================
       MOBILE MENU TOGGLE
       ============================================ */
    .mobile-menu-toggle {
      display: none;
      flex-direction: column;
      justify-content: space-around;
      width: 32px;
      height: 32px;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      z-index: 10;

      .hamburger-line {
        width: 100%;
        height: 3px;
        background: #374151;
        border-radius: 10px;
        transition: all 0.3s ease;
        transform-origin: center;
      }

      &.active {
        .hamburger-line:nth-child(1) {
          transform: rotate(45deg) translateY(10px);
        }

        .hamburger-line:nth-child(2) {
          opacity: 0;
        }

        .hamburger-line:nth-child(3) {
          transform: rotate(-45deg) translateY(-10px);
        }
      }
    }

    /* ============================================
       MOBILE MENU
       ============================================ */
    .mobile-menu {
      display: none;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
      background: white;
      border-top: 1px solid #e2e8f0;

      &.active {
        max-height: 400px;
        padding: 1rem 0;
      }

      .mobile-links {
        display: flex;
        flex-direction: column;
        padding: 0 2rem;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 1rem;
        margin-bottom: 1rem;

        a {
          color: #374151;
          text-decoration: none;
          font-weight: 500;
          padding: 0.875rem 1rem;
          border-radius: 8px;
          transition: all 0.2s;

          &:hover {
            background: #f3f4f6;
            color: #3b82f6;
          }
        }
      }

      .mobile-auth {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 0 2rem;

        .btn-login,
        .btn-signup {
          width: 100%;
          text-align: center;
          padding: 0.875rem 1rem;
          font-size: 1rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-login {
          color: #374151;
          background: #f3f4f6;

          &:hover {
            background: #e5e7eb;
          }
        }

        .btn-signup {
          background: #3b82f6;
          color: white;
          box-shadow: 0 1px 3px rgba(59, 130, 246, 0.3);

          &:hover {
            background: #2563eb;
          }
        }
      }
    }

    /* ============================================
       RESPONSIVE BREAKPOINTS
       ============================================ */

    /* Desktop Only Elements */
    .desktop-only {
      display: flex;
    }

    /* Tablet (< 1024px) */
    @media (max-width: 1024px) {
      .nav-container {
        padding: 1rem 1.5rem;
      }

      .nav-left {
        gap: 2rem;

        .nav-links {
          gap: 1.5rem;
        }
      }

      .nav-right {
        gap: 0.75rem;

        .btn-login,
        .btn-signup {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
        }
      }
    }

    /* Mobile (< 768px) */
    @media (max-width: 768px) {
      .nav-container {
        padding: 0.875rem 1rem;
      }

      .nav-left {
        gap: 0;

        .logo {
          .logo-text {
            font-size: 1.35rem;
          }
        }
      }

      /* Hide desktop elements */
      .desktop-only {
        display: none !important;
      }

      /* Show mobile menu toggle */
      .mobile-menu-toggle {
        display: flex;
      }

      /* Show mobile menu */
      .mobile-menu {
        display: block;
      }
    }

    /* Small Mobile (< 480px) */
    @media (max-width: 480px) {
      .nav-container {
        padding: 0.75rem 1rem;
      }

      .nav-left .logo {
        .logo-text {
          font-size: 1.2rem;
        }
      }

      .mobile-menu-toggle {
        width: 28px;
        height: 28px;

        .hamburger-line {
          height: 2.5px;
        }

        &.active {
          .hamburger-line:nth-child(1) {
            transform: rotate(45deg) translateY(8px);
          }

          .hamburger-line:nth-child(3) {
            transform: rotate(-45deg) translateY(-8px);
          }
        }
      }

      .mobile-menu {
        .mobile-links,
        .mobile-auth {
          padding: 0 1rem;
        }

        .mobile-links a {
          padding: 0.75rem 0.875rem;
          font-size: 0.95rem;
        }

        .mobile-auth {
          .btn-login,
          .btn-signup {
            padding: 0.75rem 0.875rem;
            font-size: 0.95rem;
          }
        }
      }
    }

    /* Extra Small Mobile (< 375px) */
    @media (max-width: 375px) {
      .nav-left .logo {
        .logo-text {
          font-size: 1.1rem;
        }
      }
    }
  `]
})
export class PublicNavbarComponent {
  isMobileMenuOpen = false;

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }
}
