import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <footer class="app-footer">
      <div class="footer-links">
        <a routerLink="/help">Help</a>
        <a routerLink="/feedback">Feedback</a>
        <a routerLink="/credits">Credits</a>
        <a routerLink="/privacy">Privacy</a>
        <a routerLink="/terms">Terms</a>
      </div>
      <p style="margin-top: 0.5rem;">&copy; 2026 ScribeCount. All rights reserved.</p>
    </footer>
  `,
  styles: [`
    .app-footer {
      padding: 1.5rem;
      text-align: center;
      background-color: #ffffff;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 0.875rem;
      width: 100%;

      .footer-links {
        display: flex;
        justify-content: center;
        gap: 1.5rem;
        margin-top: 0.5rem;
        flex-wrap: wrap;

        a {
          color: #64748b;
          text-decoration: none;
          transition: color 0.2s;

          &:hover {
            color: #007bff;
          }
        }
      }
    }
  `]
})
export class FooterComponent { }
