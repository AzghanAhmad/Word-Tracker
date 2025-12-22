import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    // ============================================================================
    // Authentication
    // ============================================================================

    login(email: string, password: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/auth/login`, { email, password });
    }

    register(username: string, email: string, password: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/auth/register`, { username, email, password });
    }

    // ============================================================================
    // User
    // ============================================================================

    getUserProfile(): Observable<any> {
        return this.http.get(`${this.apiUrl}/user/profile`);
    }

    // ============================================================================
    // Dashboard
    // ============================================================================

    getDashboardStats(): Observable<any> {
        return this.http.get(`${this.apiUrl}/dashboard/stats`);
    }

    // ============================================================================
    // Challenges
    // ============================================================================

    getChallenges(): Observable<any> {
        return this.http.get(`${this.apiUrl}/challenges`);
    }

    getChallenge(id: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/challenges/${id}`);
    }

    joinChallenge(challengeId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/challenges/join`, { challenge_id: challengeId });
    }

    createChallenge(challenge: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/challenges`, challenge);
    }

    // ============================================================================
    // Plans
    // ============================================================================

    getPlans(): Observable<any> {
        return this.http.get(`${this.apiUrl}/plans`);
    }

    createPlan(plan: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/plans`, plan);
    }

    // ============================================================================
    // Community
    // ============================================================================

    getCommunityPosts(): Observable<any> {
        return this.http.get(`${this.apiUrl}/community`);
    }

    // ============================================================================
    // Notifications
    // ============================================================================

    getNotifications(): Observable<any> {
        return this.http.get(`${this.apiUrl}/notifications`);
    }

    // ============================================================================
    // Checklists
    // ============================================================================

    getChecklists(): Observable<any> {
        return this.http.get(`${this.apiUrl}/checklists`);
    }

    createChecklist(checklist: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/checklists`, checklist);
    }

    updateChecklistItem(itemId: number, isDone: boolean): Observable<any> {
        return this.http.patch(`${this.apiUrl}/checklists/items/${itemId}`, { is_done: isDone });
    }

    deleteChecklist(checklistId: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/checklists/${checklistId}`);
    }

}
