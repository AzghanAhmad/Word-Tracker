import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h2>Reset Password</h2>
        <p>Enter your email address and we'll send you a link to reset your password.</p>
        <div class="form-group">
          <input type="email" placeholder="Email Address" class="form-input">
        </div>
        <button class="btn-primary">Send Reset Link</button>
        <div class="auth-footer">
          <a routerLink="/login">Back to Login</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 2rem;
    }
    .auth-card {
      background: white;
      padding: 2.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      width: 100%;
      max-width: 400px;
    }
    h2 { margin-bottom: 1rem; color: #1a202c; }
    p { color: #64748b; margin-bottom: 1.5rem; }
    .form-group { margin-bottom: 1rem; }
    .form-input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 1rem;
    }
    .btn-primary {
      width: 100%;
      padding: 0.75rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }
    .auth-footer { margin-top: 1.5rem; text-align: center; }
    .auth-footer a { color: #3b82f6; text-decoration: none; font-size: 0.9rem; }
  `]
})
export class ForgotPasswordComponent {}
