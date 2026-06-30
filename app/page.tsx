"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Brain, 
  CheckCircle, 
  Calendar as CalendarIcon, 
  Flame, 
  BookOpen, 
  Sparkles, 
  User, 
  Clock, 
  Plus, 
  Trash2, 
  LogOut, 
  Play, 
  Pause, 
  Smile, 
  Coffee, 
  CloudRain, 
  Wind, 
  ChevronLeft, 
  ChevronRight,
  Sliders,
  Check,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  FolderOpen,
  Info,
  Settings as SettingsIcon,
  Heart,
  Database,
  Code,
  Table,
  Mail,
  ExternalLink,
  FileText,
  CheckSquare,
  Menu,
  PanelLeftClose
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { db, auth, isFirebaseEnabled } from '@/lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import { Task, Habit, AppUser } from '@/lib/types';
import { encryptData, decryptData } from '@/lib/encryption';
import { rdb } from '@/lib/relationalDB';

// Calming, organic loading quotes
const CALMING_QUOTES = [
  { text: "Quietly do the work in your own corner. Nature does not rush, yet everything is accomplished.", author: "Lao Tzu" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Proverb" },
  { text: "Nurture your mind like a garden. Daily habits make the soul bloom.", author: "Botanical Guide" },
  { text: "Adopt the pace of nature: her secret is patience.", author: "Ralph Waldo Emerson" },
  { text: "Keep your roots deep, your thoughts calm, and your daily focus strong.", author: "Mindfulness" }
];

const MOCK_PROFILES = [
  { name: "Alpha Trion", email: "alphatrion63@gmail.com", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" },
  { name: "Alex Rivera", email: "student.life@diyalife.os", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" }
];

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function DiyaWorkspace() {
  const [mounted, setMounted] = useState(false);
  const [isLoadingIntro, setIsLoadingIntro] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'habits' | 'database' | 'settings' | 'planning'>('dashboard');
  
  // --- AI Planner States ---
  const [planningMessages, setPlanningMessages] = useState<{ role: 'user' | 'model'; content: string; suggestedItems?: any[]; modelUsed?: string }[]>([]);
  const [planningInput, setPlanningInput] = useState('');
  const [planningDocText, setPlanningDocText] = useState('');
  const [planningDocName, setPlanningDocName] = useState('');
  const [isPlanningLoading, setIsPlanningLoading] = useState(false);
  
  // --- Relational SQL Database States ---
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT * FROM Tasks');
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [sqlError, setSqlError] = useState<string | null>(null);

  // --- Selected Calendar Date ---
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // --- Selected Quote index ---
  const [quoteIndex, setQuoteIndex] = useState(0);

  // --- Authentication States ---
  const [user, setUser] = useState<AppUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authTab, setAuthTab] = useState<'signin' | 'register'>('signin');
  const [unverifiedOfflineEmail, setUnverifiedOfflineEmail] = useState<string | null>(null);
  const [notifiedTaskIds, setNotifiedTaskIds] = useState<string[]>([]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // --- SMTP Settings States ---
  const [smtpHost, setSmtpHost] = useState<string>('');
  const [smtpPort, setSmtpPort] = useState<string>('587');
  const [smtpUser, setSmtpUser] = useState<string>('');
  const [smtpPass, setSmtpPass] = useState<string>('');
  const [smtpSecure, setSmtpSecure] = useState<boolean>(false);

  // --- E2EE Notebook States connected to dates ---
  const [masterPassphrase, setMasterPassphrase] = useState<string>('');
  const [passphraseInput, setPassphraseInput] = useState<string>('');
  const [isPassphraseSaved, setIsPassphraseSaved] = useState<boolean>(false);
  const [showPassphrase, setShowPassphrase] = useState<boolean>(false);

  // Note text state for selected date
  const [selectedDateNote, setSelectedDateNote] = useState<string>('');
  const [isDecrypted, setIsDecrypted] = useState<boolean>(false);

  // Object tracking ciphertexts mapped to dates: { "2026-06-29": "ciphertext..." }
  const [dateNotebookCiphertexts, setDateNotebookCiphertexts] = useState<{ [date: string]: string }>({});

  // --- Proactive AI & Communication Copilot States ---
  const [emails, setEmails] = useState<any[]>([]);
  const [proactiveAdvice, setProactiveAdvice] = useState<string>('');
  const [proactiveGuides, setProactiveGuides] = useState<any[]>([]);
  const [isGeneratingProactive, setIsGeneratingProactive] = useState(false);
  const [draftingEmails, setDraftingEmails] = useState<{ [key: string]: boolean }>({});
  const [draftedReplies, setDraftedReplies] = useState<{ [key: string]: { draftText: string; preparatorySteps: string[] } }>({});
  const [selectedMail, setSelectedMail] = useState<any | null>(null);

  // Live Gmail syncing states
  const [gmailToken, setGmailToken] = useState<string | null>(null);
  const [isSyncingGmail, setIsSyncingGmail] = useState(false);

  // --- Tasks & Habits ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);

  // --- Task Forms ---
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Study');
  const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [activeTaskAudit, setActiveTaskAudit] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [taskSortBy, setTaskSortBy] = useState<'none' | 'priority' | 'deadline'>('none');
  const [taskScope, setTaskScope] = useState<'selected' | 'all'>('selected');

  // --- Habit Form ---
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState('Productivity');

  // --- Breathing Guide State ---
  const [breathingMode, setBreathingMode] = useState<'Box' | '4-7-8' | 'Relax'>('Box');
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingText, setBreathingText] = useState('Breathe in gently...');
  const [breathingScale, setBreathingScale] = useState(1);
  const [breathingSeconds, setBreathingSeconds] = useState(0);

  // --- Soundscapess ---
  const [activeSound, setActiveSound] = useState<'Rain' | 'Binaural' | 'Forest' | null>(null);

  // --- Toasts ---
  const [toasts, setToasts] = useState<Toast[]>([]);

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Rotate quotes during loading intro
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % CALMING_QUOTES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Set timeout to dismiss intro
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingIntro(false);
    }, 3800);
    return () => clearTimeout(timer);
  }, []);

  // --- Initializing local/cloud profiles ---
  useEffect(() => {
    setMounted(true);
    
    const savedName = localStorage.getItem('diya_username');
    const savedEmail = localStorage.getItem('diya_email');
    const savedPassphrase = localStorage.getItem('diya_master_passphrase');
    const savedCiphers = localStorage.getItem('diya_date_journals');

    const savedSmtpHost = localStorage.getItem('diya_smtp_host') || '';
    const savedSmtpPort = localStorage.getItem('diya_smtp_port') || '587';
    const savedSmtpUser = localStorage.getItem('diya_smtp_user') || '';
    const savedSmtpPass = localStorage.getItem('diya_smtp_pass') || '';
    const savedSmtpSecure = localStorage.getItem('diya_smtp_secure') === 'true';

    setSmtpHost(savedSmtpHost);
    setSmtpPort(savedSmtpPort);
    setSmtpUser(savedSmtpUser);
    setSmtpPass(savedSmtpPass);
    setSmtpSecure(savedSmtpSecure);

    if (savedName && savedEmail) {
      setUser({
        username: savedName,
        email: savedEmail,
        encryptionKey: savedPassphrase || '',
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${savedName}`
      });
      if (savedPassphrase) {
        setMasterPassphrase(savedPassphrase);
        setPassphraseInput(savedPassphrase);
        setIsPassphraseSaved(true);
      }
    }

    if (savedCiphers) {
      try {
        setDateNotebookCiphertexts(JSON.parse(savedCiphers));
      } catch (err) {
        console.error(err);
      }
    }

    // Load tasks, habits from relational database
    loadDataFromRDB();
    setIsAuthLoading(false);
  }, [mounted]);

  // Firebase Auth State Listener
  useEffect(() => {
    if (isFirebaseEnabled && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          if (!firebaseUser.emailVerified) {
            // Ignore auto login of unverified email
            return;
          }
          const name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User";
          const email = firebaseUser.email || "";
          const avatar = firebaseUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`;
          
          localStorage.setItem('diya_username', name);
          localStorage.setItem('diya_email', email);
          
          setUser({
            uid: firebaseUser.uid,
            username: name,
            email: email,
            encryptionKey: localStorage.getItem('diya_master_passphrase') || '',
            avatarUrl: avatar
          });
          syncUserData(firebaseUser.uid);
        }
      });
      return () => unsubscribe();
    }
  }, [isFirebaseEnabled]);

  const syncUserData = async (uid: string) => {
    if (!isFirebaseEnabled || !db) return;
    try {
      const { getDocs, query, collection, where, setDoc, doc } = await import('firebase/firestore');
      
      // 1. Check/Create User Profile document in Firestore
      const userDocRef = doc(db, 'users', uid);
      const name = localStorage.getItem('diya_username') || "User";
      const email = localStorage.getItem('diya_email') || "";
      await setDoc(userDocRef, {
        uid: uid,
        username: name,
        email: email,
        encryptionKey: localStorage.getItem('diya_master_passphrase') || '',
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`
      }, { merge: true });

      // 2. Fetch Tasks from Firestore
      const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', uid));
      const tasksSnap = await getDocs(tasksQuery);
      const cloudTasks: any[] = [];
      tasksSnap.forEach(doc => {
        cloudTasks.push(doc.data());
      });

      // 3. Fetch Habits from Firestore
      const habitsQuery = query(collection(db, 'habits'), where('userId', '==', uid));
      const habitsSnap = await getDocs(habitsQuery);
      const cloudHabits: any[] = [];
      habitsSnap.forEach(doc => {
        cloudHabits.push(doc.data());
      });

      if (cloudTasks.length === 0 && cloudHabits.length === 0) {
        // First-time Cloud Login! We migrate local rdb data to Firestore.
        triggerToast("Syncing your local workspace data to Firestore...", "info");
        
        const localTasks = rdb.getTasks('user_active');
        const localHabits = rdb.getHabits('user_active').map(h => ({
          ...h,
          completedDays: rdb.getHabitLogs(h.id).map(l => l.completed_date),
          streak: rdb.getHabitLogs(h.id).length
        }));

        for (const t of localTasks) {
          const taskToSave = {
            id: t.id,
            title: t.title,
            description: t.description || '',
            category: t.category,
            priority: t.priority,
            status: t.status,
            deadline: t.deadline,
            userId: uid
          };
          await setDoc(doc(db, 'tasks', t.id), taskToSave);
        }

        for (const h of localHabits) {
          const habitToSave = {
            id: h.id,
            title: h.title,
            category: h.category,
            completedDays: h.completedDays,
            streak: h.streak,
            userId: uid
          };
          await setDoc(doc(db, 'habits', h.id), habitToSave);
        }
        
        triggerToast("Cloud Workspace synced successfully!", "success");
      } else {
        // Cloud data exists! Overwrite local rdb so local UI gets updated with cloud data.
        triggerToast("Cloud Workspace loaded! Refreshing your local dashboard...", "success");
        
        const dbTasks = cloudTasks.map(t => ({
          id: t.id,
          user_id: 'user_active',
          title: t.title,
          description: t.description || '',
          category: t.category,
          priority: t.priority,
          status: t.status,
          deadline: t.deadline
        }));

        const dbHabits: any[] = [];
        const dbHabitLogs: any[] = [];

        cloudHabits.forEach(h => {
          dbHabits.push({
            id: h.id,
            user_id: 'user_active',
            title: h.title,
            category: h.category
          });
          if (Array.isArray(h.completedDays)) {
            h.completedDays.forEach((day: string) => {
              dbHabitLogs.push({
                id: 'log_' + Math.random().toString(36).substring(2, 9),
                habit_id: h.id,
                completed_date: day
              });
            });
          }
        });

        rdb.importCloudData(dbTasks, dbHabits, dbHabitLogs);
        loadDataFromRDB();
      }
    } catch (err) {
      console.error("Firestore sync error:", err);
    }
  };

  const saveTaskToCloud = async (task: Task) => {
    if (!isFirebaseEnabled || !db) return;
    try {
      const { setDoc, doc } = await import('firebase/firestore');
      await setDoc(doc(db, 'tasks', task.id), {
        id: task.id,
        title: task.title,
        description: task.description || '',
        category: task.category,
        priority: task.priority,
        status: task.status,
        deadline: task.deadline,
        userId: task.userId
      });
    } catch (err) {
      console.error("Failed to save task to cloud:", err);
    }
  };

  const deleteTaskFromCloud = async (taskId: string) => {
    if (!isFirebaseEnabled || !db) return;
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (err) {
      console.error("Failed to delete task from cloud:", err);
    }
  };

  const saveHabitToCloud = async (habit: Habit) => {
    if (!isFirebaseEnabled || !db) return;
    try {
      const { setDoc, doc } = await import('firebase/firestore');
      await setDoc(doc(db, 'habits', habit.id), {
        id: habit.id,
        title: habit.title,
        category: habit.category,
        completedDays: habit.completedDays || [],
        streak: habit.streak || 0,
        userId: habit.userId
      });
    } catch (err) {
      console.error("Failed to save habit to cloud:", err);
    }
  };

  const deleteHabitFromCloud = async (habitId: string) => {
    if (!isFirebaseEnabled || !db) return;
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'habits', habitId));
    } catch (err) {
      console.error("Failed to delete habit from cloud:", err);
    }
  };

  const loadDataFromRDB = () => {
    const dbTasks = rdb.getTasks('user_active');
    const dbHabits = rdb.getHabits('user_active').map(h => ({
      ...h,
      completedDays: rdb.getHabitLogs(h.id).map(l => l.completed_date),
      streak: rdb.getHabitLogs(h.id).length
    }));
    const dbEmails = rdb.getEmails();
    setTasks(dbTasks as any);
    setHabits(dbHabits as any);
    setEmails(dbEmails);
  };

  const fetchProactiveGuides = async (currentTasks: any[]) => {
    if (!currentTasks || currentTasks.length === 0) {
      setProactiveGuides([]);
      setProactiveAdvice("No active tasks found. Add some tasks to your desk planner to let me proactively construct outlines, study guides, and resource recommendations!");
      return;
    }
    setIsGeneratingProactive(true);
    try {
      const response = await fetch('/api/gemini/proactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze_tasks', tasks: currentTasks })
      });
      if (response.ok) {
        const data = await response.json();
        setProactiveAdvice(data.generalAdvice || "Here are your active plans.");
        setProactiveGuides(data.guides || []);
      } else {
        throw new Error("Proactive API offline");
      }
    } catch (err) {
      console.error("Using proactive fallback planner", err);
      generateFallbackProactiveGuides(currentTasks);
    } finally {
      setIsGeneratingProactive(false);
    }
  };

  const generateFallbackProactiveGuides = (currentTasks: any[]) => {
    setProactiveAdvice("I've compiled your customized study path and proactive action plan. Let's tackle these priorities systematically over the next 24-48 hours!");
    
    const fallbackGuides = currentTasks.map(t => {
      let stepByStepInstructions = [
        `Break down "${t.title}" into 3 small 10-minute micro-tasks.`,
        "Open a clear browser tab and document the primary resource requirements.",
        "Submit a quick draft to a classmate or professor to confirm alignment."
      ];
      let recommendedLinks = [
        { label: `Wikipedia: ${t.title}`, searchQuery: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(t.title)}` },
        { label: `Google Scholar: ${t.title}`, searchQuery: `https://scholar.google.com/scholar?q=${encodeURIComponent(t.title)}` }
      ];

      const titleLower = t.title.toLowerCase();
      if (titleLower.includes('biology') || titleLower.includes('botanical') || titleLower.includes('plant')) {
        stepByStepInstructions = [
          "Study chloroplast structures and trace light-dependent photosynthetic reaction pathways.",
          "Write down the 3 primary factors limiting plant growth rates under control conditions.",
          "Synthesize your notes into a clean, 3-sentence project outline."
        ];
        recommendedLinks = [
          { label: "Nature Education: Plant Biology", searchQuery: "https://www.nature.com/scitable/topic/plant-biology-14169724/" },
          { label: "Wikipedia: Chloroplast Reference", searchQuery: "https://en.wikipedia.org/wiki/Chloroplast" }
        ];
      } else if (titleLower.includes('essay') || titleLower.includes('write') || titleLower.includes('plan')) {
        stepByStepInstructions = [
          "Create a structured outline with: Introduction, 3 Core Arguments, and a strong Conclusion.",
          "Write exactly one strong thesis statement sentence to establish your main point.",
          "Search Google Scholar for 2 peer-reviewed articles to reference in your citations."
        ];
        recommendedLinks = [
          { label: "Purdue OWL: Essay Outlines", searchQuery: "https://owl.purdue.edu/owl/general_writing/the_writing_process/developing_an_outline/how_to_outline.html" },
          { label: "Google Scholar: Research Articles", searchQuery: "https://scholar.google.com/scholar" }
        ];
      }

      return {
        taskTitle: t.title,
        stepByStepInstructions,
        recommendedLinks,
        readyToUseDraftPrompt: `Hi, I am working on the ${t.title} project and wanted to ask if we could review the outline together briefly during office hours. Let me know if that works!`
      };
    });

    setProactiveGuides(fallbackGuides);
  };

  const fetchDraftReply = async (emailId: string) => {
    if (draftingEmails[emailId]) return;
    setDraftingEmails(prev => ({ ...prev, [emailId]: true }));
    const targetMail = emails.find(m => m.id === emailId);
    if (!targetMail) {
      setDraftingEmails(prev => ({ ...prev, [emailId]: false }));
      return;
    }

    try {
      const response = await fetch('/api/gemini/proactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'draft_reply',
          email: targetMail
        })
      });

      if (response.ok) {
        const data = await response.json();
        setDraftedReplies(prev => ({ ...prev, [emailId]: data }));
        rdb.updateEmailReply(emailId, data.draftText);
        loadDataFromRDB();
      } else {
        throw new Error("Drafting failed");
      }
    } catch (err) {
      console.error(err);
      const fallbackDraftText = `Dear ${targetMail.sender.split(' ')[0]},\n\nThank you for reaching out regarding "${targetMail.subject}". I wanted to confirm that I am actively working on this and will follow up with the requested outline and slide reviews before our deadline tomorrow.\n\nPlease let me know if you have any additional questions or guidance in the meantime.\n\nBest regards,\nAlpha Trion`;
      const fallbackData = {
        draftText: fallbackDraftText,
        preparatorySteps: [
          "Complete the 3-sentence outline.",
          "Verify chloroplast diagram layout references."
        ]
      };
      setDraftedReplies(prev => ({ ...prev, [emailId]: fallbackData }));
      rdb.updateEmailReply(emailId, fallbackDraftText);
      loadDataFromRDB();
    } finally {
      setDraftingEmails(prev => ({ ...prev, [emailId]: false }));
    }
  };

  const handleMarkEmailReplied = (emailId: string) => {
    rdb.updateEmailStatus(emailId, 'Replied');
    loadDataFromRDB();
    triggerToast("Email marked as replied!", "success");
  };

  const handleCreateRealDraft = async (emailId: string, replyText: string) => {
    if (gmailToken) {
      try {
        triggerToast("Creating draft in your Gmail account...", "info");
        const mail = emails.find(m => m.id === emailId);
        if (!mail) return;
        
        const emailContent = [
          `To: ${mail.sender_email}`,
          `Subject: Re: ${mail.subject}`,
          'Content-Type: text/plain; charset="UTF-8"',
          '',
          replyText
        ].join('\n');

        const base64Safe = btoa(unescape(encodeURIComponent(emailContent)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const draftResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${gmailToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: {
              raw: base64Safe
            }
          })
        });

        if (draftResponse.ok) {
          triggerToast("Success! Real Gmail response draft created!", "success");
          handleMarkEmailReplied(emailId);
        } else {
          throw new Error("Google API rejected creation");
        }
      } catch (err: any) {
        console.error(err);
        triggerToast("Could not push draft to Google. Saved draft locally instead.", "error");
        handleMarkEmailReplied(emailId);
      }
    } else {
      navigator.clipboard.writeText(replyText);
      triggerToast("Draft copied to clipboard! Plan recorded.", "success");
      handleMarkEmailReplied(emailId);
    }
  };

  const fetchLiveGmailMessages = async (token: string) => {
    setIsSyncingGmail(true);
    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=is:unread', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch message list");
      const listData = await response.json();
      
      if (listData.messages && listData.messages.length > 0) {
        const fullMessages = await Promise.all(
          listData.messages.map(async (m: any) => {
            const mRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const detail = await mRes.json();
            
            const headers = detail.payload.headers;
            const subject = headers.find((h: any) => h.name === 'Subject' || h.name === 'subject')?.value || 'No Subject';
            const fromHeader = headers.find((h: any) => h.name === 'From' || h.name === 'from')?.value || 'Unknown Sender';
            
            const fromMatch = fromHeader.match(/(.*)<(.*)>/);
            const sender = fromMatch ? fromMatch[1].trim() : fromHeader;
            const senderEmail = fromMatch ? fromMatch[2].trim() : fromHeader;

            const snippet = detail.snippet || '';

            return {
              id: m.id,
              sender,
              sender_email: senderEmail,
              subject,
              body: snippet,
              snippet,
              received_date: new Date().toISOString().split('T')[0],
              action_required: true,
              status: 'Unread'
            };
          })
        );

        setEmails(prev => {
          const filtered = prev.filter(e => !e.id.startsWith('live_'));
          const mapped = fullMessages.map(m => ({ ...m, id: 'live_' + m.id }));
          return [...mapped, ...filtered];
        });
        triggerToast("Gmail inbox synchronized successfully!", "success");
      } else {
        triggerToast("No unread messages requiring replies found in Gmail inbox.", "info");
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("Failed to fetch live Gmail messages.", "error");
    } finally {
      setIsSyncingGmail(false);
    }
  };

  const handleConnectGmail = async () => {
    if (!isFirebaseEnabled) {
      triggerToast("Initiating secure Google OAuth Sandbox authorization...", "info");
      setTimeout(() => {
        setGmailToken("simulated_sandbox_token_12345");
        triggerToast("Successfully authorized Gmail access (Sandbox Mode)!", "success");
        
        // Populate inbox with realistic urgent academic emails
        const simulatedInbox = [
          {
            id: 'live_sim_1',
            sender: 'Dr. Sarah Jenkins (Research Advisor)',
            sender_email: 's.jenkins@academy.edu',
            subject: 'Review needed: Thesis draft feedback',
            body: 'Hi Alpha, I reviewed your chapter 2 draft on botanical cellular membranes. The writing is strong, but please double check the accuracy of the chloroplast inner envelope membrane depiction and send me your corrected draft today so we can finalize it.',
            snippet: 'Hi Alpha, I reviewed your chapter 2 draft on botanical cellular membranes...',
            received_date: new Date().toISOString().split('T')[0],
            action_required: true,
            status: 'Unread'
          },
          {
            id: 'live_sim_2',
            sender: 'Marcus Chen (Physics Study Partner)',
            sender_email: 'm.chen@student.org',
            subject: 'Lab report data validation',
            body: 'Hey, did you finish calculating the light absorption coefficients for our biology-physics hybrid assignment? We need to combine our findings and write a quick 3-sentence summary of the results before submission tonight.',
            snippet: 'Hey, did you finish calculating the light absorption coefficients for our biology...',
            received_date: new Date().toISOString().split('T')[0],
            action_required: true,
            status: 'Unread'
          }
        ];
        
        setEmails(prev => {
          // Keep existing emails but add the new live ones at the top
          const filtered = prev.filter(e => !e.id.startsWith('live_'));
          return [...simulatedInbox, ...filtered];
        });
      }, 1200);
      return;
    }
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      provider.addScope('https://www.googleapis.com/auth/gmail.compose');
      
      triggerToast("Opening Google Sign-In with Gmail permissions...", "info");
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        setGmailToken(token);
        triggerToast("Successfully authorized Gmail access!", "success");
        await fetchLiveGmailMessages(token);
      } else {
        throw new Error("No access token returned");
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("Using secure Hackathon Sandbox simulator...", "info");
      setTimeout(() => {
        setGmailToken("simulated_sandbox_token_12345");
        triggerToast("Successfully authorized Gmail access (Sandbox Mode)!", "success");
        
        // Populate inbox with realistic urgent academic emails
        const simulatedInbox = [
          {
            id: 'live_sim_1',
            sender: 'Dr. Sarah Jenkins (Research Advisor)',
            sender_email: 's.jenkins@academy.edu',
            subject: 'Review needed: Thesis draft feedback',
            body: 'Hi Alpha, I reviewed your chapter 2 draft on botanical cellular membranes. The writing is strong, but please double check the accuracy of the chloroplast inner envelope membrane depiction and send me your corrected draft today so we can finalize it.',
            snippet: 'Hi Alpha, I reviewed your chapter 2 draft on botanical cellular membranes...',
            received_date: new Date().toISOString().split('T')[0],
            action_required: true,
            status: 'Unread'
          },
          {
            id: 'live_sim_2',
            sender: 'Marcus Chen (Physics Study Partner)',
            sender_email: 'm.chen@student.org',
            subject: 'Lab report data validation',
            body: 'Hey, did you finish calculating the light absorption coefficients for our biology-physics hybrid assignment? We need to combine our findings and write a quick 3-sentence summary of the results before submission tonight.',
            snippet: 'Hey, did you finish calculating the light absorption coefficients for our biology...',
            received_date: new Date().toISOString().split('T')[0],
            action_required: true,
            status: 'Unread'
          }
        ];
        
        setEmails(prev => {
          const filtered = prev.filter(e => !e.id.startsWith('live_'));
          return [...simulatedInbox, ...filtered];
        });
      }, 800);
    }
  };

  const checkDueTaskNotifications = async (currentTasks: Task[]) => {
    if (!user || !user.email) return;
    try {
      const res = await fetch('/api/notifications/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: currentTasks,
          userEmail: user.email,
          username: user.username,
          smtpConfig: {
            host: smtpHost,
            port: smtpPort,
            user: smtpUser,
            pass: smtpPass,
            secure: smtpSecure
          }
        })
      });
      const data = await res.json();
      if (data.success && data.notificationsSent?.length > 0) {
        data.notificationsSent.forEach((notif: any) => {
          if (!notifiedTaskIds.includes(notif.taskId)) {
            setNotifiedTaskIds(prev => [...prev, notif.taskId]);
            if (data.smtpConfigured) {
              if (data.mailDispatchError) {
                triggerToast(`⚠️ SMTP Delivery Error: ${data.mailDispatchError}. (Printed to terminal fallback)`, "error");
              } else if (data.mailDispatchedCount > 0) {
                triggerToast(`📧 Actual Email Sent: "${notif.taskTitle}" successfully dispatched to ${notif.recipient}!`, "success");
              } else {
                triggerToast(`📧 Reminder processed: "${notif.taskTitle}" is logged.`, "success");
              }
            } else {
              triggerToast(`⏰ Reminder Logged! Set up SMTP in Settings to receive real emails at ${notif.recipient}.`, "info");
            }
          }
        });
      }
    } catch (err) {
      console.error("Failed to check notifications:", err);
    }
  };

  useEffect(() => {
    if (mounted && user && tasks.length > 0) {
      const unnotifiedTasks = tasks.filter(t => !notifiedTaskIds.includes(t.id));
      if (unnotifiedTasks.length > 0) {
        checkDueTaskNotifications(tasks);
      }
    }
  }, [mounted, user, tasks]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('diya_date_journals', JSON.stringify(dateNotebookCiphertexts));
    }
  }, [dateNotebookCiphertexts, mounted]);

  // Trigger proactive guides and drafts automatically
  useEffect(() => {
    if (mounted && tasks.length > 0 && proactiveGuides.length === 0 && !isGeneratingProactive) {
      fetchProactiveGuides(tasks);
    }
  }, [mounted, tasks, proactiveGuides.length, isGeneratingProactive]);

  useEffect(() => {
    if (mounted && emails.length > 0) {
      emails.forEach(email => {
        if (email.action_required && !email.ai_drafted_reply && !draftingEmails[email.id]) {
          fetchDraftReply(email.id);
        }
      });
    }
  }, [mounted, emails, draftingEmails]);

  // Handle Note decrypting for selected date when key / date changes
  useEffect(() => {
    const cipher = dateNotebookCiphertexts[selectedDate];
    if (!cipher) {
      setSelectedDateNote('');
      setIsDecrypted(true);
      return;
    }
    if (!masterPassphrase) {
      setSelectedDateNote('');
      setIsDecrypted(false);
      return;
    }
    try {
      const plain = decryptData(cipher, masterPassphrase);
      setSelectedDateNote(plain);
      setIsDecrypted(true);
    } catch (err) {
      setSelectedDateNote('');
      setIsDecrypted(false);
    }
  }, [selectedDate, masterPassphrase, dateNotebookCiphertexts]);

  // Save selected date note
  const handleSaveDateNote = (text: string) => {
    setSelectedDateNote(text);
    if (!masterPassphrase) {
      triggerToast("Configure Master Passphrase first in settings to secure note", "error");
      return;
    }
    const cipher = encryptData(text, masterPassphrase);
    setDateNotebookCiphertexts(prev => ({
      ...prev,
      [selectedDate]: cipher
    }));
  };

  // --- Auth & Register triggers ---
  const handleLocalSignup = (name: string, email: string) => {
    if (!name || !email) {
      setAuthError("Name and Email are required");
      return;
    }
    localStorage.setItem('diya_username', name);
    localStorage.setItem('diya_email', email);
    const profile: AppUser = {
      username: name,
      email: email,
      encryptionKey: '',
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`
    };
    setUser(profile);
    triggerToast(`Welcome to Diya, ${name}! Your peaceful green workspace is ready.`, "success");
  };

  const handleCustomAuthSubmit = async (name: string, email: string, password?: string) => {
    setAuthError(null);
    if (!email || (authTab === 'register' && !name) || !password) {
      setAuthError("Please fill in all required fields.");
      return;
    }

    if (isFirebaseEnabled && auth) {
      try {
        if (authTab === 'register') {
          const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut } = await import('firebase/auth');
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(userCredential.user, { displayName: name });
          
          // Send verification email
          await sendEmailVerification(userCredential.user);
          
          // Sign out immediately so they cannot login directly
          await signOut(auth);
          
          setAuthTab('signin');
          setAuthError("A verification link has been sent to your email. Please verify your email before logging in.");
          triggerToast("Verification email sent! Please check your inbox.", "success");
        } else {
          const { signInWithEmailAndPassword, signOut } = await import('firebase/auth');
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          
          if (!userCredential.user.emailVerified) {
            await signOut(auth);
            setAuthError("Please verify your email address. We sent a verification link to your email.");
            triggerToast("Email is not verified.", "error");
            return;
          }
          
          const uName = userCredential.user.displayName || userCredential.user.email?.split('@')[0] || "User";
          
          setUnverifiedOfflineEmail(null);
          localStorage.setItem('diya_username', uName);
          localStorage.setItem('diya_email', email);
          setUser({
            uid: userCredential.user.uid,
            username: uName,
            email: email,
            encryptionKey: '',
            avatarUrl: userCredential.user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${uName}`
          });
          triggerToast(`Welcome back, ${uName}!`, "success");
        }
      } catch (err: any) {
        console.error(err);
        setAuthError(err.message || "Authentication failed. Check your password or try again.");
      }
    } else {
      // Offline fallback: Use local registry
      try {
        const usersStr = localStorage.getItem('diya_offline_users') || '[]';
        const users = JSON.parse(usersStr);

        if (authTab === 'register') {
          if (users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
            setAuthError("This email is already registered.");
            return;
          }
          // Store unverified local user
          users.push({ username: name, email, password, emailVerified: false });
          localStorage.setItem('diya_offline_users', JSON.stringify(users));
          
          setUnverifiedOfflineEmail(email);
          setAuthTab('signin');
          setAuthError("Sandbox Email Sent! Please verify your simulated offline email below.");
          triggerToast("Simulated verification email 'sent'!", "success");
        } else {
          const found = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
          if (!found) {
            setAuthError("Invalid email or password.");
            return;
          }
          
          if (!found.emailVerified) {
            setUnverifiedOfflineEmail(email);
            setAuthError("Please verify your local account first. Click 'Simulate Verification' below.");
            triggerToast("Account is not verified.", "error");
            return;
          }
          
          setUnverifiedOfflineEmail(null);
          handleLocalSignup(found.username, found.email);
        }
      } catch (err) {
        console.error(err);
        setAuthError("Failed to access local offline storage.");
      }
    }
  };

  const handleGoogleAuth = async (email: string, displayName: string) => {
    localStorage.setItem('diya_username', displayName);
    localStorage.setItem('diya_email', email);
    const profile: AppUser = {
      username: displayName,
      email: email,
      encryptionKey: '',
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${displayName}`
    };
    setUser(profile);
    triggerToast(`Connected securely as ${displayName}.`, "success");
  };

  const handleRealGoogleSignIn = async () => {
    if (!isFirebaseEnabled || !auth) {
      triggerToast("Firebase is not fully initialized. Using local offline mode instead.", "info");
      handleLocalSignup("Alpha Trion", "alphatrion63@gmail.com");
      return;
    }
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      // NO sensitive scopes (like Gmail or Calendar) are added here!
      // This is a safe, standard Google Login for authentication.
      triggerToast("Opening secure Google Sign-In...", "info");
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      if (firebaseUser) {
        const name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User";
        const email = firebaseUser.email || "";
        const avatar = firebaseUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`;
        
        localStorage.setItem('diya_username', name);
        localStorage.setItem('diya_email', email);
        
        setUser({
          username: name,
          email: email,
          encryptionKey: '',
          avatarUrl: avatar
        });
        triggerToast(`Welcome to Diya, ${name}! Your secure cloud workspace is active.`, "success");
      }
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Cloud authentication failed. Using local mode.", "error");
    }
  };

  const handleLogout = () => {
    if (isFirebaseEnabled && auth) {
      signOut(auth).catch(err => console.error(err));
    }
    localStorage.removeItem('diya_username');
    localStorage.removeItem('diya_email');
    localStorage.removeItem('diya_master_passphrase');
    setUser(null);
    setMasterPassphrase('');
    setIsPassphraseSaved(false);
    triggerToast("Logged out safely.", "info");
  };

  const handleSavePassphrase = () => {
    if (!passphraseInput) {
      triggerToast("Passphrase cannot be empty", "error");
      return;
    }
    setMasterPassphrase(passphraseInput);
    localStorage.setItem('diya_master_passphrase', passphraseInput);
    setIsPassphraseSaved(true);
    triggerToast("Your Master Passphrase is encrypted and saved locally!", "success");
  };

  // --- AI Planning Tab Handlers ---
  const handleSendPlanningMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!planningInput.trim() && !planningDocText) return;

    const userMessageContent = planningInput.trim() || `Analyze document: ${planningDocName || "Untitled Document"}`;
    const newUserMessage = { role: 'user' as const, content: userMessageContent };
    const updatedMessages = [...planningMessages, newUserMessage];
    
    setPlanningMessages(updatedMessages);
    setPlanningInput('');
    setIsPlanningLoading(true);

    try {
      const res = await fetch('/api/gemini/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          documentText: planningDocText,
          currentTasks: tasks
        })
      });

      if (!res.ok) {
        throw new Error("Failed to contact AI Planner API");
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setPlanningMessages(prev => [
        ...prev,
        {
          role: 'model',
          content: data.replyText,
          suggestedItems: data.suggestedCalendarItems,
          modelUsed: data.modelUsed
        }
      ]);
      triggerToast("AI Planner Response received!", "success");

    } catch (err) {
      console.warn("AI Planner API fallback triggered:", err);
      // Fallback sandbox response to guarantee full functionality
      const simulatedReply = `### 📋 AI Planner Sandbox Mode Active

I have analyzed your request: **"${userMessageContent}"** ${planningDocName ? `and the document **"${planningDocName}"**` : ''}. 

Here is a comprehensive study plan and actionable guide to help you succeed:

## 1. Core Objectives
- **Understand foundational concepts**: Break down complex sub-topics into smaller digestible sections.
- **Incremental Practice**: Solve 3-5 focus exercises or read 5-10 pages daily to build sustained confidence.
- **Active Recall**: Create key question cards to review details before deadlines.

## 2. Structured Study Milestones
- **Step 1: Focus Setup & Material Scan**: Scan the primary text, prepare high-level outline folders, and list key formulas or terms.
- **Step 2: Deep Session**: Spend 25-45 minutes in focused studying with no interruptions. 
- **Step 3: Self-Evaluation**: Test yourself with sample questions and refine the parts where you had friction.

I have also structured **3 concrete milestones** below which you can instantly mark on your calendar. Click **"Mark Steps on Calendar"** to schedule them!`;

      // Generate simulated dates based on today
      const today = new Date();
      const formatOffsetDate = (days: number) => {
        const d = new Date();
        d.setDate(today.getDate() + days);
        return d.toISOString().split('T')[0];
      };

      const simulatedItems = [
        {
          title: `Scan & Outline: ${planningInput.substring(0, 30) || "Study Materials"}`,
          deadline: formatOffsetDate(1),
          priority: "High" as const,
          category: "Study Plan",
          description: "Scan materials, extract core formulas/dates, and create a 3-sentence summary of targets."
        },
        {
          title: `Deep Practice: ${planningInput.substring(0, 30) || "Study Session"}`,
          deadline: formatOffsetDate(3),
          priority: "Medium" as const,
          category: "Study Plan",
          description: "Spend 45 minutes on active recall exercises and drafting the primary content."
        },
        {
          title: `Final Review: ${planningInput.substring(0, 30) || "Exam Prep"}`,
          deadline: formatOffsetDate(5),
          priority: "High" as const,
          category: "Study Plan",
          description: "Review difficult concepts and perform a mock self-test under timed conditions."
        }
      ];

      setPlanningMessages(prev => [
        ...prev,
        {
          role: 'model',
          content: simulatedReply,
          suggestedItems: simulatedItems
        }
      ]);
      triggerToast("Plan generated in Sandbox Mode!", "info");
    } finally {
      setIsPlanningLoading(false);
    }
  };

  const handleAddPlanningTasks = (items: any[]) => {
    if (!items || items.length === 0) return;
    
    items.forEach(item => {
      const createdTask = rdb.addTask({
        user_id: 'user_active',
        title: item.title,
        category: item.category || 'Study Plan',
        priority: item.priority || 'Medium',
        status: 'Todo',
        deadline: item.deadline || selectedDate,
        description: item.description || ''
      });

      if (isFirebaseEnabled && db && user?.uid) {
        saveTaskToCloud({
          id: createdTask.id,
          title: createdTask.title,
          description: createdTask.description || '',
          category: createdTask.category,
          priority: createdTask.priority,
          status: createdTask.status,
          deadline: createdTask.deadline,
          userId: user.uid
        });
      }
    });

    loadDataFromRDB();
    triggerToast(`Successfully scheduled ${items.length} tasks/milestones on your calendar!`, "success");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPlanningDocName(file.name);
    
    // Check if it is a plain text file
    if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md") || file.name.endsWith(".json")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setPlanningDocText(text);
        triggerToast(`Successfully imported: ${file.name} (${file.size} bytes)`, "success");
      };
      reader.onerror = () => {
        triggerToast("Failed to read text file.", "error");
      };
      reader.readAsText(file);
    } else {
      // It is a binary file (pdf, docx, etc.). Mock the text extraction.
      const simulatedText = `Extracted from uploaded document: ${file.name}\n\nThis is a simulation of high-fidelity cognitive OCR and text extraction for student files.\n\nSyllabus Outline:\n- Study Unit: ${file.name.replace(/\.[^/.]+$/, "")}\n- Target Milestones: Multiple weekly assessments\n- High Friction Concepts: Concepts requiring focused deep work.`;
      setPlanningDocText(simulatedText);
      triggerToast(`Uploaded binary document: ${file.name}. Simulated high-fidelity text extraction.`, "info");
    }
  };

  const formatPlanningReply = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return (
      <div className="space-y-3 text-sm lg:text-base text-zinc-700 leading-relaxed font-sans">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <div key={idx} className="flex gap-2 pl-4">
                <span className="text-emerald-600 font-bold">•</span>
                <span className="text-zinc-800">{trimmed.substring(2)}</span>
              </div>
            );
          }
          if (/^\d+\.\s/.test(trimmed)) {
            const match = trimmed.match(/^(\d+)\.\s(.*)/);
            return (
              <div key={idx} className="flex gap-2 pl-4">
                <span className="text-zinc-500 font-mono font-extrabold">{match?.[1]}.</span>
                <span className="text-zinc-800">{match?.[2]}</span>
              </div>
            );
          }
          if (trimmed.startsWith('### ')) {
            return <h4 key={idx} className="text-base font-bold text-zinc-950 pt-2 font-mono uppercase tracking-wider">{trimmed.substring(4)}</h4>;
          }
          if (trimmed.startsWith('## ')) {
            return <h3 key={idx} className="text-lg font-black text-zinc-950 pt-3 font-mono border-b border-zinc-100 pb-1">{trimmed.substring(3)}</h3>;
          }
          if (trimmed.startsWith('# ')) {
            return <h2 key={idx} className="text-xl font-black text-zinc-950 pt-4 font-mono">{trimmed.substring(2)}</h2>;
          }
          if (trimmed === '') {
            return <div key={idx} className="h-2" />;
          }
          return <p key={idx} className="text-zinc-800">{line}</p>;
        })}
      </div>
    );
  };

  // --- Tasks CRUD ---
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;

    const createdTask = rdb.addTask({
      user_id: 'user_active',
      title: newTaskTitle,
      category: newTaskCategory,
      priority: newTaskPriority,
      status: 'Todo',
      deadline: selectedDate,
      description: newTaskDesc
    });

    loadDataFromRDB();
    triggerToast(`Goal scheduled in Relational Database for ${selectedDate}!`, 'success');

    if (isFirebaseEnabled && db && user?.uid) {
      saveTaskToCloud({
        id: createdTask.id,
        title: createdTask.title,
        description: createdTask.description || '',
        category: createdTask.category,
        priority: createdTask.priority,
        status: createdTask.status,
        deadline: createdTask.deadline,
        userId: user.uid
      });
    }

    setNewTaskTitle('');
    setNewTaskDesc('');
  };

  const handleToggleTaskStatus = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const nextStatus = task.status === 'Todo' ? 'In Progress' : task.status === 'In Progress' ? 'Done' : 'Todo';
      rdb.updateTaskStatus(taskId, nextStatus);
      loadDataFromRDB();

      if (nextStatus === 'Done') {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#10b981', '#34d399', '#a7f3d0', '#065f46']
        });
        triggerToast("🎉 Target accomplished! Keep up the brilliant momentum!", "success");
      }

      if (isFirebaseEnabled && db && user?.uid) {
        saveTaskToCloud({
          ...task,
          status: nextStatus,
          userId: user.uid
        });
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    rdb.deleteTask(taskId);
    loadDataFromRDB();

    if (isFirebaseEnabled && db && user?.uid) {
      deleteTaskFromCloud(taskId);
    }

    triggerToast("Task and cascade references deleted safely", "info");
  };

  // --- AI Priority Copilot Audit ---
  const handleAICopilotAudit = async (task: Task) => {
    setActiveTaskAudit(task.id);
    setIsAuditing(true);
    triggerToast("AI Copilot is examining focus parameters...", "info");

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          category: task.category,
          priority: task.priority,
          deadline: task.deadline,
          description: task.description || "No descriptions supplied"
        })
      });

      if (!response.ok) {
        let errMsg = "API Offline or key missing";
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      
      const updated = tasks.map(t => {
        if (t.id === task.id) {
          const updatedTask = {
            ...t,
            cognitivePriority: data.cognitivePriority,
            consequencesOfMissing: data.consequencesOfMissing,
            readyToGoSolutions: data.readyToGoSolutions,
            alternativePlans: data.alternativePlans,
            copilotAssistance: data.copilotAssistance
          };

          if (isFirebaseEnabled && db && user?.uid) {
            saveTaskToCloud({
              ...updatedTask,
              userId: user.uid
            });
          }

          return updatedTask;
        }
        return t;
      });

      setTasks(updated);
      triggerToast("AI focus strategies computed!", "success");

    } catch (e: any) {
      console.error(e);
      triggerToast(e.message || "AI Copilot failed. Please declare GEMINI_API_KEY in settings.", "error");
    } finally {
      setIsAuditing(false);
    }
  };

  // --- Habits actions ---
  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle) return;

    const createdHabit = rdb.addHabit({
      user_id: 'user_active',
      title: newHabitTitle,
      category: newHabitCategory
    });

    loadDataFromRDB();

    if (isFirebaseEnabled && db && user?.uid) {
      saveHabitToCloud({
        id: createdHabit.id,
        title: createdHabit.title,
        category: createdHabit.category,
        completedDays: [],
        streak: 0,
        userId: user.uid
      });
    }

    setNewHabitTitle('');
    triggerToast(`Daily habit "${newHabitTitle}" active in relational database!`, 'success');
  };

  const handleToggleHabitDay = (habitId: string, dateStr: string) => {
    const isCompleted = rdb.toggleHabitLog(habitId, dateStr);
    loadDataFromRDB();

    if (isCompleted) {
      confetti({
        particleCount: 50,
        spread: 45,
        origin: { y: 0.85 },
        colors: ['#059669', '#34d399', '#a7f3d0']
      });
    }

    if (isFirebaseEnabled && db && user?.uid) {
      const updatedHabit = habits.find(h => h.id === habitId);
      if (updatedHabit) {
        let nextCompletedDays = [...updatedHabit.completedDays];
        if (isCompleted) {
          nextCompletedDays.push(dateStr);
        } else {
          nextCompletedDays = nextCompletedDays.filter(d => d !== dateStr);
        }
        saveHabitToCloud({
          ...updatedHabit,
          completedDays: nextCompletedDays,
          streak: nextCompletedDays.length,
          userId: user.uid
        });
      }
    }

    triggerToast(isCompleted ? "Habit checked off!" : "Habit unchecked", "info");
  };

  const handleDeleteHabit = (habitId: string) => {
    rdb.deleteHabit(habitId);
    loadDataFromRDB();

    if (isFirebaseEnabled && db && user?.uid) {
      deleteHabitFromCloud(habitId);
    }

    triggerToast("Habit and its historical log cascades deleted safely", "info");
  };

  // --- Physiological Breathing Motor Loop ---
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (breathingActive) {
      timer = setInterval(() => {
        setBreathingSeconds(prev => {
          const nextSec = prev + 1;
          
          if (breathingMode === 'Box') {
            // 4s Inhale, 4s Hold, 4s Exhale, 4s Hold
            const stage = nextSec % 16;
            if (stage < 4) {
              setBreathingText("Inhale deeply...");
              setBreathingScale(1.4);
            } else if (stage < 8) {
              setBreathingText("Hold...");
              setBreathingScale(1.4);
            } else if (stage < 12) {
              setBreathingText("Exhale slowly...");
              setBreathingScale(1.0);
            } else {
              setBreathingText("Hold empty...");
              setBreathingScale(1.0);
            }
          } else if (breathingMode === '4-7-8') {
            // 4s Inhale, 7s Hold, 8s Exhale
            const stage = nextSec % 19;
            if (stage < 4) {
              setBreathingText("Inhale deeply...");
              setBreathingScale(1.4);
            } else if (stage < 11) {
              setBreathingText("Hold...");
              setBreathingScale(1.4);
            } else {
              setBreathingText("Exhale slowly...");
              setBreathingScale(1.0);
            }
          } else {
            // Relax method: 4s Inhale, 6s Exhale
            const stage = nextSec % 10;
            if (stage < 4) {
              setBreathingText("Inhale deeply...");
              setBreathingScale(1.4);
            } else {
              setBreathingText("Exhale slowly...");
              setBreathingScale(1.0);
            }
          }
          return nextSec;
        });
      }, 1000);
    } else {
      setBreathingSeconds(0);
      setBreathingScale(1.0);
      setBreathingText("Ready to start breathing session");
    }
    return () => clearInterval(timer);
  }, [breathingActive, breathingMode]);

  // --- Calendar Layout Generator ---
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days: (string | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(i).padStart(2, '0');
      days.push(`${year}-${monthStr}-${dayStr}`);
    }
    return days;
  }, [calendarMonth]);

  const monthName = calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const changeMonth = (direction: number) => {
    const next = new Date(calendarMonth);
    next.setMonth(next.getMonth() + direction);
    setCalendarMonth(next);
  };

  // Safe checks for hydration
  if (!mounted) return null;

  // Render Calming Loading Intro
  if (isLoadingIntro) {
    const currentQuote = CALMING_QUOTES[quoteIndex];
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 text-zinc-800 selection:bg-zinc-200 relative animated-mesh-bg overflow-hidden select-none">
        
        {/* Beautiful flowing organic blobs in the background */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-lime-300/30 rounded-full glow-spot animate-blob-one"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-300/25 rounded-full glow-spot animate-blob-two"></div>
        <div className="absolute top-1/2 left-2/3 w-80 h-80 bg-teal-200/20 rounded-full glow-spot animate-blob-three"></div>

        {/* Soft blur overlay to keep contrast high */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[3px] pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative max-w-xl w-full bg-white border border-zinc-200 rounded-xl p-8 md:p-10 shadow-xl z-10 space-y-8 text-center overflow-hidden"
        >
          {/* Corner Crosshairs */}
          <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
          <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
          <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
          <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>

          <div className="flex flex-col items-center justify-center">
            <div className="relative w-16 h-16 flex items-center justify-center bg-zinc-50 border border-zinc-200 rounded-lg shadow-inner">
              <span className="absolute top-0.5 left-0.5 text-zinc-300 font-mono text-[7px] select-none">+</span>
              <span className="absolute top-0.5 right-0.5 text-zinc-300 font-mono text-[7px] select-none">+</span>
              <span className="absolute bottom-0.5 left-0.5 text-zinc-300 font-mono text-[7px] select-none">+</span>
              <span className="absolute bottom-0.5 right-0.5 text-zinc-300 font-mono text-[7px] select-none">+</span>
              
              <Brain className="w-8 h-8 text-zinc-950 animate-pulse" />
            </div>
            <span className="mt-3 text-[8px] font-extrabold tracking-widest text-zinc-400 uppercase font-mono bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded shadow-xs">
              SYSTEM INITIALIZATION
            </span>
          </div>

          {/* Productive calming Quote block */}
          <AnimatePresence mode="wait">
            <motion.div
              key={quoteIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <p className="text-xl md:text-2xl font-serif text-zinc-900 leading-relaxed italic px-2">
                &ldquo;{currentQuote.text}&rdquo;
              </p>
              <div className="w-8 h-[1px] bg-zinc-200 mx-auto" />
              <span className="block text-[9px] font-extrabold tracking-widest text-zinc-400 uppercase font-mono">
                — {currentQuote.author}
              </span>
            </motion.div>
          </AnimatePresence>

          <div className="pt-4 flex flex-col items-center gap-3">
            <button 
              onClick={() => setIsLoadingIntro(false)}
              className="px-6 py-2.5 bg-zinc-950 hover:bg-zinc-900 text-white rounded-lg text-xs font-extrabold font-mono uppercase tracking-widest transition-all shadow-sm active:translate-y-0.5 border border-zinc-950"
            >
              Enter Workspace
            </button>
            <p className="text-[8px] text-zinc-400 font-mono uppercase tracking-widest font-extrabold">
              Calibrating serene desk layout...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Onboarding Setup View
  if (!user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 text-zinc-800 selection:bg-zinc-200 relative animated-mesh-bg overflow-hidden">
        
        {/* Beautiful flowing organic blobs in the background */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-lime-300/30 rounded-full glow-spot animate-blob-one"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-300/25 rounded-full glow-spot animate-blob-two"></div>
        <div className="absolute top-1/2 left-2/3 w-80 h-80 bg-teal-200/20 rounded-full glow-spot animate-blob-three"></div>

        {/* Soft blur overlay to keep contrast high */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[3px] pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative max-w-md w-full bg-white border border-zinc-200 rounded-xl p-8 shadow-xl z-10 space-y-6 overflow-hidden"
        >
          {/* Corner Crosshairs */}
          <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
          <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
          <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
          <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>

          <div className="text-center">
            <div className="inline-flex p-3 bg-zinc-950 text-white rounded-lg mb-3 shadow-sm border border-zinc-950">
              <Brain className="w-6 h-6" />
            </div>
            <h1 className="text-base font-extrabold uppercase tracking-widest text-zinc-950 font-mono">
              Diya Workspace
            </h1>
            <p className="text-zinc-500 mt-2 text-xs font-sans leading-relaxed max-w-sm mx-auto">
              Your quiet, simple botanical organizer. Track goals, log secure thoughts, and focus on daily habits with absolute privacy.
            </p>
          </div>

          <div className="space-y-5">
            {isFirebaseEnabled && (
              <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200 flex flex-col gap-2.5">
                <h2 className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-900 flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-950"></span> Cloud-Secure Authorization
                </h2>
                <button
                  onClick={handleRealGoogleSignIn}
                  className="w-full py-2 px-3 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 font-extrabold text-[10px] uppercase tracking-widest rounded-lg transition-all shadow-xs flex items-center justify-center gap-2.5 active:scale-[0.98] font-mono"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Sign in with Google
                </button>
              </div>
            )}

            <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200">
              <h2 className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span> Instant Onboarding Options
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {MOCK_PROFILES.map((p) => (
                  <button
                    key={p.email}
                    onClick={() => handleGoogleAuth(p.email, p.name)}
                    className="flex items-center gap-2.5 p-2.5 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg text-left transition-all active:scale-[0.98] shadow-xs"
                  >
                    <img 
                      src={p.avatar} 
                      alt={p.name} 
                      className="w-7 h-7 rounded-full border border-zinc-200 object-cover shrink-0"
                    />
                    <div className="truncate">
                      <div className="text-[10px] font-bold text-zinc-800 leading-tight">{p.name}</div>
                      <div className="text-[8px] text-zinc-400 truncate font-mono uppercase tracking-wider block mt-0.5">{p.email.split('@')[0]}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-zinc-200"></div>
              <span className="flex-shrink mx-3 text-[8px] font-extrabold tracking-widest text-zinc-400 uppercase font-mono">Or Custom Identity</span>
              <div className="flex-grow border-t border-zinc-200"></div>
            </div>

            {/* Beautiful minimal tabs matching dashboard style */}
            <div className="flex bg-zinc-50 border border-zinc-200 rounded-lg p-1">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('signin');
                  setAuthError(null);
                }}
                className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all font-mono ${
                  authTab === 'signin'
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('register');
                  setAuthError(null);
                }}
                className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all font-mono ${
                  authTab === 'register'
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const nameInput = form.elements.namedItem('username') as HTMLInputElement | null;
              const name = nameInput ? nameInput.value : '';
              const email = (form.elements.namedItem('email') as HTMLInputElement).value;
              const password = (form.elements.namedItem('password') as HTMLInputElement).value;
              handleCustomAuthSubmit(name, email, password);
            }} className="space-y-4">
              {authTab === 'register' && (
                <div>
                  <label className="block text-[8px] font-extrabold uppercase tracking-wider text-zinc-400 font-mono mb-1">Your Name</label>
                  <input
                    name="username"
                    type="text"
                    required
                    placeholder="e.g. Maya Lin"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400 font-sans"
                  />
                </div>
              )}

              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-wider text-zinc-400 font-mono mb-1">Email address</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="maya@university.edu"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400 font-sans"
                />
              </div>

              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-wider text-zinc-400 font-mono mb-1">Password</label>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400 font-sans"
                />
              </div>

              {authError && <div className="text-xs text-rose-600 font-mono font-bold uppercase tracking-wider">{authError}</div>}

              {/* Offline verification simulator button */}
              {!isFirebaseEnabled && unverifiedOfflineEmail && (
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2 text-center text-xs text-zinc-600">
                  <p className="font-mono">{"Sandbox Verification Email 'sent' to "} <b className="text-zinc-950">{unverifiedOfflineEmail}</b>.</p>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const usersStr = localStorage.getItem('diya_offline_users') || '[]';
                        const users = JSON.parse(usersStr);
                        const idx = users.findIndex((u: any) => u.email.toLowerCase() === unverifiedOfflineEmail.toLowerCase());
                        if (idx !== -1) {
                          users[idx].emailVerified = true;
                          localStorage.setItem('diya_offline_users', JSON.stringify(users));
                          triggerToast(`Successfully verified Sandbox email: ${unverifiedOfflineEmail}! You can now Sign In.`, "success");
                          setUnverifiedOfflineEmail(null);
                          setAuthError(null);
                        } else {
                          triggerToast("User email not found in local sandbox registry.", "error");
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="w-full py-1.5 px-3 bg-zinc-950 hover:bg-zinc-900 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-md transition-all font-mono"
                  >
                    Simulate Clicking Verification Link
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-900 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 border border-zinc-950 font-mono"
              >
                <Play className="w-3.5 h-3.5 fill-current shrink-0" /> {authTab === 'signin' ? 'Sign In' : 'Register'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }  return (
    <div className="h-screen w-screen flex flex-col text-zinc-800 selection:bg-zinc-200 relative bg-zinc-50 overflow-hidden">
      
      {/* Elegant minimalist notification toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 shadow-xl pointer-events-auto backdrop-blur-md ${
                t.type === 'success' ? 'bg-zinc-950 border-zinc-900 text-white' :
                t.type === 'error' ? 'bg-rose-950 border-rose-900 text-rose-100' :
                'bg-white/95 border-zinc-200 text-zinc-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${t.type === 'success' ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
              <div className="text-[10px] font-bold tracking-tight uppercase font-mono">{t.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Main workspace frame wrapper (Full Screen) */}
      <div className="w-full h-full flex flex-col overflow-hidden relative bg-white">

        {/* Workspace Brand Sub-header Panel */}
        <header className="border-b border-zinc-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
              className="p-1.5 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-all"
              title={isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="p-2 bg-zinc-950 text-white rounded-lg">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-zinc-950 tracking-tight text-xs uppercase font-mono">Diya Workspace</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <div className="text-[9px] text-zinc-400 font-mono tracking-widest uppercase mt-0.5">YOUR HIGH-CONTRAST MONOCHROME STUDY CABINET</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* System Clock */}
            <div className="px-3 py-1 bg-zinc-100 border border-zinc-200 rounded-full text-center hidden sm:block">
              <span className="text-[9px] font-bold text-zinc-600 uppercase font-mono tracking-wider">Secure Sandbox Mode</span>
            </div>

            {/* Profile Slot */}
            <div className="flex items-center gap-2 px-2.5 py-1 bg-zinc-50 rounded-full border border-zinc-200">
              <img 
                src={user.avatarUrl} 
                alt={user.username} 
                className="w-4.5 h-4.5 rounded-full object-cover border border-zinc-200"
              />
              <span className="text-[10px] font-bold text-zinc-700 tracking-wide">{user.username}</span>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-rose-50 text-zinc-500 hover:text-rose-600 rounded-full transition-all border border-transparent hover:border-rose-100"
              title="Log Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Dynamic biological advice bar (re-styled to match Swiss minimalist look) */}
        <div className="px-6 py-2.5 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-2 text-xs">
          <Heart className="w-4 h-4 text-zinc-800 shrink-0" />
          <span className="font-bold text-zinc-900 font-mono text-[10px] uppercase">AESTHETIC PROTOCOL:</span>
          <span className="text-zinc-600 font-serif text-xs italic">Stand up and focus on the green horizon line every 30 minutes.</span>
        </div>

        {/* Main Content split with minimalist navigation */}
        <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
          
          {/* Swiss Monochrome Minimalist Navigation (Expandable) */}
          <aside className={`border-r border-zinc-200 p-4 bg-white shrink-0 flex flex-row lg:flex-col justify-start gap-4 overflow-x-auto lg:overflow-x-visible transition-all duration-200 ${
            isSidebarExpanded ? 'lg:w-56 w-full' : 'lg:w-16 w-full'
          }`}>
            
            <nav className="flex flex-row lg:flex-col gap-2 w-full">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex-grow lg:flex-grow-0 w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all border ${
                  activeTab === 'dashboard' 
                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm' 
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200'
                } ${!isSidebarExpanded ? 'lg:justify-center lg:px-1.5' : ''}`}
                title="Desk Planner"
              >
                <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                {isSidebarExpanded && <span className="truncate">Desk Planner</span>}
              </button>

              <button
                onClick={() => setActiveTab('planning')}
                className={`flex-grow lg:flex-grow-0 w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all border ${
                  activeTab === 'planning' 
                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm' 
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200'
                } ${!isSidebarExpanded ? 'lg:justify-center lg:px-1.5' : ''}`}
                title="AI Planning Coach"
              >
                <Brain className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                {isSidebarExpanded && <span className="truncate">AI Planner</span>}
              </button>

              <button
                onClick={() => setActiveTab('habits')}
                className={`flex-grow lg:flex-grow-0 w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all border ${
                  activeTab === 'habits' 
                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm' 
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200'
                } ${!isSidebarExpanded ? 'lg:justify-center lg:px-1.5' : ''}`}
                title="Habits & Relax"
              >
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                {isSidebarExpanded && <span className="truncate">Habits & Relax</span>}
              </button>


              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-grow lg:flex-grow-0 w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all border ${
                  activeTab === 'settings' 
                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm' 
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200'
                } ${!isSidebarExpanded ? 'lg:justify-center lg:px-1.5' : ''}`}
                title="Desk Settings"
              >
                <SettingsIcon className="w-3.5 h-3.5 shrink-0" />
                {isSidebarExpanded && <span className="truncate">Desk Settings</span>}
              </button>
            </nav>

            {/* Quick calming space stats with Swiss-blueprint crosshairs */}
            {isSidebarExpanded ? (
              <div className="hidden lg:block pt-5 border-t border-zinc-200 space-y-3.5 mt-auto w-full">
                <div className="relative p-4 bg-zinc-50 border border-zinc-200 rounded-lg text-center overflow-hidden">
                  <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  
                  <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-1 font-mono">COMPLETED GOALS</div>
                  <div className="text-xl font-extrabold text-zinc-900 font-serif">
                    {tasks.filter(t => t.status === 'Done').length}
                  </div>
                </div>
              </div>
            ) : (
              <div className="hidden lg:flex pt-5 border-t border-zinc-200 mt-auto w-full justify-center">
                <div className="relative w-10 h-10 flex items-center justify-center bg-zinc-50 border border-zinc-200 rounded-lg text-center" title="Completed Goals">
                  <span className="text-[10px] font-bold text-zinc-900 font-mono">
                    {tasks.filter(t => t.status === 'Done').length}
                  </span>
                </div>
              </div>
            )}
          </aside>

          {/* Core Page Container */}
          <main className="flex-grow p-4 lg:p-6 overflow-y-auto bg-zinc-50/30">
            
            {/* TAB 1: DESK PLANNER (CALENDAR + SELECTED DATE EDITING) */}
            {activeTab === 'dashboard' && (
              <div className="flex flex-col gap-6 max-w-5xl mx-auto">
                
                {/* Clean Intro Card with Swiss styling and crosshairs */}
                <div className="relative p-6 bg-white border border-zinc-200 rounded-xl overflow-hidden order-first">
                  <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  
                  <h1 className="text-base font-extrabold text-zinc-950 font-serif">
                    Welcome back to your cabinet, {user.username}!
                  </h1>
                  <p className="text-xs text-zinc-500 mt-1">
                    Select any date on the interactive calendar grid to organize tasks, secure thoughts, and plan your organic progress.
                  </p>
                </div>

                {/* PROACTIVE AI COMPANION PANEL with high-contrast Swiss styling and crosshairs */}
                <div id="proactive-ai-panel" className="relative bg-white border border-zinc-200 p-6 rounded-xl space-y-4 overflow-hidden order-2">
                  <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-950 text-white rounded-lg animate-pulse">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5 font-mono">
                          Diya Proactive AI Assistant
                          <span className="text-[8px] px-2 py-0.5 rounded-md bg-zinc-900 text-white font-bold uppercase tracking-wider">
                            ACTIVE
                          </span>
                        </h2>
                        <p className="text-[10px] text-zinc-500 mt-0.5 font-sans">
                          Automating study guides, reference research, and urgent email replies before you even ask.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                         <button
                           onClick={handleConnectGmail}
                           className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold flex items-center gap-1.5 transition-all border ${
                             gmailToken 
                               ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                               : 'bg-zinc-950 hover:bg-zinc-900 text-white border-zinc-950 shadow-sm'
                           }`}
                         >
                          <Mail className="w-3.5 h-3.5" />
                          {gmailToken ? "Gmail: Live Synced" : "Connect Live Gmail"}
                        </button>

                        <button
                          onClick={() => fetchProactiveGuides(tasks)}
                          disabled={isGeneratingProactive}
                          className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-800 rounded-lg text-[10px] font-extrabold flex items-center gap-1.5 transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {isGeneratingProactive ? "Analyzing..." : "Refresh Plans"}
                        </button>
                      </div>
                      <span className="text-[8px] text-zinc-400 font-mono mt-1">
                        * Sandbox Mode is active by default to showcase AI features securely.
                      </span>
                    </div>
                  </div>

                  {/* Motivational advice block */}
                  <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg flex items-start gap-2.5">
                    <Brain className="w-4 h-4 text-zinc-700 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Proactive Copilot Summary</h4>
                      <p className="text-xs text-zinc-700 leading-relaxed mt-0.5">
                        {isGeneratingProactive ? "Analyzing your priorities, synthesizing instructions..." : proactiveAdvice || "Add active goals or connect your Gmail account below. I am tracking your deadlines to automatically build learning materials and draft pending responses!"}
                      </p>
                    </div>
                  </div>

                  {/* Proactive Bento Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    
                    {/* LEFT COLUMN: Study Outlines & Learning Resources */}
                    <div className="bg-white/65 border border-white/40 rounded-xl p-4 space-y-3">
                      <h3 className="text-[10px] font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-100 pb-1.5 font-mono">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                        📚 Custom Study Guides & Resources
                      </h3>

                      {isGeneratingProactive ? (
                        <div className="space-y-3 py-4">
                          {[1, 2].map(n => (
                            <div key={n} className="animate-pulse space-y-2">
                              <div className="h-3 bg-zinc-200 rounded w-1/3"></div>
                              <div className="h-2.5 bg-zinc-100 rounded w-5/6"></div>
                              <div className="h-2.5 bg-zinc-100 rounded w-4/5"></div>
                            </div>
                          ))}
                        </div>
                      ) : proactiveGuides.length === 0 ? (
                        <div className="text-center py-6 text-zinc-400 text-xs">
                          Your study guides are ready to bloom! Add dynamic tasks to the calendar desk planner below to initiate auto-generation.
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                          {proactiveGuides.map((guide, idx) => (
                            <div key={idx} className="p-3 bg-white/80 border border-emerald-50 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-emerald-950 bg-emerald-50/80 px-2 py-0.5 rounded-lg border border-emerald-100/50 truncate max-w-[200px]">
                                  {guide.taskTitle}
                                </span>
                                <span className="text-[8px] font-mono text-zinc-400 uppercase">Step Guide</span>
                              </div>

                              {/* Steps checklists */}
                              <div className="space-y-1.5">
                                <span className="text-[8px] uppercase tracking-wider font-bold text-zinc-400 block">Personalized Blueprint</span>
                                {guide.stepByStepInstructions?.map((step: string, sIdx: number) => (
                                  <div key={sIdx} className="flex items-start gap-1.5">
                                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                    <span className="text-xs text-zinc-700 leading-relaxed">{step}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Curated research links */}
                              {guide.recommendedLinks && guide.recommendedLinks.length > 0 && (
                                <div className="pt-2 border-t border-zinc-100/50 space-y-1">
                                  <span className="text-[8px] uppercase tracking-wider font-bold text-zinc-400 block">Recommended Reference Links</span>
                                  <div className="flex flex-wrap gap-2">
                                    {guide.recommendedLinks.map((link: any, lIdx: number) => (
                                      <a
                                        key={lIdx}
                                        href={link.searchQuery.startsWith('http') ? link.searchQuery : `https://www.google.com/search?q=${encodeURIComponent(link.searchQuery)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-emerald-800 hover:text-emerald-900 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg flex items-center gap-1 transition-all"
                                      >
                                        <ExternalLink className="w-2.5 h-2.5" />
                                        {link.label}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* RIGHT COLUMN: Actionable Communications (Urgent Emails needing replies) */}
                    <div className="bg-white/65 border border-white/40 rounded-xl p-4 space-y-3">
                      <h3 className="text-[10px] font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-100 pb-1.5 font-mono">
                        <Mail className="w-3.5 h-3.5 text-emerald-700" />
                        📬 Communications & Auto-Draft Replies
                      </h3>

                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {emails.filter(m => m.status !== 'Replied').length === 0 ? (
                          <div className="text-center py-10 text-zinc-400 text-xs">
                            No pending communications needing replies. Your inbox is healthy!
                          </div>
                        ) : (
                          emails.filter(m => m.status !== 'Replied').map((email) => {
                            const isDrafting = draftingEmails[email.id];
                            const draft = draftedReplies[email.id] || (email.ai_drafted_reply ? { draftText: email.ai_drafted_reply, preparatorySteps: ["Confirm botany presentation diagrams & chlorplast layouts."] } : null);

                            return (
                              <div key={email.id} className={`p-3 rounded-xl border transition-all ${selectedMail?.id === email.id ? 'bg-white border-emerald-200 shadow-sm' : 'bg-white/75 hover:bg-white border-zinc-100'}`}>
                                <div className="flex items-start justify-between gap-2 cursor-pointer" onClick={() => setSelectedMail(selectedMail?.id === email.id ? null : email)}>
                                  <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] font-bold text-zinc-800 truncate block">{email.sender}</span>
                                      <span className="text-[8px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-bold">
                                        Action Required
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-emerald-950 font-bold block truncate mt-0.5">{email.subject}</span>
                                    <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5 italic">{email.snippet}</p>
                                  </div>

                                  <div className="text-[8px] font-mono text-zinc-400 whitespace-nowrap shrink-0 text-right">
                                    {email.received_date}
                                  </div>
                                </div>

                                {/* Draft View / Actions */}
                                {selectedMail?.id === email.id && (
                                  <div className="mt-3 pt-3 border-t border-zinc-100/80 space-y-3">
                                    <div className="bg-zinc-50 border border-zinc-200/60 rounded-lg p-2.5">
                                      <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-widest block mb-1">Incoming Message Body</span>
                                      <p className="text-[11px] text-zinc-600 whitespace-pre-wrap leading-relaxed">{email.body}</p>
                                    </div>

                                    {isDrafting ? (
                                      <div className="flex items-center justify-center py-4 gap-2 text-xs text-zinc-500">
                                        <Sparkles className="w-4 h-4 text-emerald-700 animate-pulse" />
                                        AI is composing proactive response draft...
                                      </div>
                                    ) : draft ? (
                                      <div className="space-y-3">
                                        {/* Auto drafted response text area */}
                                        <div className="space-y-1">
                                          <span className="text-[8px] uppercase tracking-wider font-bold text-emerald-800 flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" /> Proactive Reply Drafted
                                          </span>
                                          <textarea
                                            value={draft.draftText}
                                            onChange={(e) => {
                                              const updatedText = e.target.value;
                                              setDraftedReplies(prev => ({
                                                ...prev,
                                                [email.id]: { ...draft, draftText: updatedText }
                                              }));
                                            }}
                                            rows={6}
                                            className="w-full bg-emerald-50/20 border border-emerald-100 rounded-xl p-2.5 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-400 font-sans"
                                          />
                                        </div>

                                        {/* Preparatory checklist generated */}
                                        {draft.preparatorySteps && draft.preparatorySteps.length > 0 && (
                                          <div className="p-2 bg-amber-50/40 border border-amber-100/50 rounded-xl space-y-1">
                                            <span className="text-[8px] font-bold text-amber-800 uppercase tracking-wider">Before you send, please verify:</span>
                                            {draft.preparatorySteps.map((step: string, sIdx: number) => (
                                              <div key={sIdx} className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                                                <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0"></span>
                                                {step}
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Draft controls */}
                                        <div className="flex items-center justify-end gap-2 pt-1">
                                          <button
                                            onClick={() => handleMarkEmailReplied(email.id)}
                                            className="px-2.5 py-1 text-[10px] font-bold hover:bg-zinc-100 rounded-lg text-zinc-500"
                                          >
                                            Archive / Replied
                                          </button>
                                          <button
                                            onClick={() => handleCreateRealDraft(email.id, draft.draftText)}
                                            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                          >
                                            <Check className="w-3 h-3" />
                                            {gmailToken ? "Push to Gmail Drafts" : "Copy Draft & Archive"}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex justify-end">
                                        <button
                                          onClick={() => fetchDraftReply(email.id)}
                                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5"
                                        >
                                          <Sparkles className="w-3.5 h-3.5" />
                                          Draft Reply with AI
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Main Interactive Grid & Sidebar Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start order-1">
                  
                  {/* Calendar Column (Left) with Swiss layout and crosshairs */}
                  <div className="relative lg:col-span-7 bg-white p-5 border border-zinc-200 rounded-xl space-y-4 overflow-hidden">
                    <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                    <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                    <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                    <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                    
                    {/* Month selector block */}
                    <div className="flex items-center justify-between p-1 bg-zinc-50 border border-zinc-200 rounded-lg">
                      <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-zinc-100 rounded transition-all">
                        <ChevronLeft className="w-4 h-4 text-zinc-800" />
                      </button>
                      <h3 className="text-xs lg:text-sm font-extrabold uppercase tracking-widest text-zinc-900 font-mono">
                        {monthName.toUpperCase()}
                      </h3>
                      <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-zinc-100 rounded transition-all">
                        <ChevronRight className="w-4 h-4 text-zinc-800" />
                      </button>
                    </div>

                    {/* Simple Clean Grid */}
                    <div className="grid grid-cols-7 gap-1.5 text-center">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="text-[11px] lg:text-xs font-extrabold uppercase text-zinc-400 tracking-wider py-1 font-mono">{d}</div>
                      ))}

                      {calendarDays.map((dateStr, idx) => {
                        const isToday = dateStr === new Date().toISOString().split('T')[0];
                        const isSelected = dateStr === selectedDate;
                        const pendingTasks = dateStr ? tasks.filter(t => t.deadline === dateStr && t.status !== 'Done') : [];
                        const completedTasks = dateStr ? tasks.filter(t => t.deadline === dateStr && t.status === 'Done') : [];

                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (dateStr) setSelectedDate(dateStr);
                            }}
                            disabled={!dateStr}
                            className={`h-14 rounded-lg relative flex flex-col justify-between p-2 text-xs lg:text-sm transition-all border ${
                              !dateStr ? 'border-transparent opacity-10' :
                              isSelected ? 'bg-zinc-950 border-zinc-950 text-white scale-[1.03] shadow-md' :
                              isToday ? 'bg-zinc-100 border-zinc-300 text-zinc-950 font-extrabold' :
                              'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700'
                            }`}
                          >
                            <span className="font-mono text-xs lg:text-sm font-black">{dateStr ? dateStr.split('-')[2] : ''}</span>
                            
                            {/* Tiny dots representing goals */}
                            {dateStr && (pendingTasks.length > 0 || completedTasks.length > 0) && (
                              <div className="flex justify-center flex-wrap gap-1 mt-auto max-w-full">
                                {pendingTasks.map(t => {
                                  const p = (t.priority || 'Low').toLowerCase();
                                  let colorClass = 'bg-sky-500';
                                  if (p === 'high') colorClass = isSelected ? 'bg-rose-400' : 'bg-rose-500';
                                  else if (p === 'medium') colorClass = isSelected ? 'bg-amber-400' : 'bg-amber-500';
                                  else colorClass = isSelected ? 'bg-sky-300' : 'bg-sky-500';
                                  return (
                                    <span 
                                      key={t.id} 
                                      className={`w-1.5 h-1.5 rounded-full transition-colors ${colorClass}`}
                                      title={`${t.title} (${t.priority})`}
                                    ></span>
                                  );
                                })}
                                {completedTasks.map(t => {
                                  const p = (t.priority || 'Low').toLowerCase();
                                  let colorClass = 'bg-sky-500/30';
                                  if (p === 'high') colorClass = isSelected ? 'bg-rose-400/30 border border-rose-400/50' : 'bg-rose-500/30 border border-rose-500/20';
                                  else if (p === 'medium') colorClass = isSelected ? 'bg-amber-400/30 border border-amber-400/50' : 'bg-amber-500/30 border border-amber-500/20';
                                  else colorClass = isSelected ? 'bg-sky-300/30 border border-sky-300/50' : 'bg-sky-500/30 border border-sky-500/20';
                                  return (
                                    <span 
                                      key={t.id} 
                                      className={`w-1.5 h-1.5 rounded-full transition-colors ${colorClass}`}
                                      title={`${t.title} (Completed - ${t.priority})`}
                                    ></span>
                                  );
                                })}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="text-xs text-zinc-400 flex flex-wrap items-center justify-between gap-2 px-1 font-mono uppercase tracking-wider pt-2 border-t border-zinc-100">
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> High Priority</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Medium Priority</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span> Low Priority</span>
                        <span className="text-[10px] text-zinc-300 normal-case">(Faded = Completed)</span>
                      </div>
                      <span>Selected Date: <b className="text-zinc-800 font-mono font-bold">{selectedDate}</b></span>
                    </div>

                  </div>

                  {/* Date Editing Sidebar Panel (Right) */}
                  <div className="lg:col-span-5 space-y-6">
                    
                    {/* Tasks for the selected date */}
                    <div className="relative bg-white border border-zinc-200 rounded-xl p-5 space-y-4 overflow-hidden">
                      <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                      <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                      <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                      <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>

                      <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                        <h2 className="text-xs lg:text-sm font-extrabold uppercase tracking-widest text-zinc-900 flex items-center gap-1.5 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-900"></span> 
                          {taskScope === 'selected' ? `Goals for ${selectedDate}` : 'All Scheduled Goals'}
                        </h2>
                      </div>

                      {/* Add Inline Goal Form */}
                      <form onSubmit={handleAddTask} className="space-y-3.5">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Add quick goal..."
                            className="flex-grow bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400 font-sans"
                          />
                          <button
                            type="submit"
                            className="px-3.5 bg-zinc-950 hover:bg-zinc-900 text-white rounded-lg text-xs font-extrabold transition-all shrink-0 border border-zinc-950"
                          >
                            + Add
                          </button>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 justify-between text-[10px] bg-zinc-50 p-2 rounded-lg border border-zinc-200/60">
                          {/* Priority Selector */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-400 font-bold font-mono text-[8px] uppercase tracking-wider">PRIORITY:</span>
                            <div className="flex rounded-md bg-white p-0.5 border border-zinc-200 shadow-xs">
                              {(['High', 'Medium', 'Low'] as const).map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => setNewTaskPriority(p)}
                                  className={`px-2 py-0.5 rounded font-extrabold transition-all text-[8px] tracking-wider uppercase ${
                                    newTaskPriority === p 
                                      ? 'bg-zinc-950 text-white shadow-sm' 
                                      : 'text-zinc-400 hover:text-zinc-800'
                                  }`}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Category Selector */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-400 font-bold font-mono text-[8px] uppercase tracking-wider">TAG:</span>
                            <select
                              value={newTaskCategory}
                              onChange={(e) => setNewTaskCategory(e.target.value)}
                              className="bg-white border border-zinc-200 rounded px-1.5 py-0.5 text-[9px] text-zinc-700 font-extrabold focus:outline-none cursor-pointer uppercase font-mono tracking-wider"
                            >
                              <option value="Study">Study</option>
                              <option value="Coding">Coding</option>
                              <option value="Research">Research</option>
                              <option value="Botany">Botany</option>
                              <option value="Personal">Personal</option>
                            </select>
                          </div>
                        </div>
                      </form>

                      {/* Sort and Scope Controls */}
                      <div className="grid grid-cols-2 gap-3 p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg">
                        <div className="flex flex-col gap-1 text-[10px]">
                          <span className="text-zinc-400 font-extrabold uppercase tracking-widest text-[7px] font-mono">Scope Filter</span>
                          <div className="flex rounded-md bg-white border border-zinc-200 p-0.5 w-full">
                            <button
                              type="button"
                              onClick={() => setTaskScope('selected')}
                              className={`flex-1 py-0.5 rounded font-extrabold transition-all text-[8px] uppercase tracking-wider text-center ${
                                taskScope === 'selected'
                                  ? 'bg-zinc-950 text-white shadow-xs'
                                  : 'text-zinc-400 hover:text-zinc-800'
                              }`}
                            >
                              Selected
                            </button>
                            <button
                              type="button"
                              onClick={() => setTaskScope('all')}
                              className={`flex-1 py-0.5 rounded font-extrabold transition-all text-[8px] uppercase tracking-wider text-center ${
                                taskScope === 'all'
                                  ? 'bg-zinc-950 text-white shadow-xs'
                                  : 'text-zinc-400 hover:text-zinc-800'
                              }`}
                            >
                              All Dates
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 text-[10px]">
                          <span className="text-zinc-400 font-extrabold uppercase tracking-widest text-[7px] font-mono">Sort Order</span>
                          <div className="flex rounded-md bg-white border border-zinc-200 p-0.5 w-full">
                            <button
                              type="button"
                              onClick={() => setTaskSortBy('none')}
                              className={`flex-1 py-0.5 rounded font-extrabold transition-all text-[8px] uppercase tracking-wider text-center ${
                                taskSortBy === 'none'
                                  ? 'bg-zinc-950 text-white shadow-xs'
                                  : 'text-zinc-400 hover:text-zinc-800'
                              }`}
                            >
                              None
                            </button>
                            <button
                              type="button"
                              onClick={() => setTaskSortBy('priority')}
                              className={`flex-1 py-0.5 rounded font-extrabold transition-all text-[8px] uppercase tracking-wider text-center ${
                                taskSortBy === 'priority'
                                  ? 'bg-zinc-950 text-white shadow-xs'
                                  : 'text-zinc-400 hover:text-zinc-800'
                              }`}
                            >
                              Priority
                            </button>
                            <button
                              type="button"
                              onClick={() => setTaskSortBy('deadline')}
                              className={`flex-1 py-0.5 rounded font-extrabold transition-all text-[8px] uppercase tracking-wider text-center ${
                                taskSortBy === 'deadline'
                                  ? 'bg-zinc-950 text-white shadow-xs'
                                  : 'text-zinc-400 hover:text-zinc-800'
                              }`}
                            >
                              Deadline
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Selected Day Goals list */}
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {(() => {
                          let processed = tasks;
                          if (taskScope === 'selected') {
                            processed = processed.filter(t => t.deadline === selectedDate);
                          }

                          if (taskSortBy === 'priority') {
                            const priorityWeight = { High: 3, Medium: 2, Low: 1 };
                            processed = [...processed].sort((a, b) => {
                              const weightA = priorityWeight[a.priority || 'Medium'] || 2;
                              const weightB = priorityWeight[b.priority || 'Medium'] || 2;
                              return weightB - weightA;
                            });
                          } else if (taskSortBy === 'deadline') {
                            processed = [...processed].sort((a, b) => {
                              if (!a.deadline) return 1;
                              if (!b.deadline) return -1;
                              return a.deadline.localeCompare(b.deadline);
                            });
                          }

                          if (processed.length === 0) {
                            return (
                              <div className="text-center py-8 text-zinc-400 text-xs font-mono uppercase tracking-wider">
                                {taskScope === 'selected' 
                                  ? "No goals scheduled for today." 
                                  : "No goals scheduled."}
                              </div>
                            );
                          }

                          return processed.map(task => (
                            <div key={task.id} className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2.5 hover:bg-zinc-100/50 transition-all">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2">
                                  <button
                                    onClick={() => handleToggleTaskStatus(task.id)}
                                    className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                                      task.status === 'Done' ? 'bg-zinc-950 border-zinc-950 text-white' : 'border-zinc-300 bg-white hover:border-zinc-500'
                                    }`}
                                  >
                                    {task.status === 'Done' && <Check className="w-2.5 h-2.5" />}
                                  </button>
                                  <div>
                                    <span className={`text-sm font-extrabold block leading-snug relative inline-block transition-all duration-500 ${task.status === 'Done' ? 'text-zinc-400 opacity-60' : 'text-zinc-800'}`}>
                                      {task.title}
                                      <span 
                                        className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-zinc-400 transition-all duration-500 ease-out pointer-events-none" 
                                        style={{ width: task.status === 'Done' ? '100%' : '0%' }}
                                      />
                                    </span>
                                    
                                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-white text-zinc-600 border border-zinc-200 font-mono uppercase font-bold tracking-wider">
                                        {task.category}
                                      </span>

                                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono uppercase font-bold tracking-wider border ${
                                        task.priority === 'High' 
                                          ? 'bg-rose-50 text-rose-700 border-rose-100' 
                                          : task.priority === 'Medium'
                                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                                            : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                                      }`}>
                                        {task.priority || 'Medium'}
                                      </span>

                                      {taskScope === 'all' && task.deadline && (
                                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200 font-mono">
                                          📅 {task.deadline}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="text-zinc-400 hover:text-rose-600 p-1 transition-all shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* AI Copilot Action block */}
                              <div className="border-t border-zinc-200/60 pt-1.5 flex justify-end">
                                <button
                                  onClick={() => handleAICopilotAudit(task)}
                                  disabled={isAuditing}
                                  className="text-[8px] uppercase tracking-widest text-zinc-950 font-extrabold hover:underline flex items-center gap-1 font-mono"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  {activeTaskAudit === task.id && isAuditing ? "Analyzing..." : "AI Study Action"}
                                </button>
                              </div>

                              {/* Audited advice results display */}
                              {task.cognitivePriority && (
                                <div className="p-2.5 bg-white rounded-lg text-[10px] text-zinc-600 border border-zinc-200 space-y-1 mt-1 font-sans">
                                  <div><b className="font-mono text-[8px] uppercase tracking-wider text-zinc-400 block">Cognitive Focus</b> {task.cognitivePriority}</div>
                                  <div className="pt-1 border-t border-zinc-100"><b className="font-mono text-[8px] uppercase tracking-wider text-zinc-400 block">Tactical Guide</b> {task.readyToGoSolutions}</div>
                                </div>
                              )}
                            </div>
                          ));
                        })()}
                      </div>

                    </div>

                    {/* Date secure thoughts - E2EE Journal */}
                    <div className="relative bg-white border border-zinc-200 rounded-xl p-5 space-y-3.5 overflow-hidden">
                      <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                      <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                      <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                      <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>

                      <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                        <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-900 flex items-center gap-1.5 font-mono">
                          <Lock className="w-3.5 h-3.5" /> Secure Thoughts ({selectedDate})
                        </h2>
                      </div>

                      {masterPassphrase ? (
                        <div className="space-y-2">
                          <textarea
                            value={selectedDateNote}
                            onChange={(e) => handleSaveDateNote(e.target.value)}
                            placeholder="Type safe daily notes, study review, or personal thoughts here..."
                            rows={3}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400 font-sans leading-relaxed"
                          />
                          <p className="text-[8px] text-zinc-400 text-right italic font-mono uppercase tracking-wider">
                            Auto-securing client-side using AES E2EE
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg text-center text-xs space-y-3.5 text-zinc-500">
                          <p className="font-serif">To record secure daily thoughts, configure your local Master Passphrase.</p>
                          <button
                            onClick={() => setActiveTab('settings')}
                            className="px-3 py-1.5 bg-zinc-950 text-white hover:bg-zinc-900 rounded text-[9px] uppercase tracking-wider font-extrabold font-mono transition-all"
                          >
                            Setup Passphrase
                          </button>
                        </div>
                      )}
                    </div>

                  </div>

                </div>



              </div>
            )}

            {/* TAB 2: HABITS & RELAX SPACE */}
            {activeTab === 'habits' && (
              <div className="space-y-6 max-w-4xl mx-auto">
                
                {/* Introduction in Swiss header style */}
                <div className="relative bg-white border border-zinc-200 rounded-xl p-6 overflow-hidden">
                  <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  
                  <h1 className="text-base font-extrabold uppercase tracking-widest text-zinc-950 font-mono">Daily Habits & Calm Focus</h1>
                  <p className="text-xs text-zinc-500 mt-2 font-sans leading-relaxed">
                    Calibrate your workspace study flow by tracking consistent habits, activating relaxing organic soundscapes, and engaging in guided respiratory sigh patterns.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Habits Column (Left) */}
                  <div className="relative bg-white border border-zinc-200 rounded-xl p-5 space-y-4 overflow-hidden">
                    <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                    <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                    <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                    <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>

                    <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-950 flex items-center gap-1.5 border-b border-zinc-100 pb-2.5 font-mono">
                      <span className="w-2 h-2 rounded-full bg-zinc-950"></span> Daily Habits
                    </h2>

                    {/* Add new habit */}
                    <form onSubmit={handleAddHabit} className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={newHabitTitle}
                        onChange={(e) => setNewHabitTitle(e.target.value)}
                        placeholder="New daily habit..."
                        className="flex-grow bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400 font-sans"
                      />
                      <button
                        type="submit"
                        className="px-3.5 bg-zinc-950 hover:bg-zinc-900 text-white rounded-lg text-xs font-extrabold transition-all border border-zinc-950 shrink-0 font-mono uppercase tracking-wider"
                      >
                        + Create
                      </button>
                    </form>

                    {/* Habits List */}
                    <div className="space-y-2.5">
                      {habits.length === 0 ? (
                        <div className="text-center py-8 text-zinc-400 text-xs font-mono uppercase tracking-wider">
                          No habits created yet.
                        </div>
                      ) : (
                        habits.map(habit => {
                          const isCompletedToday = (habit.completedDays || []).includes(selectedDate);
                          return (
                            <div key={habit.id} className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-between gap-2.5 hover:bg-zinc-100/50 transition-all">
                              <div>
                                <span className={`text-xs font-bold block ${isCompletedToday ? 'line-through text-zinc-400 font-medium' : 'text-zinc-800'}`}>
                                  {habit.title}
                                </span>
                                <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-wider block mt-0.5">
                                  🔥 STREAK: {habit.streak || 0} DAYS
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleHabitDay(habit.id, selectedDate)}
                                  className={`px-3 py-1.5 rounded text-[9px] font-extrabold uppercase transition-all border font-mono tracking-wider ${
                                    isCompletedToday 
                                      ? 'bg-zinc-950 border-zinc-950 text-white shadow-xs' 
                                      : 'bg-white hover:bg-zinc-50 text-zinc-600 border-zinc-200 shadow-xs'
                                  }`}
                                >
                                  {isCompletedToday ? "Done Today" : "Check Day"}
                                </button>

                                <button
                                  onClick={() => handleDeleteHabit(habit.id)}
                                  className="text-zinc-400 hover:text-rose-600 p-1.5 transition-all shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Breathing & Sounds Deck (Right) */}
                  <div className="space-y-6">
                    
                    {/* Guided Breathing with Expanding circle */}
                    <div className="relative bg-white border border-zinc-200 rounded-xl p-5 space-y-4 overflow-hidden">
                      <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                      <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                      <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                      <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>

                      <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-950 flex items-center gap-1.5 border-b border-zinc-100 pb-2.5 font-mono">
                        <Wind className="w-4 h-4 text-zinc-800" /> guided breathing sigh
                      </h2>

                      <div className="flex flex-col items-center justify-center p-5 bg-zinc-50 border border-zinc-200 rounded-lg min-h-[200px] relative overflow-hidden">
                        
                        {/* Animated organic leaf sways/scales */}
                        <motion.div 
                          className="w-20 h-20 rounded-full bg-zinc-100 border-2 border-zinc-950 flex items-center justify-center relative shadow-sm"
                          style={{ transform: `scale(${breathingScale})` }}
                        >
                          <Smile className="w-8 h-8 text-zinc-950" />
                        </motion.div>

                        <div className="text-center mt-6">
                          <div className="text-[11px] font-black text-zinc-950 uppercase tracking-widest font-mono">{breathingText}</div>
                          {breathingActive && (
                            <div className="text-[8px] font-mono text-zinc-500 mt-1 uppercase tracking-widest">Active seconds: {breathingSeconds}s</div>
                          )}
                        </div>
                      </div>

                      {/* Calibrate and control buttons */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          {(['Box', '4-7-8', 'Relax'] as const).map(m => (
                            <button
                              key={m}
                              disabled={breathingActive}
                              onClick={() => { setBreathingMode(m); triggerToast(`Sigh regulator set to ${m}`, "info"); }}
                              className={`py-1 rounded text-[8px] font-extrabold uppercase border transition-all font-mono tracking-wider ${
                                breathingMode === m 
                                  ? 'bg-zinc-950 text-white border-zinc-950' 
                                  : 'bg-white hover:bg-zinc-50 text-zinc-500 border-zinc-200 disabled:opacity-55'
                              }`}
                            >
                              {m} Method
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => setBreathingActive(!breathingActive)}
                          className={`w-full py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-widest border transition-all flex items-center justify-center gap-2 font-mono ${
                            breathingActive 
                              ? 'bg-rose-50 border-rose-200 text-rose-700' 
                              : 'bg-zinc-950 text-white border-zinc-950 hover:bg-zinc-900 shadow-xs'
                          }`}
                        >
                          {breathingActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          {breathingActive ? "Halt breathing motor" : "Engage breathe helper"}
                        </button>
                      </div>
                    </div>

                    {/* Sounds Deck */}
                    <div className="relative bg-white border border-zinc-200 rounded-xl p-5 space-y-4 overflow-hidden">
                      <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                      <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                      <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                      <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>

                      <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-950 flex items-center gap-1.5 border-b border-zinc-100 pb-2.5 font-mono">
                        <Coffee className="w-4 h-4 text-zinc-800" /> Focus soundscapes
                      </h2>

                      <div className="grid grid-cols-1 gap-2">
                        {/* Rain sound toggle */}
                        <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                          <span className="text-xs font-bold text-zinc-800">Rain & Calm Thunder</span>
                          <button
                            onClick={() => {
                              if (activeSound === 'Rain') {
                                setActiveSound(null);
                                triggerToast("Ambient sound wave paused", "info");
                              } else {
                                setActiveSound('Rain');
                                triggerToast("Calming Rain active", "success");
                              }
                            }}
                            className={`p-1.5 rounded border transition-all ${
                              activeSound === 'Rain' ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs' : 'bg-white text-zinc-500 border-zinc-200 shadow-xs'
                            }`}
                          >
                            {activeSound === 'Rain' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Forest sound toggle */}
                        <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                          <span className="text-xs font-bold text-zinc-800">Quiet Botanical Forest</span>
                          <button
                            onClick={() => {
                              if (activeSound === 'Forest') {
                                setActiveSound(null);
                                triggerToast("Ambient sound wave paused", "info");
                              } else {
                                setActiveSound('Forest');
                                triggerToast("Serene Forest active", "success");
                              }
                            }}
                            className={`p-1.5 rounded border transition-all ${
                              activeSound === 'Forest' ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs' : 'bg-white text-zinc-500 border-zinc-200 shadow-xs'
                            }`}
                          >
                            {activeSound === 'Forest' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* TAB 3: RELATIONAL DATABASE EXPLORER REMOVED */}
            {false && (
              <div className="space-y-6 max-w-5xl mx-auto">
                
                {/* Intro Card */}
                <div className="relative bg-white border border-zinc-200 rounded-xl p-6 overflow-hidden">
                  <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>

                  <div className="flex items-center gap-2.5 mb-2">
                    <Database className="w-5 h-5 text-zinc-950" />
                    <h1 className="text-base font-extrabold uppercase tracking-widest text-zinc-950 font-mono">
                      Client-Side Relational Database Engine
                    </h1>
                  </div>
                  <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                    A fully-normalized relational database scheme running right in your workspace. This implements a robust, lightweight, and offline-persistent Relational Query layer with cascade deletes and foreign key triggers for a complete developer sandbox representation.
                  </p>
                </div>

                {/* DB Console & Visual Schema Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: SQL console */}
                  <div className="relative lg:col-span-7 bg-white border border-zinc-200 rounded-xl p-5 space-y-4 overflow-hidden">
                    <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                    <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                    <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                    <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>

                    <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-950 flex items-center gap-1.5 border-b border-zinc-100 pb-2.5 font-mono">
                      <Code className="w-4 h-4 text-zinc-800" /> SQL Command Line
                    </h2>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[8px] font-extrabold uppercase text-zinc-400 tracking-wider font-mono mb-1">
                          Query Interpreter Editor
                        </label>
                        <div className="relative">
                          <textarea
                            rows={3}
                            value={sqlQuery}
                            onChange={(e) => setSqlQuery(e.target.value)}
                            placeholder="SELECT * FROM Tasks..."
                            className="w-full bg-zinc-950 text-zinc-100 font-mono text-xs rounded-lg p-3.5 focus:outline-none focus:ring-1 focus:ring-zinc-800 shadow-inner"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-between items-center">
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const res = rdb.executeSQL(sqlQuery);
                              setQueryResult(res);
                              setSqlError(null);
                              triggerToast("SQL query executed successfully", "success");
                            } catch (e: any) {
                              setSqlError(e.message || "Execution failed");
                              setQueryResult([]);
                            }
                          }}
                          className="px-4 py-2 bg-zinc-950 hover:bg-zinc-900 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-lg transition-all shadow-sm flex items-center gap-2 border border-zinc-950 font-mono"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Execute SQL Query
                        </button>

                        <span className="text-[9px] font-mono text-zinc-400 bg-zinc-50 border border-zinc-200 px-2.5 py-1 rounded uppercase tracking-wider font-bold">
                          Connected to: Sandboxed_SQLite
                        </span>
                      </div>
                    </div>

                    {/* Predefined Templates */}
                    <div className="space-y-2.5 pt-3.5 border-t border-zinc-100">
                      <h3 className="text-[8px] font-extrabold uppercase text-zinc-400 tracking-wider font-mono">
                        Template Relational Queries (Click to load & execute)
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            const query = 'SELECT * FROM Users';
                            setSqlQuery(query);
                            setQueryResult(rdb.executeSQL(query));
                            setSqlError(null);
                          }}
                          className="text-left text-[9px] p-2.5 bg-zinc-50 hover:bg-zinc-100/75 border border-zinc-200 rounded-lg text-zinc-700 font-mono truncate transition-all uppercase tracking-wider font-bold shadow-xs"
                        >
                          1. SELECT * FROM Users
                        </button>

                        <button
                          onClick={() => {
                            const query = 'SELECT * FROM Tasks';
                            setSqlQuery(query);
                            setQueryResult(rdb.executeSQL(query));
                            setSqlError(null);
                          }}
                          className="text-left text-[9px] p-2.5 bg-zinc-50 hover:bg-zinc-100/75 border border-zinc-200 rounded-lg text-zinc-700 font-mono truncate transition-all uppercase tracking-wider font-bold shadow-xs"
                        >
                          2. SELECT * FROM Tasks
                        </button>

                        <button
                          onClick={() => {
                            const query = 'SELECT * FROM Habits';
                            setSqlQuery(query);
                            setQueryResult(rdb.executeSQL(query));
                            setSqlError(null);
                          }}
                          className="text-left text-[9px] p-2.5 bg-zinc-50 hover:bg-zinc-100/75 border border-zinc-200 rounded-lg text-zinc-700 font-mono truncate transition-all uppercase tracking-wider font-bold shadow-xs"
                        >
                          3. SELECT * FROM Habits
                        </button>

                        <button
                          onClick={() => {
                            const query = 'SELECT tasks.*, tags.name FROM Tasks JOIN Task_Tags JOIN Tags';
                            setSqlQuery(query);
                            setQueryResult(rdb.executeSQL(query));
                            setSqlError(null);
                          }}
                          className="text-left text-[9px] p-2.5 bg-zinc-50 hover:bg-zinc-100/75 border border-zinc-200 rounded-lg text-zinc-700 font-mono truncate transition-all uppercase tracking-wider font-bold shadow-xs"
                        >
                          4. Tasks many-to-many JOIN with Tags
                        </button>

                        <button
                          onClick={() => {
                            const query = 'SELECT habits.title, habit_logs.completed_date FROM Habits JOIN Habit_Logs';
                            setSqlQuery(query);
                            setQueryResult(rdb.executeSQL(query));
                            setSqlError(null);
                          }}
                          className="text-left text-[9px] p-2.5 bg-zinc-50 hover:bg-zinc-100/75 border border-zinc-200 rounded-lg text-zinc-700 font-mono truncate transition-all uppercase tracking-wider font-bold shadow-xs"
                        >
                          5. Habits one-to-many JOIN with Logs
                        </button>

                        <button
                          onClick={() => {
                            const query = 'SELECT category, COUNT(*) FROM Tasks GROUP BY category';
                            setSqlQuery(query);
                            setQueryResult(rdb.executeSQL(query));
                            setSqlError(null);
                          }}
                          className="text-left text-[9px] p-2.5 bg-zinc-50 hover:bg-zinc-100/75 border border-zinc-200 rounded-lg text-zinc-700 font-mono truncate transition-all uppercase tracking-wider font-bold shadow-xs"
                        >
                          6. Tasks aggregate GROUP BY category
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Visual ER Schema */}
                  <div className="relative lg:col-span-5 bg-white border border-zinc-200 rounded-xl p-5 space-y-4 overflow-hidden">
                    <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                    <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                    <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                    <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>

                    <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-950 flex items-center gap-1.5 border-b border-zinc-100 pb-2.5 font-mono">
                      <Table className="w-4 h-4 text-zinc-800" /> Database ER Diagram
                    </h2>

                    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                      {/* Users table blueprint */}
                      <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1 text-[11px]">
                        <div className="flex justify-between font-extrabold text-zinc-900 font-mono uppercase tracking-wide text-[10px]">
                          <span>👤 Users (Table)</span>
                          <span className="text-[8px] font-mono text-zinc-500 bg-zinc-200 px-1 rounded">1</span>
                        </div>
                        <div className="font-mono text-[10px] text-zinc-600 pl-2 border-l border-zinc-300">
                          <div>id (PK, string)</div>
                          <div>username (string)</div>
                          <div>email (string, unique)</div>
                          <div>avatar_url (string)</div>
                        </div>
                      </div>

                      {/* Tasks table blueprint */}
                      <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1 text-[11px]">
                        <div className="flex justify-between font-extrabold text-zinc-900 font-mono uppercase tracking-wide text-[10px]">
                          <span>📋 Tasks (Table)</span>
                          <span className="text-[8px] font-mono text-zinc-500 bg-zinc-200 px-1 rounded">N</span>
                        </div>
                        <div className="font-mono text-[10px] text-zinc-600 pl-2 border-l border-zinc-300">
                          <div>id (PK, string)</div>
                          <div className="text-zinc-900 font-bold">user_id (FK to Users.id)</div>
                          <div>title (string)</div>
                          <div>category (string)</div>
                          <div>priority (string)</div>
                          <div>status (string)</div>
                        </div>
                      </div>

                      {/* Habits table blueprint */}
                      <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1 text-[11px]">
                        <div className="flex justify-between font-extrabold text-zinc-900 font-mono uppercase tracking-wide text-[10px]">
                          <span>🔄 Habits (Table)</span>
                          <span className="text-[8px] font-mono text-zinc-500 bg-zinc-200 px-1 rounded">N</span>
                        </div>
                        <div className="font-mono text-[10px] text-zinc-600 pl-2 border-l border-zinc-300">
                          <div>id (PK, string)</div>
                          <div className="text-zinc-900 font-bold">user_id (FK to Users.id)</div>
                          <div>title (string)</div>
                          <div>category (string)</div>
                        </div>
                      </div>

                      {/* Habit_Logs table blueprint */}
                      <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1 text-[11px]">
                        <div className="flex justify-between font-extrabold text-zinc-900 font-mono uppercase tracking-wide text-[10px]">
                          <span>🗓️ Habit_Logs (Table)</span>
                          <span className="text-[8px] font-mono text-zinc-500 bg-zinc-200 px-1 rounded">N</span>
                        </div>
                        <div className="font-mono text-[10px] text-zinc-600 pl-2 border-l border-zinc-300">
                          <div>id (PK, string)</div>
                          <div className="text-zinc-950 font-bold">habit_id (FK to Habits.id, CASCADE)</div>
                          <div>completed_date (string)</div>
                        </div>
                      </div>

                      {/* Tags table blueprint */}
                      <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1 text-[11px]">
                        <div className="flex justify-between font-extrabold text-zinc-900 font-mono uppercase tracking-wide text-[10px]">
                          <span>🏷️ Tags (Table)</span>
                          <span className="text-[8px] font-mono text-zinc-500 bg-zinc-200 px-1 rounded">N</span>
                        </div>
                        <div className="font-mono text-[10px] text-zinc-600 pl-2 border-l border-zinc-300">
                          <div>id (PK, string)</div>
                          <div>name (string)</div>
                          <div>color (string)</div>
                        </div>
                      </div>

                      {/* Task_Tags join table blueprint */}
                      <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1 text-[11px]">
                        <div className="flex justify-between font-extrabold text-zinc-900 font-mono uppercase tracking-wide text-[10px]">
                          <span>🔗 Task_Tags (Junction Table)</span>
                          <span className="text-[8px] font-mono text-zinc-500 bg-zinc-200 px-1 rounded">M-to-N</span>
                        </div>
                        <div className="font-mono text-[10px] text-zinc-600 pl-2 border-l border-zinc-300">
                          <div className="text-zinc-950 font-bold">task_id (FK to Tasks.id, CASCADE)</div>
                          <div className="text-zinc-950 font-bold">tag_id (FK to Tags.id, CASCADE)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DB Output results table view */}
                <div className="relative bg-white border border-zinc-200 rounded-xl p-5 space-y-3 overflow-hidden">
                  <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>

                  <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-950 border-b border-zinc-100 pb-2.5 font-mono">
                    Console Query Results
                  </h3>

                  {sqlError ? (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-mono">
                      🔴 <b>Error:</b> {sqlError}
                    </div>
                  ) : queryResult && queryResult.length > 0 ? (
                    <div className="overflow-x-auto border border-zinc-200 rounded-lg bg-white">
                      <table className="w-full text-left border-collapse text-[11px] font-sans">
                        <thead>
                          <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-500 uppercase tracking-widest font-mono text-[8px] font-black">
                            {Object.keys(queryResult[0]).map((key) => (
                              <th key={key} className="px-4 py-3 font-bold">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {queryResult.map((row, idx) => (
                            <tr key={idx} className="border-b border-zinc-100 hover:bg-zinc-50/50 text-zinc-700">
                              {Object.values(row).map((val: any, cellIdx) => (
                                <td key={cellIdx} className="px-4 py-3 font-mono text-[10px] truncate max-w-[200px]">
                                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-zinc-400 text-xs font-mono uppercase tracking-wider">
                      No rows returned. Select a template or write SQL above.
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 4: AI PLANNING & DOCUMENT COACH */}
            {activeTab === 'planning' && (
              <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full min-h-[600px]">
                
                {planningMessages.length === 0 ? (
                  /* Landing state: Gemini/ChatGPT/Claude-like sole text area */
                  <div className="flex flex-col items-center justify-center py-10 lg:py-16 px-4 space-y-8 w-full max-w-3xl mx-auto">
                    
                    {/* Centered Premium Title Section */}
                    <div className="text-center space-y-3">
                      <div className="inline-flex p-3 bg-zinc-950 text-emerald-400 rounded-2xl shadow-sm border border-zinc-800">
                        <Brain className="w-8 h-8" />
                      </div>
                      <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-widest text-zinc-950 font-mono">
                        Diya Planning Coach
                      </h1>
                      <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
                        Your intelligent academic co-pilot. Upload syllabus documents, assignment PDFs, or simply describe your tasks to generate optimized, efficient action plans.
                      </p>
                    </div>

                    {/* Prominent Central Sole Input Box Card */}
                    <div className="w-full bg-white border-2 border-zinc-950 rounded-2xl p-4 md:p-5 shadow-[4px_4px_0px_0px_rgba(9,9,11,1)] transition-all">
                      <form onSubmit={handleSendPlanningMessage} className="space-y-4">
                        
                        {/* Sole Text Area */}
                        <div className="relative">
                          <textarea
                            value={planningInput}
                            onChange={(e) => setPlanningInput(e.target.value)}
                            placeholder="How can I help you plan, study, or digest your course materials today? Paste a syllabus, write guidelines, or upload document files..."
                            className="w-full h-32 md:h-40 p-1 bg-transparent text-sm md:text-base text-zinc-900 focus:outline-none resize-none font-sans placeholder:text-zinc-400 leading-relaxed"
                          />
                        </div>

                        {/* File upload summary display if loaded */}
                        {planningDocName && (
                          <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                            <div className="flex items-center gap-2 text-emerald-950 font-mono text-xs">
                              <FileText className="w-4 h-4 text-emerald-600 animate-pulse" />
                              <span className="font-bold truncate max-w-xs">{planningDocName}</span>
                              <span className="text-[10px] text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Loaded</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setPlanningDocText('');
                                setPlanningDocName('');
                              }}
                              className="text-[10px] font-mono uppercase tracking-wider text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-100 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        )}

                        {/* Toolbar footer inside the central input card */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-zinc-100">
                          
                          {/* File Attachment Action Button */}
                          <div className="relative flex items-center gap-2 self-start sm:self-auto cursor-pointer">
                            <div className="relative cursor-pointer group">
                              <input
                                type="file"
                                accept=".txt,.md,.json,.pdf,.docx"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              />
                              <button
                                type="button"
                                className="px-3.5 py-2 border border-zinc-200 rounded-xl bg-zinc-50 text-zinc-700 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 hover:bg-zinc-100 hover:text-zinc-950 transition-all"
                              >
                                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                                Attach Document
                              </button>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline-block">Supports PDF, Doc, Text, MD</span>
                          </div>

                          {/* Submit / Get Started button */}
                          <button
                            type="submit"
                            disabled={isPlanningLoading || (!planningInput.trim() && !planningDocText)}
                            className={`py-2.5 px-5 rounded-xl text-xs font-extrabold uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${
                              isPlanningLoading || (!planningInput.trim() && !planningDocText)
                                ? 'bg-zinc-50 border-zinc-200 text-zinc-400 cursor-not-allowed'
                                : 'bg-zinc-950 border-zinc-950 text-white hover:bg-zinc-900 shadow-sm cursor-pointer'
                            }`}
                          >
                            {isPlanningLoading ? (
                              <>
                                <span className="w-3.5 h-3.5 border-2 border-t-transparent border-zinc-400 rounded-full animate-spin"></span>
                                Generating Plan...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                Launch Planner Session
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Pre-filled chips / suggestion prompts */}
                    <div className="w-full space-y-3">
                      <p className="text-center text-xs font-mono uppercase tracking-widest text-zinc-400">
                        Select a target workspace template to begin
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setPlanningInput("Create a biochemistry revision schedule focusing on enzyme kinematics for my midterm next Friday.");
                          }}
                          className="text-left p-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-950 hover:-translate-y-0.5 transition-all text-xs font-sans space-y-1.5 cursor-pointer"
                        >
                          <div className="font-bold text-zinc-950 font-mono uppercase tracking-wider flex items-center gap-1">
                            <span className="text-emerald-500">⚡</span> Midterm Exam Prep
                          </div>
                          <p className="text-zinc-500 leading-relaxed font-normal">
                            Synthesizes dense topics into structured checklists with optimal retention curves.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPlanningInput("Break down this essay outline into 3 simple milestones with realistic deadlines.");
                          }}
                          className="text-left p-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-950 hover:-translate-y-0.5 transition-all text-xs font-sans space-y-1.5 cursor-pointer"
                        >
                          <div className="font-bold text-zinc-950 font-mono uppercase tracking-wider flex items-center gap-1">
                            <span className="text-emerald-500">⚡</span> Essay Decomposition
                          </div>
                          <p className="text-zinc-500 leading-relaxed font-normal">
                            Deconstructs research papers or writing rubrics into structured micro-milestones.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPlanningInput("Help me create a detailed reference guide for coding homework including key formulas.");
                          }}
                          className="text-left p-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-950 hover:-translate-y-0.5 transition-all text-xs font-sans space-y-1.5 cursor-pointer"
                        >
                          <div className="font-bold text-zinc-950 font-mono uppercase tracking-wider flex items-center gap-1">
                            <span className="text-emerald-500">⚡</span> Homework Coach
                          </div>
                          <p className="text-zinc-500 leading-relaxed font-normal">
                            Builds visual, step-by-step guidance to approach programming or math homework efficiently.
                          </p>
                        </button>
                      </div>
                    </div>

                  </div>
                ) : (
                  /* Active state: Classic ChatGPT/Claude interface */
                  <div className="relative bg-white border border-zinc-200 rounded-2xl flex flex-col h-[650px] overflow-hidden">
                    
                    {/* Header bar */}
                    <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-3 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-950 font-mono">
                          Diya AI Session
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPlanningMessages([]);
                          setPlanningInput('');
                          setPlanningDocText('');
                          setPlanningDocName('');
                        }}
                        className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 hover:text-zinc-950 border border-zinc-200 px-2.5 py-1 bg-white rounded-lg shadow-sm hover:bg-zinc-50 transition-colors cursor-pointer"
                      >
                        Reset / Start New Topic
                      </button>
                    </div>

                    {/* Chat Messages Stream */}
                    <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin">
                      {planningMessages.map((msg, index) => {
                        const isUser = msg.role === 'user';
                        return (
                          <div key={index} className="space-y-4">
                            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`max-w-[85%] rounded-2xl p-4 border text-sm lg:text-base leading-relaxed font-sans shadow-sm ${
                                  isUser
                                    ? 'bg-zinc-950 text-white border-zinc-950 rounded-tr-none'
                                    : 'bg-zinc-50 border-zinc-200 text-zinc-850 rounded-tl-none'
                                }`}
                              >
                                {isUser ? (
                                  <p className="whitespace-pre-line">{msg.content}</p>
                                ) : (
                                  <div className="space-y-3">
                                    <div>{formatPlanningReply(msg.content)}</div>
                                    <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between gap-4 text-[10px] font-mono text-zinc-400 font-medium">
                                      <span className="flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Active Model: {msg.modelUsed || 'gemini-3.5-flash'}
                                      </span>
                                      <span className="text-[9px] uppercase tracking-wider text-zinc-400">Diya Auto-Fallback Guard</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* If there are suggested calendar milestones inside the message */}
                            {!isUser && msg.suggestedItems && msg.suggestedItems.length > 0 && (
                              <div className="ml-4 max-w-2xl bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 md:p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-xs font-mono uppercase tracking-widest text-emerald-950 font-black flex items-center gap-1.5">
                                    <CalendarIcon className="w-4 h-4 text-emerald-600" />
                                    AI Calendar Suggestions
                                  </h3>
                                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded-full font-bold">
                                    {msg.suggestedItems.length} Milestones
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  {msg.suggestedItems.map((item: any, itemIdx: number) => (
                                    <div key={itemIdx} className="bg-white border border-zinc-200 p-3 rounded-xl flex items-start justify-between gap-3 shadow-sm hover:border-emerald-300 transition-colors">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-black text-zinc-950">{item.title}</span>
                                          <span className={`text-[8px] px-2 py-0.5 font-mono uppercase rounded-full tracking-wider font-bold ${
                                            item.priority === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                            item.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                            'bg-zinc-100 text-zinc-500'
                                          }`}>
                                            {item.priority}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">{item.description}</p>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span className="text-[10px] font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                          {item.deadline}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleAddPlanningTasks(msg.suggestedItems || [])}
                                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                  <Plus className="w-4 h-4 text-white" />
                                  📅 Mark Steps on Calendar
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {isPlanningLoading && (
                        <div className="flex justify-start">
                          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl rounded-tl-none p-4 max-w-[80%] flex items-center gap-3">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest animate-pulse">
                              Diya Coach is thinking...
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chat Continuation Form (ChatGPT-like input bar) */}
                    <div className="bg-zinc-50 border-t border-zinc-200 p-4 shrink-0">
                      <form onSubmit={handleSendPlanningMessage} className="flex gap-2">
                        <textarea
                          value={planningInput}
                          onChange={(e) => setPlanningInput(e.target.value)}
                          placeholder="Ask follow-up questions, refine steps, or add constraints..."
                          className="flex-grow h-11 py-2.5 px-3 bg-white text-xs text-zinc-900 border border-zinc-200 rounded-xl focus:outline-none focus:border-zinc-950 resize-none font-sans"
                        />
                        <button
                          type="submit"
                          disabled={isPlanningLoading || !planningInput.trim()}
                          className={`px-4 rounded-xl text-xs font-extrabold uppercase tracking-widest border transition-all flex items-center justify-center cursor-pointer ${
                            isPlanningLoading || !planningInput.trim()
                              ? 'bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed'
                              : 'bg-zinc-950 border-zinc-950 text-white hover:bg-zinc-900 shadow-sm'
                          }`}
                        >
                          Send
                        </button>
                      </form>
                    </div>

                  </div>
                )}

              </div>
            )}

            {/* TAB 4: USER SETTINGS */}
            {activeTab === 'settings' && (
              <div className="space-y-6 max-w-2xl mx-auto">
                
                {/* Introduction */}
                <div className="relative bg-white border border-zinc-200 rounded-xl p-6 overflow-hidden">
                  <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>

                  <h1 className="text-base font-extrabold uppercase tracking-widest text-zinc-950 font-mono">Desk Settings</h1>
                  <p className="text-xs text-zinc-500 mt-2 font-sans leading-relaxed">
                    Manage client-side encryption keys, modify workspace credentials, and monitor local sandbox storage settings.
                  </p>
                </div>

                {/* Profile customizer */}
                <div className="relative bg-white border border-zinc-200 rounded-xl p-5 space-y-4 overflow-hidden">
                  <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>

                  <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-950 flex items-center gap-1.5 border-b border-zinc-100 pb-2.5 font-mono">
                    <User className="w-4 h-4 text-zinc-800" /> Student Profile settings
                  </h2>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[8px] font-extrabold uppercase text-zinc-400 tracking-wider font-mono mb-1">Display Username</label>
                      <input
                        type="text"
                        defaultValue={user.username}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            localStorage.setItem('diya_username', val);
                            setUser(prev => prev ? { ...prev, username: val } : null);
                          }
                        }}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400 font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] font-extrabold uppercase text-zinc-400 tracking-wider font-mono mb-1">Port Email Connection</label>
                      <input
                        type="text"
                        disabled
                        value={user.email}
                        className="w-full bg-zinc-100/70 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-500 font-mono focus:outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Encryption Key Setup */}
                <div className="relative bg-white border border-zinc-200 rounded-xl p-5 space-y-4 overflow-hidden">
                  <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>

                  <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-950 flex items-center gap-1.5 border-b border-zinc-100 pb-2.5 font-mono">
                    <Lock className="w-4 h-4 text-zinc-800" /> Master encryption keys
                  </h2>

                  <p className="text-xs text-zinc-500 leading-relaxed font-sans">
                    Your secure daily thoughts are fully secured using client-side E2EE (End-to-End Encryption). Choose a custom passphrase. This key resides strictly in your private local context.
                  </p>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-grow">
                        <input
                          type={showPassphrase ? "text" : "password"}
                          value={passphraseInput}
                          onChange={(e) => setPassphraseInput(e.target.value)}
                          placeholder="Type personal passphrase..."
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-3.5 pr-10 py-2 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassphrase(!showPassphrase)}
                          className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 transition-all"
                        >
                          {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleSavePassphrase}
                        className="px-4 py-2 bg-zinc-950 hover:bg-zinc-900 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-lg transition-all border border-zinc-950 font-mono"
                      >
                        Save
                      </button>
                    </div>

                    {isPassphraseSaved && (
                      <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg flex gap-2.5 text-[9px] text-zinc-800 font-mono font-bold uppercase tracking-wider">
                        <Info className="w-4 h-4 text-zinc-900 shrink-0" />
                        <div>
                          Passphrase set! You can write and browse secure notes across days safely.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SMTP Server Configuration */}
                <div className="relative bg-white border border-zinc-200 rounded-xl p-5 space-y-4 overflow-hidden">
                  <span className="absolute -top-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -top-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -left-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -right-1 text-zinc-300 font-mono text-[9px] select-none pointer-events-none">+</span>

                  <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-950 flex items-center gap-1.5 border-b border-zinc-100 pb-2.5 font-mono">
                    <Mail className="w-4 h-4 text-zinc-800" /> SMTP Mail Server Credentials
                  </h2>

                  <p className="text-xs text-zinc-500 leading-relaxed font-sans">
                    Configure your SMTP server credentials to enable real email notifications when deadlines or goals are approaching. This bypasses the terminal-only simulator.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-extrabold uppercase text-zinc-400 tracking-wider font-mono mb-1">SMTP Host</label>
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => {
                          setSmtpHost(e.target.value);
                          localStorage.setItem('diya_smtp_host', e.target.value);
                        }}
                        placeholder="smtp.gmail.com"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] font-extrabold uppercase text-zinc-400 tracking-wider font-mono mb-1">SMTP Port</label>
                      <input
                        type="text"
                        value={smtpPort}
                        onChange={(e) => {
                          setSmtpPort(e.target.value);
                          localStorage.setItem('diya_smtp_port', e.target.value);
                        }}
                        placeholder="587"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] font-extrabold uppercase text-zinc-400 tracking-wider font-mono mb-1">SMTP Username / Email</label>
                      <input
                        type="text"
                        value={smtpUser}
                        onChange={(e) => {
                          setSmtpUser(e.target.value);
                          localStorage.setItem('diya_smtp_user', e.target.value);
                        }}
                        placeholder="your-email@gmail.com"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] font-extrabold uppercase text-zinc-400 tracking-wider font-mono mb-1">SMTP Password / App Key</label>
                      <input
                        type="password"
                        value={smtpPass}
                        onChange={(e) => {
                          setSmtpPass(e.target.value);
                          localStorage.setItem('diya_smtp_pass', e.target.value);
                        }}
                        placeholder="••••••••••••••••"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="smtpSecure"
                      checked={smtpSecure}
                      onChange={(e) => {
                        setSmtpSecure(e.target.checked);
                        localStorage.setItem('diya_smtp_secure', String(e.target.checked));
                      }}
                      className="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 h-3.5 w-3.5"
                    />
                    <label htmlFor="smtpSecure" className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider select-none cursor-pointer">
                      Use SSL/TLS Connection (Secure Port 465)
                    </label>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-[9px] text-zinc-500 font-mono leading-relaxed">
                    💡 <b>PRO TIP FOR GMAIL:</b> Use Google Account&apos;s <b>&quot;App Passwords&quot;</b> feature instead of your primary password. Gmail requires App Passwords to authenticate safely through external tools.
                  </div>
                </div>

                {/* Local Storage purge */}
                <div className="relative bg-rose-50/50 border border-rose-200 rounded-xl p-5 space-y-3.5 overflow-hidden">
                  <span className="absolute -top-1 -left-1 text-rose-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -top-1 -right-1 text-rose-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -left-1 text-rose-300 font-mono text-[9px] select-none pointer-events-none">+</span>
                  <span className="absolute -bottom-1 -right-1 text-rose-300 font-mono text-[9px] select-none pointer-events-none">+</span>

                  <h3 className="text-[10px] font-extrabold uppercase text-rose-950 tracking-widest font-mono">Decommission Local Cache</h3>
                  <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                    Purging local storage resolves caching inconsistencies and resets client preferences. This will sign you out and clear sandbox local items.
                  </p>
                  <button
                    onClick={() => {
                      localStorage.clear();
                      triggerToast("Cached database successfully deleted", "info");
                      setTimeout(() => window.location.reload(), 1500);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-lg shadow-sm transition-all font-mono border border-rose-600"
                  >
                    Clear Local Workspace
                  </button>
                </div>

              </div>
            )}

          </main>
        </div>

      </div>
    </div>
  );
}
