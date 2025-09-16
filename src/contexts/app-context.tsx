
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where,
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { db, app } from '@/lib/firebase';
import type { Project, TimeEntry } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { isToday, parseISO } from 'date-fns';
import { calculateTotalDuration } from '@/lib/utils';

interface TimerState {
    running: boolean;
    startTime: string | null;
    projectId: string | null;
    description: string | null;
}

interface AppContextType {
  user: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  timeEntries: TimeEntry[];
  setTimeEntries: (timeEntries: TimeEntry[]) => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'userId'> & { createdAt?: string }) => void;
  addTimeEntry: (timeEntry: Omit<TimeEntry, 'id' | 'userId'>) => Promise<void>;
  deleteTimeEntry: (timeEntryId: string) => Promise<void>;
  getProjectById: (id: string) => Project | undefined;
  getTimeEntriesByProjectId: (projectId: string) => TimeEntry[];
  isLogTimeDialogOpen: boolean;
  openLogTimeDialog: (defaultProjectId?: string) => void;
  closeLogTimeDialog: () => void;
  logTimeDialogDefaultProjectId?: string;
  isLogPracticeDialogOpen: boolean;
  openLogPracticeDialog: () => void;
  closeLogPracticeDialog: () => void;
  getOrCreatePracticeProject: () => Promise<string | undefined>;
  timer: TimerState;
  startTimer: (projectId: string, description: string) => void;
  stopTimer: () => void;
  elapsedTime: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DAILY_LIMIT_HOURS = 8;
const auth = getAuth(app);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false);
  const [logTimeDialogDefaultProjectId, setLogTimeDialogDefaultProjectId] = useState<string | undefined>();
  const [isLogPracticeDialogOpen, setIsLogPracticeDialogOpen] = useState(false);
  const [timer, setTimer] = useState<TimerState>({
    running: false,
    startTime: null,
    projectId: null,
    description: null,
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    setTimer({ running: false, startTime: null, projectId: null, description: null });
  };
  
  useEffect(() => {
    if (!user) {
        setProjects([]);
        setTimeEntries([]);
        return;
    };
    
    const projectQuery = query(collection(db, 'projects'), where('userId', '==', user.uid));
    const unsubscribeProjects = onSnapshot(projectQuery, (snapshot) => {
        const projectsData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Project));
        setProjects(projectsData);
    }, (error) => {
      console.error("Error fetching projects: ", error);
      toast({ title: "Error fetching projects", description: error.message, variant: "destructive" });
    });

    const timeEntryQuery = query(collection(db, 'timeEntries'), where('userId', '==', user.uid));
    const unsubscribeTimeEntries = onSnapshot(timeEntryQuery, (snapshot) => {
        const timeEntriesData = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as TimeEntry));
        setTimeEntries(timeEntriesData);
    }, (error) => {
      console.error("Error fetching time entries: ", error);
      toast({ title: "Error fetching time entries", description: error.message, variant: "destructive" });
    });

    return () => {
      unsubscribeProjects();
      unsubscribeTimeEntries();
    };
  }, [user, toast]);

  const addProject = async (project: Omit<Project, 'id' | 'createdAt' | 'userId'> & { createdAt?: string }) => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        ...project,
        userId: user.uid,
        createdAt: project.createdAt || new Date().toISOString()
      });
      console.log("Project written with ID: ", docRef.id);
    } catch (e) {
      console.error("Error adding document: ", e);
      toast({
        title: "Error",
        description: "There was an error saving your project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addTimeEntry = useCallback(async (timeEntry: Omit<TimeEntry, 'id'| 'userId'>) => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, 'timeEntries'), {...timeEntry, userId: user.uid });
      console.log("Time entry written with ID: ", docRef.id);
      
      const newTimeEntry = { ...timeEntry, id: docRef.id, userId: user.uid, startTime: timeEntry.startTime, endTime: timeEntry.endTime };
      const updatedTimeEntries = [...timeEntries, newTimeEntry];

      const todayEntries = updatedTimeEntries.filter(entry => isToday(parseISO(entry.startTime)));
      const totalTodayDuration = calculateTotalDuration(todayEntries);
      
      const dailyLimitMilliseconds = DAILY_LIMIT_HOURS * 60 * 60 * 1000;

      const previousTotalDuration = calculateTotalDuration(todayEntries.filter(t => t.id !== newTimeEntry.id));
      
      if (totalTodayDuration > dailyLimitMilliseconds && previousTotalDuration <= dailyLimitMilliseconds) {
        toast({
          title: "Daily Limit Exceeded",
          description: `You've worked for more than ${DAILY_LIMIT_HOURS} hours today. Time for a break!`,
          variant: "destructive",
        });
      }
    } catch (e) {
      console.error("Error adding time entry: ", e);
      toast({
        title: "Error",
        description: "There was an error saving your time entry. Please try again.",
        variant: "destructive",
      });
    }
  }, [timeEntries, toast, user]);

  const deleteTimeEntry = async (timeEntryId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'timeEntries', timeEntryId));
      toast({
        title: 'Time Entry Deleted',
        description: 'The time entry has been successfully removed.',
      });
    } catch (e) {
      console.error('Error deleting time entry: ', e);
      toast({
        title: 'Error Deleting Entry',
        description: 'There was a problem deleting the time entry. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getProjectById = (id: string) => {
    return projects.find(p => p.id === id);
  }

  const getTimeEntriesByProjectId = (projectId: string) => {
    return timeEntries.filter(t => t.projectId === projectId);
  }

  const openLogTimeDialog = (defaultProjectId?: string) => {
    setLogTimeDialogDefaultProjectId(defaultProjectId);
    setIsLogTimeDialogOpen(true);
  };

  const closeLogTimeDialog = () => {
    setIsLogTimeDialogOpen(false);
    setLogTimeDialogDefaultProjectId(undefined);
  };

  const openLogPracticeDialog = () => {
    setIsLogPracticeDialogOpen(true);
  };

  const closeLogPracticeDialog = () => {
    setIsLogPracticeDialogOpen(false);
  };
  
  const getOrCreatePracticeProject = useCallback(async () => {
    if (!user) return;
    const practiceProject = projects.find(p => p.name === 'Practice' && p.userId === user.uid);
    if (practiceProject) {
      return practiceProject.id;
    }

    // Check firestore just in case
    const q = query(collection(db, 'projects'), where('userId', '==', user.uid), where('name', '==', 'Practice'));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }

    // Create it if it doesn't exist
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        name: 'Practice',
        description: 'Time spent on practice and learning.',
        userId: user.uid,
        createdAt: new Date().toISOString(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error creating practice project:", error);
      toast({
        title: "Error",
        description: "Could not create the internal Practice project. Please try again.",
        variant: "destructive",
      });
    }
  }, [user, projects, toast]);

  const startTimer = (projectId: string, description: string) => {
    if (!timer.running) {
        setTimer({
            running: true,
            startTime: new Date().toISOString(),
            projectId,
            description,
        });
        router.push('/focus');
    }
  };

  const stopTimer = useCallback(async () => {
    if (timer.running && timer.startTime && timer.projectId && timer.description) {
        const endTime = new Date().toISOString();
        await addTimeEntry({
            projectId: timer.projectId,
            description: timer.description,
            startTime: timer.startTime,
            endTime: endTime,
        });
        toast({
            title: "Timer Stopped",
            description: "Your time entry has been logged.",
        });
        setTimer({
            running: false,
            startTime: null,
            projectId: null,
            description: null,
        });
        router.replace('/');
    }
  }, [timer, addTimeEntry, toast, router]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (timer.running && timer.startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const start = new Date(timer.startTime as string);
        setElapsedTime(Math.floor((now.getTime() - start.getTime()) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const value = {
    user,
    loading,
    login,
    logout,
    projects,
    setProjects,
    timeEntries,
    setTimeEntries,
    addProject,
    addTimeEntry,
    deleteTimeEntry,
    getProjectById,
    getTimeEntriesByProjectId,
    isLogTimeDialogOpen,
    openLogTimeDialog,
    closeLogTimeDialog,
    logTimeDialogDefaultProjectId,
    isLogPracticeDialogOpen,
    openLogPracticeDialog,
    closeLogPracticeDialog,
    getOrCreatePracticeProject,
    timer,
    startTimer,
    stopTimer,
    elapsedTime
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
