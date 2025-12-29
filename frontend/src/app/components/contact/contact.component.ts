import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="contact-container">
      <div class="contact-header">
        <h1>Contact Support</h1>
        <p>Have a question or need technical assistance? We're here to help.</p>
      </div>

      <div class="contact-grid">
        <div class="contact-info">
          <div class="info-card">
            <i class="fas fa-envelope"></i>
            <h3>Email Us</h3>
            <p>support&#64;wordtracker.com</p>
            <span>We usually respond within 24 hours.</span>
          </div>
          <div class="info-card">
            <i class="fas fa-comments"></i>
            <h3>Community Forum</h3>
            <p>Join the discussion</p>
            <a href="#" class="link">Visit Forum</a>
          </div>
        </div>

        <form (ngSubmit)="onSubmit()" class="contact-form">
          <div class="form-group">
            <label for="name">Name</label>
            <input type="text" id="name" [(ngModel)]="contactForm.name" name="name" required placeholder="Your Name">
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" [(ngModel)]="contactForm.email" name="email" required placeholder="Your Email">
          </div>
          <div class="form-group">
            <label for="subject">Subject</label>
            <select id="subject" [(ngModel)]="contactForm.subject" name="subject" required>
              <option value="">Select a topic</option>
              <option value="technical">Technical Issue</option>
              <option value="feature">Feature Request</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label for="message">Message</label>
            <textarea id="message" [(ngModel)]="contactForm.message" name="message" required placeholder="How can we help?" rows="5"></textarea>
          </div>
          <button type="submit" class="btn-submit">Send Message</button>
          
          <div *ngIf="submitted" class="success-message">
            <i class="fas fa-check-circle"></i>
            <p>Thank you! Your message has been sent successfully.</p>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .contact-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 4rem 2rem;
    }
    .contact-header {
      text-align: center;
      margin-bottom: 4rem;
    }
    .contact-header h1 {
      font-size: 2.5rem;
      color: #1e293b;
      margin-bottom: 1rem;
    }
    .contact-header p {
      color: #64748b;
      font-size: 1.1rem;
    }
    .contact-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 3rem;
    }
    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .info-card {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    .info-card i {
      font-size: 2rem;
      color: #3b82f6;
      margin-bottom: 1rem;
    }
    .info-card h3 {
      margin-bottom: 0.5rem;
      color: #1e293b;
    }
    .info-card p {
      color: #3b82f6;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    .info-card span {
      font-size: 0.875rem;
      color: #94a3b8;
    }
    .contact-form {
      background: white;
      padding: 2.5rem;
      border-radius: 16px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    .form-group {
      margin-bottom: 1.5rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #475569;
    }
    .form-group input, .form-group select, .form-group textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 1rem;
    }
    .btn-submit {
      width: 100%;
      padding: 1rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-submit:hover {
      background: #2563eb;
    }
    .success-message {
      margin-top: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #059669;
      background: #ecfdf5;
      padding: 1rem;
      border-radius: 8px;
    }
    @media (max-width: 768px) {
      .contact-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ContactComponent {
  contactForm = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };
  submitted = false;

  onSubmit() {
    console.log('Form Submitted:', this.contactForm);
    this.submitted = true;
    // Reset form after 3 seconds
    setTimeout(() => {
      this.submitted = false;
      this.contactForm = { name: '', email: '', subject: '', message: '' };
    }, 3000);
  }
}
