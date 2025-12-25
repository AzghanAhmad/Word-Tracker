import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MockDataService {

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomDate(start: Date, end: Date): string {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
  }

  private randomElement<T>(arr: T[]): T {
    return arr[this.randomInt(0, arr.length - 1)];
  }

  generateMockUser() {
    const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    const firstName = this.randomElement(firstNames);
    const lastName = this.randomElement(lastNames);
    const username = `${firstName} ${lastName}`;

    return {
      id: this.randomInt(1000, 9999).toString(),
      username: username,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@demo.com`,
      bio: `Demo user - ${firstName} loves writing and tracking progress!`,
      created_at: this.randomDate(new Date(2023, 0, 1), new Date()),
      initials: firstName[0] + lastName[0]
    };
  }

  private plans: any[] = [];

  getPlans(count: number = 0) {
    if (this.plans.length === 0 && count > 0) {
      this.generateMockPlans(count);
    }
    return this.plans;
  }

  getPlan(id: number) {
    if (this.plans.length === 0) {
      this.generateMockPlans();
    }
    return this.plans.find(p => p.id == id) || this.plans[0];
  }

  addPlan(plan: any) {
    const newPlan = {
      id: this.randomInt(10000, 99999),
      plan_name: plan.title || 'Untitled Plan',
      content_type: plan.content_type || 'Novel',
      target_amount: plan.total_word_count || 0,
      completed_amount: 0,
      progress: 0,
      start_date: plan.start_date || new Date().toISOString().split('T')[0],
      end_date: plan.end_date || new Date().toISOString().split('T')[0],
      status: 'In Progress',
      color_code: plan.dashboard_color || '#4ECDC4',
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      description: plan.description || '',
      algorithm_type: plan.algorithm_type || 'steady'
    };
    this.plans.unshift(newPlan); // Add to beginning
    return newPlan;
  }

  private generateMockPlans(count: number = 10) {
    const planTypes = ['Novel', 'Short Story', 'Blog Post', 'Article', 'Essay', 'Screenplay', 'Poetry'];
    const statuses = ['In Progress', 'Completed', 'On Hold'];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];

    for (let i = 0; i < count; i++) {
      const targetAmount = this.randomInt(5000, 100000);
      const completedAmount = this.randomInt(0, targetAmount);
      const progress = Math.round((completedAmount / targetAmount) * 100);

      this.plans.push({
        id: this.randomInt(1, 10000),
        plan_name: `${this.randomElement(planTypes)} Project ${i + 1}`,
        content_type: this.randomElement(planTypes),
        target_amount: targetAmount,
        completed_amount: completedAmount,
        progress: progress,
        start_date: this.randomDate(new Date(2024, 0, 1), new Date()),
        end_date: this.randomDate(new Date(), new Date(2025, 11, 31)),
        status: this.randomElement(statuses),
        color_code: this.randomElement(colors),
        is_archived: Math.random() > 0.8,
        created_at: this.randomDate(new Date(2023, 6, 1), new Date()),
        updated_at: this.randomDate(new Date(), new Date())
      });
    }

    return this.plans;
  }

  generateMockStats() {
    return {
      totalPlans: this.randomInt(5, 25),
      totalWords: this.randomInt(10000, 500000),
      activePlans: this.randomInt(2, 10),
      completedPlans: this.randomInt(1, 15)
    };
  }

  generateMockChecklists(count: number = 5) {
    const checklistNames = [
      'Daily Writing Tasks',
      'Novel Outline',
      'Research Notes',
      'Character Development',
      'Plot Points',
      'Editing Checklist'
    ];

    const checklists = [];
    for (let i = 0; i < count; i++) {
      const totalItems = this.randomInt(5, 15);
      const completedItems = this.randomInt(0, totalItems);

      checklists.push({
        id: this.randomInt(1, 1000),
        name: this.randomElement(checklistNames),
        description: `Demo checklist for tracking progress`,
        total_items: totalItems,
        completed_items: completedItems,
        progress: Math.round((completedItems / totalItems) * 100),
        created_at: this.randomDate(new Date(2024, 0, 1), new Date()),
        updated_at: this.randomDate(new Date(), new Date())
      });
    }

    return checklists;
  }

  generateMockChallenges(count: number = 8) {
    const challengeNames = [
      'NaNoWriMo Challenge',
      '30-Day Writing Sprint',
      'Weekly Word Count',
      '100k Words Challenge',
      'Daily Writing Habit',
      'Short Story Marathon'
    ];

    const challenges = [];
    for (let i = 0; i < count; i++) {
      challenges.push({
        id: this.randomInt(1, 100),
        name: this.randomElement(challengeNames),
        description: `Join this challenge and write together!`,
        participants: this.randomInt(10, 500),
        target_words: this.randomInt(10000, 100000),
        start_date: this.randomDate(new Date(2024, 0, 1), new Date()),
        end_date: this.randomDate(new Date(), new Date(2025, 11, 31)),
        is_active: Math.random() > 0.3
      });
    }

    return challenges;
  }

  generateMockCommunityPosts(count: number = 15) {
    const authors = ['Alice Writer', 'Bob Novelist', 'Carol Poet', 'David Blogger', 'Eve Journalist'];
    const titles = [
      'Just hit 50k words!',
      'Tips for overcoming writer\'s block',
      'My writing routine',
      'Finished my first draft!',
      'Looking for beta readers',
      'Character development advice needed'
    ];

    const posts = [];
    for (let i = 0; i < count; i++) {
      posts.push({
        id: this.randomInt(1, 1000),
        author: this.randomElement(authors),
        title: this.randomElement(titles),
        content: `This is a demo community post. Great progress everyone!`,
        likes: this.randomInt(0, 100),
        comments: this.randomInt(0, 50),
        created_at: this.randomDate(new Date(2024, 0, 1), new Date())
      });
    }

    return posts;
  }

  generateMockCalendarEvents(count: number = 20) {
    const events = [];
    const today = new Date();

    for (let i = 0; i < count; i++) {
      const eventDate = new Date(today);
      eventDate.setDate(today.getDate() + this.randomInt(-30, 30));

      events.push({
        id: this.randomInt(1, 1000),
        title: `Writing Session ${i + 1}`,
        date: eventDate.toISOString().split('T')[0],
        words_written: this.randomInt(100, 5000),
        duration_minutes: this.randomInt(15, 180),
        plan_id: this.randomInt(1, 100)
      });
    }

    return events;
  }

  generateMockNotifications(count: number = 5) {
    const types = ['achievement', 'reminder', 'social', 'update'];
    const messages = [
      'You reached 10,000 words!',
      'Daily writing goal completed',
      'New comment on your post',
      'Challenge deadline approaching',
      'Weekly progress summary ready',
      'New follower: Alex Writer',
      'Milestone: 30-day streak!'
    ];

    const notifications = [];
    for (let i = 0; i < count; i++) {
      notifications.push({
        id: this.randomInt(1, 1000),
        type: this.randomElement(types),
        message: this.randomElement(messages),
        is_read: Math.random() > 0.5,
        created_at: this.randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
        link: '/dashboard'
      });
    }

    return notifications;
  }

  generateMockCommunityPlans(count: number = 10) {
    const planTypes = ['Novel', 'Short Story', 'Blog', 'Essay', 'Thesis', 'Script', 'Non-Fiction', 'Book'];
    const activities = ['Writing', 'Editing', 'Proofreading', 'Revising'];
    const authors = ['Emma Clarke', 'James Rodriguez', 'Sofia Chen', 'Marcus Johnson', 'Olivia Taylor'];

    const plans = [];
    for (let i = 0; i < count; i++) {
      const targetAmount = this.randomInt(10000, 150000);
      const completedAmount = this.randomInt(1000, targetAmount);
      const dailyData = Array.from({ length: 30 }, () => this.randomInt(100, 2000));

      plans.push({
        id: this.randomInt(1, 10000),
        plan_name: `${this.randomElement(planTypes)}: ${this.randomElement(['The Journey', 'New Beginnings', 'Final Chapter', 'Discovery', 'Awakening'])}`,
        content_type: this.randomElement(planTypes),
        activity_type: this.randomElement(activities),
        author: this.randomElement(authors),
        target_amount: targetAmount,
        completed_amount: completedAmount,
        progress: Math.round((completedAmount / targetAmount) * 100),
        daily_data: dailyData,
        start_date: this.randomDate(new Date(2024, 0, 1), new Date()),
        end_date: this.randomDate(new Date(), new Date(2025, 11, 31)),
        is_public: true,
        created_at: this.randomDate(new Date(2024, 0, 1), new Date())
      });
    }

    return plans;
  }

  generateMockProjects(count: number = 8) {
    const projectNames = [
      'Fantasy Trilogy',
      'Sci-Fi Series',
      'Mystery Collection',
      'Romance Novels',
      'Historical Fiction',
      'Blog Posts 2025',
      'Short Stories Anthology',
      'Memoir Project'
    ];

    const projects = [];
    for (let i = 0; i < count; i++) {
      const planCount = this.randomInt(2, 12);

      projects.push({
        id: this.randomInt(1, 1000),
        name: this.randomElement(projectNames),
        description: `Demo project for organizing related writing plans`,
        plan_count: planCount,
        role: 'owner',
        created_at: this.randomDate(new Date(2024, 0, 1), new Date()),
        updated_at: this.randomDate(new Date(), new Date())
      });
    }

    return projects;
  }

  generateMockChecklistsWithItems(count: number = 5) {
    const checklistNames = [
      'Daily Writing Tasks',
      'Novel Outline',
      'Research Notes',
      'Character Development',
      'Plot Points',
      'Editing Checklist',
      'Publishing Checklist',
      'Marketing Tasks'
    ];

    const taskTemplates = [
      'Write opening chapter',
      'Develop main character',
      'Research historical period',
      'Outline plot structure',
      'Edit first draft',
      'Proofread chapters 1-5',
      'Create character profiles',
      'Write 1000 words'
    ];

    const checklists = [];
    for (let i = 0; i < count; i++) {
      const itemCount = this.randomInt(5, 12);
      const completedCount = this.randomInt(0, itemCount);

      const items = [];
      for (let j = 0; j < itemCount; j++) {
        items.push({
          id: this.randomInt(1, 10000),
          text: this.randomElement(taskTemplates),
          is_done: j < completedCount,
          sort_order: j
        });
      }

      checklists.push({
        id: this.randomInt(1, 1000),
        name: this.randomElement(checklistNames),
        created_at: this.randomDate(new Date(2024, 0, 1), new Date()),
        item_count: itemCount,
        completed_count: completedCount,
        items: items
      });
    }

    return checklists;
  }

  generateMockChallengesDetailed(count: number = 8) {
    const challengeNames = [
      'NaNoWriMo 2025',
      '30-Day Writing Sprint',
      'Weekly Word Count Challenge',
      '100k Words in 3 Months',
      'Daily Writing Habit Builder',
      'Short Story Marathon',
      'Poetry Challenge',
      'Editing Bootcamp'
    ];

    const descriptions = [
      'Write 50,000 words in 30 days',
      'Build a consistent writing habit',
      'Complete your first draft',
      'Join writers worldwide',
      'Push your creative limits'
    ];

    const challenges = [];
    for (let i = 0; i < count; i++) {
      const goalAmount = this.randomInt(10000, 100000);
      const participants = this.randomInt(50, 1000);

      challenges.push({
        id: this.randomInt(1, 100),
        name: this.randomElement(challengeNames),
        description: this.randomElement(descriptions),
        goal_type: 'word_count',
        goal_amount: goalAmount,
        participants: participants,
        participant_count: participants,
        start_date: this.randomDate(new Date(2024, 0, 1), new Date()),
        end_date: this.randomDate(new Date(), new Date(2025, 11, 31)),
        is_public: true,
        is_active: Math.random() > 0.2,
        creator_name: 'Demo User',
        invite_code: `DEMO${this.randomInt(1000, 9999)}`
      });
    }

    return challenges;
  }

  isDemoUser(): boolean {
    return localStorage.getItem('user_type') === 'demo';
  }
}
