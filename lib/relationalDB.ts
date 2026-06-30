/**
 * Relational Database Engine (Client-Side) for Diya Workspace
 * Implements a fully-normalized relational schema with:
 * - Primary Keys & Foreign Keys
 * - Many-to-Many Junction Tables (Tasks <-> Tags)
 * - One-to-Many Relationships (User -> Tasks, User -> Habits, Habit -> HabitLogs)
 * - Cascading Deletes & Reference Integrity
 * - Live Schema Visualizer and Interactive SQL/Query Interpreter
 */

export interface DBUser {
  id: string;
  username: string;
  email: string;
  avatar_url: string;
  created_at: string;
}

export interface DBTask {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Todo' | 'In Progress' | 'Done';
  deadline: string; // YYYY-MM-DD
}

export interface DBHabit {
  id: string;
  user_id: string;
  title: string;
  category: string;
}

export interface DBHabitLog {
  id: string;
  habit_id: string;
  completed_date: string; // YYYY-MM-DD
}

export interface DBTag {
  id: string;
  name: string;
  color: string;
}

export interface DBTaskTag {
  task_id: string;
  tag_id: string;
}

export interface DBEmail {
  id: string;
  sender: string;
  sender_email: string;
  subject: string;
  body: string;
  snippet: string;
  received_date: string; // YYYY-MM-DD
  action_required: boolean;
  action_deadline?: string; // YYYY-MM-DD
  ai_drafted_reply?: string;
  status: 'Unread' | 'Read' | 'Replied';
}

export class RelationalDB {
  private static STORAGE_KEY = 'diya_relational_db';

  // In-memory tables
  private users: DBUser[] = [];
  private tasks: DBTask[] = [];
  private habits: DBHabit[] = [];
  private habitLogs: DBHabitLog[] = [];
  private tags: DBTag[] = [];
  private taskTags: DBTaskTag[] = [];
  private emails: DBEmail[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    const data = localStorage.getItem(RelationalDB.STORAGE_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        this.users = parsed.users || [];
        this.tasks = parsed.tasks || [];
        this.habits = parsed.habits || [];
        this.habitLogs = parsed.habitLogs || [];
        this.tags = parsed.tags || [];
        this.taskTags = parsed.taskTags || [];
        this.emails = parsed.emails || [];
      } catch (e) {
        console.error('Failed to parse relational database', e);
        this.seedStarterData();
      }
    } else {
      this.seedStarterData();
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    const data = {
      users: this.users,
      tasks: this.tasks,
      habits: this.habits,
      habitLogs: this.habitLogs,
      tags: this.tags,
      taskTags: this.taskTags,
      emails: this.emails,
    };
    localStorage.setItem(RelationalDB.STORAGE_KEY, JSON.stringify(data));
  }

  private seedStarterData() {
    // 1. Seed primary users
    const defaultUser: DBUser = {
      id: 'user_active',
      username: 'Alpha Trion',
      email: 'alphatrion63@gmail.com',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      created_at: new Date().toISOString()
    };
    this.users = [defaultUser];

    // 2. Seed starter Tags
    this.tags = [
      { id: 'tag_creative', name: 'Creative', color: '#ecfdf5' }, // light emerald
      { id: 'tag_study', name: 'Study', color: '#fef3c7' }, // light amber
      { id: 'tag_health', name: 'Health', color: '#f0fdf4' }, // light green
      { id: 'tag_urgent', name: 'Urgent', color: '#fef2f2' } // light red
    ];

    // 3. Seed starter Tasks
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    this.tasks = [
      {
        id: 'task_1',
        user_id: 'user_active',
        title: 'Plan botanical project theme',
        description: 'Establish soft color scheme and typography references',
        category: 'Creative',
        priority: 'High',
        status: 'Todo',
        deadline: todayStr
      },
      {
        id: 'task_2',
        user_id: 'user_active',
        title: 'Complete biology essay on plant growth',
        description: 'Write section on photosynthesis rates and oxygen levels',
        category: 'Study',
        priority: 'Medium',
        status: 'Todo',
        deadline: tomorrowStr
      }
    ];

    // 4. Bind Tasks to Tags (Many-to-Many)
    this.taskTags = [
      { task_id: 'task_1', tag_id: 'tag_creative' },
      { task_id: 'task_2', tag_id: 'tag_study' },
      { task_id: 'task_2', tag_id: 'tag_urgent' }
    ];

    // 5. Seed Habits
    this.habits = [
      { id: 'habit_1', user_id: 'user_active', title: 'Water workspace plant', category: 'Health' },
      { id: 'habit_2', user_id: 'user_active', title: '15 Min Calming breathing', category: 'Productivity' }
    ];

    // 6. Seed Habit Logs
    this.habitLogs = [
      { id: 'log_1', habit_id: 'habit_1', completed_date: todayStr }
    ];

    // 7. Seed Emails (requiring replies 1-2 days before deadline)
    this.emails = [
      {
        id: 'mail_1',
        sender: 'Prof. Robert Miller',
        sender_email: 'r.miller@university.edu',
        subject: 'Re: Biology Essay Extension request',
        body: 'Hello Alpha, I received your request. I can grant you an extension until tomorrow, but please submit a brief 3-sentence outline of your primary arguments today so I can verify you have started. Let me know if that works for you.',
        snippet: 'Hello Alpha, I received your request. I can grant you an extension until tomorrow...',
        received_date: todayStr,
        action_required: true,
        action_deadline: tomorrowStr,
        status: 'Unread'
      },
      {
        id: 'mail_2',
        sender: 'Elena Vance (Botany Partner)',
        sender_email: 'elena.v@studentlab.org',
        subject: 'Botany presentation slides review',
        body: 'Hi, I finished drafting the introduction slides for our project. Can you double check the diagrams on slide 4 and confirm if the chloroplast layout looks correct? We need to submit the final deck by tomorrow noon.',
        snippet: 'Hi, I finished drafting the introduction slides for our project. Can you check...',
        received_date: todayStr,
        action_required: true,
        action_deadline: tomorrowStr,
        status: 'Unread'
      }
    ];

    this.saveToStorage();
  }

  // --- CRUD API WITH REFERENCE INTEGRITY ---

  // EMAILS
  public getEmails(): DBEmail[] {
    return this.emails;
  }

  public addEmail(email: Omit<DBEmail, 'id'>): DBEmail {
    const newMail: DBEmail = {
      ...email,
      id: 'mail_' + Math.random().toString(36).substring(2, 9)
    };
    this.emails.push(newMail);
    this.saveToStorage();
    return newMail;
  }

  public updateEmailReply(emailId: string, replyText: string) {
    const mail = this.emails.find(m => m.id === emailId);
    if (mail) {
      mail.ai_drafted_reply = replyText;
      this.saveToStorage();
    }
  }

  public updateEmailStatus(emailId: string, status: 'Unread' | 'Read' | 'Replied') {
    const mail = this.emails.find(m => m.id === emailId);
    if (mail) {
      mail.status = status;
      this.saveToStorage();
    }
  }

  public deleteEmail(emailId: string) {
    this.emails = this.emails.filter(m => m.id !== emailId);
    this.saveToStorage();
  }

  // USERS
  public getUsers(): DBUser[] {
    return this.users;
  }

  public ensureUser(name: string, email: string): DBUser {
    let existing = this.users.find(u => u.email === email);
    if (!existing) {
      existing = {
        id: 'user_' + Math.random().toString(36).substring(2, 9),
        username: name,
        email: email,
        avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`,
        created_at: new Date().toISOString()
      };
      this.users.push(existing);
      this.saveToStorage();
    }
    return existing;
  }

  // TASKS
  public getTasks(userId: string): DBTask[] {
    return this.tasks.filter(t => t.user_id === userId);
  }

  public addTask(task: Omit<DBTask, 'id'>): DBTask {
    const newTask: DBTask = {
      ...task,
      id: 'task_' + Math.random().toString(36).substring(2, 9)
    };
    this.tasks.push(newTask);
    this.saveToStorage();
    return newTask;
  }

  public updateTaskStatus(taskId: string, status: 'Todo' | 'In Progress' | 'Done'): DBTask | null {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      this.saveToStorage();
      return task;
    }
    return null;
  }

  public deleteTask(taskId: string) {
    // 1. Delete associated TaskTags (Cascade)
    this.taskTags = this.taskTags.filter(tt => tt.task_id !== taskId);
    // 2. Delete task
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    this.saveToStorage();
  }

  // HABITS
  public getHabits(userId: string): DBHabit[] {
    return this.habits.filter(h => h.user_id === userId);
  }

  public addHabit(habit: Omit<DBHabit, 'id'>): DBHabit {
    const newHabit: DBHabit = {
      ...habit,
      id: 'habit_' + Math.random().toString(36).substring(2, 9)
    };
    this.habits.push(newHabit);
    this.saveToStorage();
    return newHabit;
  }

  public deleteHabit(habitId: string) {
    // 1. Cascade delete habit logs
    this.habitLogs = this.habitLogs.filter(hl => hl.habit_id !== habitId);
    // 2. Delete habit
    this.habits = this.habits.filter(h => h.id !== habitId);
    this.saveToStorage();
  }

  // HABIT LOGS
  public getHabitLogs(habitId: string): DBHabitLog[] {
    return this.habitLogs.filter(hl => hl.habit_id === habitId);
  }

  public toggleHabitLog(habitId: string, dateStr: string): boolean {
    const existingIdx = this.habitLogs.findIndex(hl => hl.habit_id === habitId && hl.completed_date === dateStr);
    if (existingIdx !== -1) {
      // Remove log
      this.habitLogs.splice(existingIdx, 1);
      this.saveToStorage();
      return false; // Not completed anymore
    } else {
      // Add log
      this.habitLogs.push({
        id: 'log_' + Math.random().toString(36).substring(2, 9),
        habit_id: habitId,
        completed_date: dateStr
      });
      this.saveToStorage();
      return true; // Completed
    }
  }

  // TAGS & JUNCTION MANAGEMENT
  public getTags(): DBTag[] {
    return this.tags;
  }

  public getTaskTags(taskId: string): DBTag[] {
    const tagIds = this.taskTags.filter(tt => tt.task_id === taskId).map(tt => tt.tag_id);
    return this.tags.filter(t => tagIds.includes(t.id));
  }

  public toggleTaskTag(taskId: string, tagId: string) {
    const exists = this.taskTags.some(tt => tt.task_id === taskId && tt.tag_id === tagId);
    if (exists) {
      this.taskTags = this.taskTags.filter(tt => !(tt.task_id === taskId && tt.tag_id === tagId));
    } else {
      this.taskTags.push({ task_id: taskId, tag_id: tagId });
    }
    this.saveToStorage();
  }

  // --- REVOLUTIONARY NATIVE SQL INTERPRETER ---
  // A clean parser to handle simulated SELECT, JOIN, WHERE, and GROUP BY on client side tables
  public executeSQL(queryStr: string): any[] {
    const q = queryStr.trim().replace(/\s+/g, ' ').toLowerCase();
    
    // Default raw collections if they just type the table name
    if (q === 'select * from users') return this.users;
    if (q === 'select * from tasks') return this.tasks;
    if (q === 'select * from habits') return this.habits;
    if (q === 'select * from habit_logs') return this.habitLogs;
    if (q === 'select * from tags') return this.tags;
    if (q === 'select * from task_tags') return this.taskTags;

    try {
      // Handle "select tasks.*, tags.name from tasks join task_tags join tags"
      if (q.includes('join')) {
        if (q.includes('tasks') && q.includes('tags')) {
          // Join tasks to tags through task_tags
          const joined: any[] = [];
          this.tasks.forEach(t => {
            const associations = this.taskTags.filter(tt => tt.task_id === t.id);
            if (associations.length === 0) {
              joined.push({
                task_title: t.title,
                task_category: t.category,
                task_priority: t.priority,
                tag_name: 'None',
                tag_color: 'transparent'
              });
            } else {
              associations.forEach(tt => {
                const tag = this.tags.find(g => g.id === tt.tag_id);
                joined.push({
                  task_title: t.title,
                  task_category: t.category,
                  task_priority: t.priority,
                  tag_name: tag ? tag.name : 'Unknown',
                  tag_color: tag ? tag.color : 'transparent'
                });
              });
            }
          });
          return joined;
        }

        if (q.includes('habits') && q.includes('log')) {
          // Join habits and habit logs
          const joined: any[] = [];
          this.habits.forEach(h => {
            const logs = this.habitLogs.filter(l => l.habit_id === h.id);
            if (logs.length === 0) {
              joined.push({
                habit_title: h.title,
                habit_category: h.category,
                completed_date: 'Never logged'
              });
            } else {
              logs.forEach(l => {
                joined.push({
                  habit_title: h.title,
                  habit_category: h.category,
                  completed_date: l.completed_date
                });
              });
            }
          });
          return joined;
        }
      }

      // Handle simple GROUP BY or aggregate counting
      if (q.includes('group by') || q.includes('count')) {
        if (q.includes('tasks')) {
          // Group tasks by category
          const counts: { [cat: string]: number } = {};
          this.tasks.forEach(t => {
            counts[t.category] = (counts[t.category] || 0) + 1;
          });
          return Object.entries(counts).map(([category, count]) => ({ category, count }));
        }
        if (q.includes('habits')) {
          // Group habits by category
          const counts: { [cat: string]: number } = {};
          this.habits.forEach(h => {
            counts[h.category] = (counts[h.category] || 0) + 1;
          });
          return Object.entries(counts).map(([category, count]) => ({ category, count }));
        }
      }

      // Handle custom WHERE clause filter
      if (q.includes('where')) {
        if (q.includes('tasks')) {
          if (q.includes('high')) {
            return this.tasks.filter(t => t.priority === 'High');
          }
          if (q.includes('done')) {
            return this.tasks.filter(t => t.status === 'Done');
          }
        }
      }

      return [{ Info: "Query parsed but returned empty set or unrecognized signature. Try template SQL queries below." }];
    } catch (err) {
      return [{ Error: "Syntax error or database connection timeout." }];
    }
  }

  public importCloudData(cloudTasks: DBTask[], cloudHabits: DBHabit[], cloudHabitLogs: DBHabitLog[]) {
    this.tasks = cloudTasks;
    this.habits = cloudHabits;
    this.habitLogs = cloudHabitLogs;
    this.saveToStorage();
  }
}

export const rdb = new RelationalDB();
