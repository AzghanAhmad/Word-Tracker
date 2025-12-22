import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-public-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav class="public-navbar">
      <div class="nav-container">
        <div class="nav-left">
          <a routerLink="/" class="logo">
            <div class="logo-icon">W</div>
            <span class="logo-text">Word Tracker</span>
          </a>
          <div class="nav-links">
            <a href="#features">Features</a>
            <a href="#community">Community</a>
          </div>
        </div>
        <div class="nav-right">
          <a routerLink="/login" class="btn-login">Log In</a>
          <a routerLink="/register" class="btn-signup">Sign Up</a>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .public-navbar {
      background: white;
      border-bottom: 1px solid #e2e8f0;
      padding: 1rem 0;
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .nav-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .nav-left {
      display: flex;
      align-items: center;
      gap: 3rem;

      .logo {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        text-decoration: none;

        .logo-icon {
          width: 32px;
          height: 32px;
          background: #3b82f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
        }

        .logo-text {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
        }
      }

      .nav-links {
        display: flex;
        gap: 2rem;

        a {
          color: #64748b;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;

          &:hover {
            color: #3b82f6;
          }
        }
      }
    }

    .nav-right {
      display: flex;
      align-items: center;
      gap: 1rem;

      .btn-login {
        color: #64748b;
        text-decoration: none;
        font-weight: 600;
        padding: 0.5rem 1rem;
        transition: color 0.2s;

        &:hover {
          color: #0f172a;
        }
      }

      .btn-signup {
        background: #3b82f6;
        color: white;
        text-decoration: none;
        padding: 0.6rem 1.25rem;
        border-radius: 6px;
        font-weight: 600;
        transition: background 0.2s;

        &:hover {
          background: #2563eb;
        }
      }
    }

    @media (max-width: 768px) {
      .nav-left .nav-links { display: none; }
    }
  `]
})
export class PublicNavbarComponent { }
