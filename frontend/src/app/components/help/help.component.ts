import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss']
})
export class HelpComponent implements OnInit {
  faqs: boolean[] = [false, false, false, false]; // Track open/close state of FAQs

  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  toggleFaq(index: number) {
    this.faqs[index] = !this.faqs[index];
  }

  scrollTo(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
