import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';

interface LibraryTask {
    id: string;
    category: string;
    text: string;
    estimate: number; // in minutes
    isMilestone: boolean;
    milestoneName?: string;
    offsetDays: number; // Offset from launch date (negative is before, positive is after)
    genres?: string[]; // Optional genre filter
    tags?: string[]; // fiction, nonfiction, series, standalone, audio, wide, ku
}

interface Bundle {
    id: string;
    name: string;
    description: string;
    tasks: { text: string; estimate: number; offsetDays: number; isMilestone?: boolean; milestoneName?: string }[];
}

@Component({
    selector: 'app-create-checklist',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './create-checklist.component.html',
    styleUrls: ['./create-checklist.component.scss']
})
export class CreateChecklistComponent implements OnInit {
    // Project Info
    bookTitle: string = '';
    genre: string = 'Fiction';
    penName: string = '';
    targetLaunchDate: string = '';
    
    // Filter & Search
    searchQuery: string = '';
    activeFilters: { [key: string]: boolean } = {
        fiction: true,
        nonfiction: false,
        series: false,
        standalone: true,
        audio: false,
        wide: false,
        ku: false
    };

    // UI state
    expandedCategories: { [key: string]: boolean } = {};
    selectedLibraryTasks: { [key: string]: boolean } = {};
    installedBundles: string[] = [];
    previewBundleId: string | null = null;
    isLoading: boolean = false;
    isEditMode = false;
    checklistId: number | null = null;
    private _errorMessage: string | null = null;
    private errorTimeoutId: any = null;

    get errorMessage(): string | null {
        return this._errorMessage;
    }

    set errorMessage(val: string | null) {
        this._errorMessage = val;
        if (this.errorTimeoutId) {
            clearTimeout(this.errorTimeoutId);
            this.errorTimeoutId = null;
        }
        if (val) {
            this.errorTimeoutId = setTimeout(() => {
                this._errorMessage = null;
            }, 3500);
        }
    }

    clearErrorMessage() {
        this.errorMessage = null;
    }

    // Estimate override modal state
    showEstimateModal = false;
    modalTask: LibraryTask | null = null;
    customEstimateMinutes = 30;
    customOffsetDays = 0;

    filterOptions = [
        { key: 'fiction', label: 'Fiction' },
        { key: 'nonfiction', label: 'Nonfiction' },
        { key: 'series', label: 'Series' },
        { key: 'standalone', label: 'Standalone' },
        { key: 'audio', label: 'Audio' },
        { key: 'wide', label: 'Wide' },
        { key: 'ku', label: 'KU' }
    ];

    // Master Library Categories
    categories = [
        'Pre-Writing & Research',
        'Writing & Drafting',
        'Editing & Manuscript Preparation',
        'Cover, Assets & Production',
        'Publishing Setup & Metadata',
        'ARC & Launch Team Plan',
        'Pre-Launch Marketing',
        'Launch Day & Launch Week',
        'Post-Launch',
        'Follow-Up Milestones'
    ];

    masterTasks: LibraryTask[] = [
        // Pre-Writing & Research
        { id: 'pw-1', category: 'Pre-Writing & Research', text: 'Outline & Plotting', estimate: 240, isMilestone: false, offsetDays: -90, tags: ['fiction', 'series', 'standalone'] },
        { id: 'pw-2', category: 'Pre-Writing & Research', text: 'Character Bios & Setting Profiles', estimate: 120, isMilestone: false, offsetDays: -85, tags: ['fiction'] },
        { id: 'pw-3', category: 'Pre-Writing & Research', text: 'Market & Genre Research', estimate: 120, isMilestone: false, offsetDays: -80, tags: ['nonfiction', 'standalone', 'series'] },
        { id: 'pw-4', category: 'Pre-Writing & Research', text: 'Chapter Outline & Roadmap', estimate: 180, isMilestone: false, offsetDays: -75, tags: ['nonfiction'] },
        
        // Writing & Drafting
        { id: 'wr-1', category: 'Writing & Drafting', text: 'First Draft Completed', estimate: 3120, isMilestone: true, milestoneName: 'First Draft Complete', offsetDays: -60, tags: ['fiction', 'nonfiction'] },
        { id: 'wr-2', category: 'Writing & Drafting', text: 'Self-Revision & Cleanup Pass', estimate: 480, isMilestone: false, offsetDays: -50, tags: ['fiction', 'nonfiction'] },
        
        // Editing & Manuscript Preparation
        { id: 'ed-1', category: 'Editing & Manuscript Preparation', text: 'Developmental Edit Review', estimate: 720, isMilestone: false, offsetDays: -45, tags: ['fiction', 'nonfiction'] },
        { id: 'ed-2', category: 'Editing & Manuscript Preparation', text: 'Line & Copy Editing corrections', estimate: 480, isMilestone: false, offsetDays: -35, tags: ['fiction', 'nonfiction'] },
        { id: 'ed-3', category: 'Editing & Manuscript Preparation', text: 'Final Proofreading Pass Complete', estimate: 240, isMilestone: true, milestoneName: 'Proofreading Complete', offsetDays: -25, tags: ['fiction', 'nonfiction'] },
        
        // Cover, Assets & Production
        { id: 'cv-1', category: 'Cover, Assets & Production', text: 'Cover Design Reveal & Promos', estimate: 120, isMilestone: true, milestoneName: 'Cover Reveal', offsetDays: -30, tags: ['fiction', 'nonfiction', 'series'] },
        { id: 'cv-2', category: 'Cover, Assets & Production', text: 'Formatting eBook & Print versions', estimate: 120, isMilestone: false, offsetDays: -20, tags: ['fiction', 'nonfiction'] },
        { id: 'cv-3', category: 'Cover, Assets & Production', text: 'Audiobook narration submission', estimate: 240, isMilestone: false, offsetDays: -15, tags: ['audio'] },
        
        // Publishing Setup & Metadata
        { id: 'pb-1', category: 'Publishing Setup & Metadata', text: 'Metadata, Blurb & Keywords setup', estimate: 120, isMilestone: false, offsetDays: -12, tags: ['fiction', 'nonfiction'] },
        { id: 'pb-2', category: 'Publishing Setup & Metadata', text: 'KDP Upload & Pre-order Live', estimate: 60, isMilestone: true, milestoneName: 'Retailer Upload', offsetDays: -7, tags: ['ku', 'wide'] },
        { id: 'pb-3', category: 'Publishing Setup & Metadata', text: 'Wide retailer distribution setups', estimate: 120, isMilestone: false, offsetDays: -7, tags: ['wide'] },
        
        // ARC & Launch Team Plan
        { id: 'ar-1', category: 'ARC & Launch Team Plan', text: 'ARC Team Recruitments', estimate: 120, isMilestone: false, offsetDays: -28, tags: ['fiction', 'nonfiction'] },
        { id: 'ar-2', category: 'ARC & Launch Team Plan', text: 'Send ARC Copies to Readers', estimate: 60, isMilestone: true, milestoneName: 'ARC Close', offsetDays: -10, tags: ['fiction', 'nonfiction'] },
        
        // Pre-Launch Marketing
        { id: 'pm-1', category: 'Pre-Launch Marketing', text: 'Newsletter Teaser campaign', estimate: 120, isMilestone: false, offsetDays: -14, tags: ['fiction', 'nonfiction'] },
        { id: 'pm-2', category: 'Pre-Launch Marketing', text: 'Prepare Social Media assets', estimate: 120, isMilestone: false, offsetDays: -10, tags: ['fiction', 'nonfiction'] },
        
        // Launch Day & Launch Week
        { id: 'ld-1', category: 'Launch Day & Launch Week', text: 'Official Book Launch Day', estimate: 30, isMilestone: true, milestoneName: 'Launch Date', offsetDays: 0, tags: ['fiction', 'nonfiction'] },
        { id: 'ld-2', category: 'Launch Day & Launch Week', text: 'Newsletter Launch Broadcast', estimate: 60, isMilestone: false, offsetDays: 1, tags: ['fiction', 'nonfiction'] },
        { id: 'ld-3', category: 'Launch Day & Launch Week', text: 'Ad Campaigns Activation', estimate: 120, isMilestone: false, offsetDays: 2, tags: ['fiction', 'nonfiction'] },
        
        // Post-Launch
        { id: 'pl-1', category: 'Post-Launch', text: 'Send Launch Thank-You Emails', estimate: 30, isMilestone: false, offsetDays: 5, tags: ['fiction', 'nonfiction'] },
        { id: 'pl-2', category: 'Post-Launch', text: 'Monitor and harvest early reviews', estimate: 60, isMilestone: false, offsetDays: 10, tags: ['fiction', 'nonfiction'] },
        
        // Follow-Up Milestones
        { id: 'fm-1', category: 'Follow-Up Milestones', text: 'Perform 30-Day Launch Post-Mortem', estimate: 120, isMilestone: true, milestoneName: '30 Day Follow Up', offsetDays: 30, tags: ['fiction', 'nonfiction'] },
        { id: 'fm-2', category: 'Follow-Up Milestones', text: 'Perform 90-Day Marketing Review', estimate: 120, isMilestone: true, milestoneName: '90 Day Follow Up', offsetDays: 90, tags: ['fiction', 'nonfiction'] },
        { id: 'fm-3', category: 'Follow-Up Milestones', text: 'Perform 180-Day Sales & Catalog Review', estimate: 120, isMilestone: true, milestoneName: '180 Day Follow Up', offsetDays: 180, tags: ['fiction', 'nonfiction'] }
    ];

    // Sub-checklist bundles
    bundles: Bundle[] = [
        {
            id: 'email-launch',
            name: 'Email Launch Sequence',
            description: 'Automated launch series to prime your list subscribers.',
            tasks: [
                { text: 'Launch Email 1: The Announcement (3 weeks out)', estimate: 45, offsetDays: -21 },
                { text: 'Launch Email 2: The Sneak Peek (1 week out)', estimate: 45, offsetDays: -7 },
                { text: 'Launch Email 3: Release Day Alert', estimate: 60, offsetDays: 0 },
                { text: 'Launch Email 4: Celebration & Review Ask (3 days post-launch)', estimate: 30, offsetDays: 3 }
            ]
        },
        {
            id: 'arc-campaign',
            name: 'ARC Campaign Plan',
            description: 'Advanced Reader Copy team follow-ups & review priming.',
            tasks: [
                { text: 'Build ARC Signup Form', estimate: 30, offsetDays: -45 },
                { text: 'ARC Sendout 1: eBook delivery via BookFunnel', estimate: 45, offsetDays: -20 },
                { text: 'ARC Reminder: Review instructions & launch date heads up', estimate: 30, offsetDays: -3 }
            ]
        },
        {
            id: 'social-media',
            name: 'Social Media Launch Plan',
            description: 'Visual asset timeline for Instagram, Facebook, and TikTok.',
            tasks: [
                { text: 'Create Cover Reveal Teasers', estimate: 60, offsetDays: -32 },
                { text: 'Create Quote Graphics from First Draft', estimate: 120, offsetDays: -15 },
                { text: 'Pre-order Milestone Graphic post', estimate: 45, offsetDays: -5 },
                { text: 'Launch Day Video / Reel publish', estimate: 60, offsetDays: 0 }
            ]
        },
        {
            id: 'bookbub',
            name: 'BookBub Campaign',
            description: 'BookBub New Release Alerts and Featured Deals prep.',
            tasks: [
                { text: 'Submit BookBub New Release Alert request', estimate: 30, offsetDays: -25 },
                { text: 'Design BookBub Ads for Launch Day targeting', estimate: 90, offsetDays: -5 }
            ]
        },
        {
            id: 'paid-ads',
            name: 'Paid Ads Plan',
            description: 'Facebook & Amazon Ads configuration and budget planning.',
            tasks: [
                { text: 'Collect Amazon Ads Keyword list (100+ terms)', estimate: 120, offsetDays: -10 },
                { text: 'Setup Facebook Ad Campaigns (Creative + Audience)', estimate: 180, offsetDays: -3 }
            ]
        }
    ];

    constructor(
        private apiService: ApiService,
        private router: Router,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef,
        private notificationService: NotificationService
    ) { }

    ngOnInit() {
        if (!localStorage.getItem('user_id')) {
            this.router.navigate(['/login']);
            return;
        }

        // Initialize categories expanded states
        this.categories.forEach(cat => {
            this.expandedCategories[cat] = true;
        });

        // Initialize default selected tasks and restore custom estimates/offsets
        this.masterTasks.forEach(task => {
            this.selectedLibraryTasks[task.id] = true;
            const saved = localStorage.getItem(`custom_est_${task.id}`);
            if (saved) {
                task.estimate = parseInt(saved, 10);
            }
            const savedOffset = localStorage.getItem(`custom_offset_${task.id}`);
            if (savedOffset) {
                task.offsetDays = parseInt(savedOffset, 10);
            }
        });

        // Check if editing
        const routeId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.queryParamMap.get('edit');
        if (routeId) {
            this.isEditMode = true;
            this.checklistId = Number(routeId);
            this.loadExistingChecklist(this.checklistId);
        }
    }

    loadExistingChecklist(id: number) {
        this.isLoading = true;
        this.apiService.getChecklist(id).subscribe({
            next: (res) => {
                if (res.success && res.data) {
                    const checklist = res.data;
                    this.bookTitle = checklist.name || checklist.title || '';
                    
                    // Look up extra details in localStorage
                    const savedMetaStr = localStorage.getItem(`authorflow_meta_${id}`);
                    if (savedMetaStr) {
                        try {
                            const meta = JSON.parse(savedMetaStr);
                            this.genre = meta.genre || 'Fiction';
                            this.penName = meta.penName || '';
                            this.targetLaunchDate = meta.targetLaunchDate || '';
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error(err);
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    toggleFilter(filterKey: string) {
        // Multi-select behavior: toggle the filter
        this.activeFilters[filterKey] = !this.activeFilters[filterKey];

        // Specific rules: Genre exclusivity
        if (filterKey === 'fiction' && this.activeFilters['fiction']) {
            this.activeFilters['nonfiction'] = false;
        } else if (filterKey === 'nonfiction' && this.activeFilters['nonfiction']) {
            this.activeFilters['fiction'] = false;
        }
        this.cdr.detectChanges();
    }

    toggleCategory(category: string) {
        this.expandedCategories[category] = !this.expandedCategories[category];
    }

    getFilteredTasks(category: string): LibraryTask[] {
        return this.masterTasks.filter(task => {
            if (task.category !== category) return false;
            
            // Search Query Filter
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                const matchesText = task.text.toLowerCase().includes(query);
                const matchesCategory = task.category.toLowerCase().includes(query);
                if (!matchesText && !matchesCategory) return false;
            }

            // Chips Filters
            let matchesChips = true;
            const activeKeys = Object.keys(this.activeFilters).filter(k => this.activeFilters[k]);
            
            if (activeKeys.length > 0) {
                // Task matches if it contains at least one active filter key or is applicable globally
                matchesChips = activeKeys.some(key => {
                    if (key === 'fiction') return task.tags?.includes('fiction') || false;
                    if (key === 'nonfiction') return task.tags?.includes('nonfiction') || false;
                    if (key === 'series') return task.tags?.includes('series') || false;
                    if (key === 'standalone') return task.tags?.includes('standalone') || false;
                    if (key === 'audio') return task.tags?.includes('audio') || false;
                    if (key === 'wide') return task.tags?.includes('wide') || false;
                    if (key === 'ku') return task.tags?.includes('ku') || false;
                    return true;
                });
            }

            return matchesChips;
        });
    }

    getCategoryProgress(category: string): string {
        const filtered = this.getFilteredTasks(category);
        if (filtered.length === 0) return '0 / 0 Selected';
        const selected = filtered.filter(t => this.selectedLibraryTasks[t.id]).length;
        return `${selected} / ${filtered.length} Selected`;
    }

    isCategoryFullySelected(category: string): boolean {
        const filtered = this.getFilteredTasks(category);
        if (filtered.length === 0) return false;
        return filtered.every(t => this.selectedLibraryTasks[t.id]);
    }

    toggleSelectAllCategory(category: string) {
        const filtered = this.getFilteredTasks(category);
        const allSelected = this.isCategoryFullySelected(category);
        filtered.forEach(task => {
            this.selectedLibraryTasks[task.id] = !allSelected;
        });
    }

    openOverrideModal(task: LibraryTask, event: Event) {
        event.stopPropagation();
        this.modalTask = task;
        // Check if custom estimate is stored, otherwise default
        const key = `custom_est_${task.id}`;
        const saved = localStorage.getItem(key);
        this.customEstimateMinutes = saved ? parseInt(saved, 10) : task.estimate;

        // Check if custom offset is stored, otherwise default
        const offsetKey = `custom_offset_${task.id}`;
        const savedOffset = localStorage.getItem(offsetKey);
        this.customOffsetDays = savedOffset ? parseInt(savedOffset, 10) : task.offsetDays;

        this.showEstimateModal = true;
    }

    saveCustomEstimate() {
        if (this.modalTask) {
            const key = `custom_est_${this.modalTask.id}`;
            localStorage.setItem(key, this.customEstimateMinutes.toString());

            const offsetKey = `custom_offset_${this.modalTask.id}`;
            localStorage.setItem(offsetKey, this.customOffsetDays.toString());

            // Update masterTasks in place
            const found = this.masterTasks.find(t => t.id === this.modalTask!.id);
            if (found) {
                found.estimate = this.customEstimateMinutes;
                found.offsetDays = this.customOffsetDays;
            }
        }
        this.showEstimateModal = false;
        this.modalTask = null;
    }

    getTaskEstimateLabel(task: LibraryTask): string {
        const est = task.estimate;
        if (est < 60) return `${est} min`;
        const hrs = est / 60;
        return `${hrs % 1 === 0 ? hrs : hrs.toFixed(1)} ${hrs === 1 ? 'hr' : 'hrs'}`;
    }

    isBundleInstalled(bundleId: string): boolean {
        return this.installedBundles.includes(bundleId);
    }

    toggleBundlePreview(bundleId: string, event: Event) {
        event.stopPropagation();
        if (this.previewBundleId === bundleId) {
            this.previewBundleId = null;
        } else {
            this.previewBundleId = bundleId;
        }
    }

    installBundle(bundle: Bundle, event: Event) {
        event.stopPropagation();
        this.notificationService.showInfo(
            `"${bundle.name}" will be available in Phase 2. Sub-checklist bundle installation is coming soon.`
        );
    }

    calculateDueDate(launchDateStr: string, offsetDays: number): string {
        if (!launchDateStr) return '';
        const date = new Date(launchDateStr);
        if (isNaN(date.getTime())) return '';
        date.setDate(date.getDate() + offsetDays);
        return date.toISOString().split('T')[0];
    }

    buildChecklist() {
        if (!this.bookTitle.trim()) {
            this.errorMessage = 'Please enter a Book Title.';
            return;
        }
        if (!this.targetLaunchDate) {
            this.errorMessage = 'Please select a Target Launch Date.';
            return;
        }

        this.isLoading = true;
        this.cdr.detectChanges();

        // 1. Gather all selected tasks
        const tasksToCreate = this.masterTasks.filter(t => this.selectedLibraryTasks[t.id]);

        // 2. Prepare payload
        const payload = {
            name: this.bookTitle,
            activity_type: this.genre,
            content_type: this.genre,
            start_date: this.calculateDueDate(this.targetLaunchDate, -90),
            end_date: this.targetLaunchDate,
            algorithm_type: 'steadily',
            items: tasksToCreate.map((t, idx) => {
                const dueDate = this.calculateDueDate(this.targetLaunchDate, t.offsetDays);
                const customEst = localStorage.getItem(`custom_est_${t.id}`);
                return {
                    text: t.text,
                    checked: false,
                    date: dueDate,
                    sort_order: idx,
                    // We can embed estimate and milestone info inside a JSON comment or parse it
                    // To avoid backend schema breaks, we can format details into the task text or sync in local state.
                    // But we'll ALSO save the complete, rich meta-information in localStorage for full fidelity!
                };
            })
        };

        const apiCall = this.isEditMode && this.checklistId
            ? this.apiService.updateChecklist(this.checklistId, payload)
            : this.apiService.createChecklist(payload);

        apiCall.subscribe({
            next: (res) => {
                if (res.success) {
                    const checklistId = res.id || this.checklistId;
                    
                    // Save rich metadata to localStorage for premium features
                    const metaPayload = {
                        bookTitle: this.bookTitle,
                        genre: this.genre,
                        penName: this.penName,
                        targetLaunchDate: this.targetLaunchDate,
                        installedBundles: this.installedBundles,
                        // Save task extra information (estimates, milestones) indexed by task text/name
                        taskDetails: tasksToCreate.map(t => {
                            const customEst = localStorage.getItem(`custom_est_${t.id}`);
                            return {
                                text: t.text,
                                estimate: customEst ? parseInt(customEst, 10) : t.estimate,
                                defaultEstimate: t.estimate,
                                isMilestone: t.isMilestone,
                                milestoneName: t.milestoneName || '',
                                offsetDays: t.offsetDays
                            };
                        })
                    };
                    localStorage.setItem(`authorflow_meta_${checklistId}`, JSON.stringify(metaPayload));

                    // Success routing
                    this.router.navigate(['/my-checklists']);
                } else {
                    this.errorMessage = 'Error creating checklist: ' + res.message;
                }
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error(err);
                this.errorMessage = 'Server error occurred while building the checklist.';
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }
}
