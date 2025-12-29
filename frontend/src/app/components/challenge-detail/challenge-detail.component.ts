import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ContentLoaderComponent } from '../content-loader/content-loader.component';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-challenge-detail',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, ContentLoaderComponent],
    templateUrl: './challenge-detail.component.html',
    styleUrls: ['./challenge-detail.component.scss']
})
export class ChallengeDetailComponent implements OnInit {
    challenge: any = null;
    participants: any[] = [];
    userLogs: any[] = [];
    userProgress = 0;
    isLoading = true;
    todayWords: number | null = null;
    currentUserId: any;
    private challengeId: string | null = null;

    constructor(
        private route: ActivatedRoute,
        private apiService: ApiService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.currentUserId = localStorage.getItem('user_id');
        if (!this.currentUserId) {
            this.router.navigate(['/login']);
            return;
        }

        // Get ID from route and load immediately
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.challengeId = id;
                this.loadChallengeDetails(id);
            }
        });

        // Reload on navigation back to this page
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            if (this.challengeId && event.url.includes('/challenge/')) {
                this.loadChallengeDetails(this.challengeId);
            }
        });
    }

    loadChallengeDetails(id: string) {
        this.isLoading = true;
        this.cdr.detectChanges();

        // Fetch specific challenge details from backend
        this.apiService.getChallenge(parseInt(id)).subscribe({
            next: (response) => {
                console.log('Challenge detail response:', response);
                if (response.success && response.data) {
                    const challengeData = response.data;

                    // Calculate days remaining
                    const endDate = new Date(challengeData.end_date);
                    const today = new Date();
                    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

                    this.challenge = {
                        ...challengeData,
                        name: challengeData.name || challengeData.title,
                        goal_amount: challengeData.goal_amount || challengeData.goal_count,
                        days_remaining: daysRemaining,
                        status: challengeData.status || 'Active'
                    };

                    // Get participants from response
                    if (challengeData.participants_list) {
                        this.participants = challengeData.participants_list.map((p: any) => ({
                            id: p.user_id,
                            username: p.username,
                            progress: p.current_progress || 0
                        }));
                    } else {
                        this.participants = [];
                    }

                    // Get user's progress
                    this.userProgress = challengeData.my_progress || 0;
                } else {
                    console.error('Challenge not found');
                    this.challenge = null;
                }
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (error) => {
                console.error('Error loading challenge details:', error);
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }


    addProgress() {
        if (!this.todayWords || this.todayWords <= 0) return;

        this.isLoading = true;
        this.cdr.detectChanges();

        const wordsToAdd = this.todayWords;
        const challengeId = parseInt(this.challengeId!);

        this.apiService.updateChallengeProgress(challengeId, wordsToAdd).subscribe({
            next: (response) => {
                if (response.success) {
                    // Refresh data
                    this.todayWords = null;
                    this.loadChallengeDetails(this.challengeId!);
                } else {
                    alert('Failed to update progress: ' + response.message);
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            },
            error: (error) => {
                console.error('Error updating progress:', error);
                alert('An error occurred while updating progress');
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    getPercent(current: number, total: number): number {
        if (!total || total === 0) return 0;
        const pct = Math.round((current / total) * 100);
        return pct > 100 ? 100 : pct;
    }

    copyCode() {
        if (this.challenge && this.challenge.invite_code) {
            navigator.clipboard.writeText(this.challenge.invite_code).then(() => {
                alert('Invite code copied to clipboard!');
            });
        }
    }
}
