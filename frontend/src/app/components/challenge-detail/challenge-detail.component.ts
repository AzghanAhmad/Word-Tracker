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
    private dailyLogs: { [date: string]: number } = {}; // Track daily logs by date

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

                    // Parse dates properly
                    const startDate = this.parseDate(challengeData.start_date);
                    const endDate = this.parseDate(challengeData.end_date);

                    // Calculate days remaining
                    let daysRemaining = 0;
                    if (endDate) {
                        const today = new Date();
                        daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
                    }

                    // Get participants from response
                    if (challengeData.participants_list) {
                        this.participants = challengeData.participants_list.map((p: any) => ({
                            id: p.user_id,
                            user_id: p.user_id,
                            username: p.username,
                            progress: p.current_progress || 0,
                            current_progress: p.current_progress || 0
                        }));
                    } else {
                        this.participants = [];
                    }

                    // Get user's progress
                    this.userProgress = challengeData.my_progress || 0;

                    // Load daily logs from response or fetch separately
                    if (challengeData.daily_logs && Array.isArray(challengeData.daily_logs)) {
                        // Convert array to object format
                        this.dailyLogs = {};
                        challengeData.daily_logs.forEach((log: any) => {
                            const dateStr = log.log_date || log.date;
                            if (dateStr) {
                                this.dailyLogs[dateStr] = log.word_count || 0;
                            }
                        });
                    } else {
                        // Fetch logs separately if not in response
                        this.loadChallengeLogs(parseInt(id));
                    }
                    
                    // Convert daily logs to userLogs array for display
                    this.updateUserLogs();

                    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
                    setTimeout(() => {
                        this.challenge = {
                            ...challengeData,
                            name: challengeData.name || challengeData.title,
                            goal_amount: challengeData.goal_amount || challengeData.goal_count,
                            start_date: startDate,
                            end_date: endDate,
                            days_remaining: daysRemaining,
                            status: challengeData.status || 'Active'
                        };
                        this.isLoading = false;
                        this.cdr.detectChanges();
                    }, 0);
                } else {
                    console.error('Challenge not found');
                    setTimeout(() => {
                        this.challenge = null;
                        this.isLoading = false;
                        this.cdr.detectChanges();
                    }, 0);
                }
            },
            error: (error) => {
                console.error('Error loading challenge details:', error);
                setTimeout(() => {
                    this.challenge = null;
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }, 0);
            }
        });
    }


    addProgress() {
        if (!this.todayWords || this.todayWords <= 0) return;

        this.isLoading = true;
        this.cdr.detectChanges();

        const wordsToAdd = this.todayWords;
        const challengeId = parseInt(this.challengeId!);
        
        // Get today's date as YYYY-MM-DD (local timezone)
        const today = new Date();
        const todayStr = this.formatDateLocal(today);

        this.apiService.updateChallengeProgress(challengeId, wordsToAdd).subscribe({
            next: (response) => {
                if (response.success) {
                    // Optimistically update UI
                    if (!this.dailyLogs[todayStr]) {
                        this.dailyLogs[todayStr] = 0;
                    }
                    this.dailyLogs[todayStr] += wordsToAdd;
                    this.userProgress += wordsToAdd;
                    this.updateUserLogs();
                    
                    // Clear input
                    this.todayWords = null;
                    this.isLoading = false;
                    this.cdr.detectChanges();
                    
                    // Reload challenge data to get fresh logs from backend
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
    
    /**
     * Convert dailyLogs object to userLogs array for display
     */
    private updateUserLogs() {
        const logs: any[] = [];
        const today = new Date();
        const todayStr = this.formatDateLocal(today);
        
        // Sort dates descending (newest first)
        const sortedDates = Object.keys(this.dailyLogs).sort((a, b) => b.localeCompare(a));
        
        sortedDates.forEach(dateStr => {
            const date = new Date(dateStr + 'T00:00:00');
            logs.push({
                log_date: date,
                word_count: this.dailyLogs[dateStr],
                is_today: dateStr === todayStr
            });
        });
        
        this.userLogs = logs;
    }
    
    /**
     * Get today's total words
     */
    getTodayTotal(): number {
        const today = new Date();
        const todayStr = this.formatDateLocal(today);
        return this.dailyLogs[todayStr] || 0;
    }
    
    /**
     * Get today's date object
     */
    getTodayDate(): Date {
        return new Date();
    }

    /**
     * Load challenge logs from backend
     */
    private loadChallengeLogs(challengeId: number) {
        this.apiService.getChallengeLogs(challengeId).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    // Convert array to object format
                    this.dailyLogs = {};
                    response.data.forEach((log: any) => {
                        const dateStr = log.log_date || log.date;
                        if (dateStr) {
                            this.dailyLogs[dateStr] = log.word_count || 0;
                        }
                    });
                    this.updateUserLogs();
                    this.cdr.detectChanges();
                }
            },
            error: (error) => {
                console.error('Error loading challenge logs:', error);
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

    /**
     * Parse date from various formats (string, object, MySqlDateTime)
     */
    private parseDate(dateValue: any): Date | null {
        if (!dateValue) return null;
        
        // Handle JSON string containing MySqlDateTime object
        if (typeof dateValue === 'string' && dateValue.startsWith('{')) {
            try {
                const parsed = JSON.parse(dateValue);
                if (parsed.Year && parsed.Month && parsed.Day) {
                    return new Date(parsed.Year, parsed.Month - 1, parsed.Day);
                }
            } catch (e) {
                // If JSON parse fails, continue to other formats
            }
        }
        
        // Handle string dates (YYYY-MM-DD format from backend)
        if (typeof dateValue === 'string') {
            let dateStr = dateValue;
            if (dateValue.includes('T')) {
                // If it's ISO format, parse as Date and format in local timezone
                const date = new Date(dateValue);
                if (!isNaN(date.getTime())) {
                    dateStr = this.formatDateLocal(date);
                } else {
                    dateStr = dateValue.split('T')[0]; // Fallback
                }
            }
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
            }
            // Try standard Date parsing
            const parsed = new Date(dateValue);
            return isNaN(parsed.getTime()) ? null : parsed;
        }
        
        // Handle MySqlDateTime-like objects (already parsed)
        if (dateValue && typeof dateValue === 'object') {
            if (dateValue.Year && dateValue.Month && dateValue.Day) {
                return new Date(dateValue.Year, dateValue.Month - 1, dateValue.Day);
            }
        }
        
        // Try standard Date parsing as fallback
        const parsed = new Date(dateValue);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    // Helper function to format date in local timezone (YYYY-MM-DD)
    private formatDateLocal(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
