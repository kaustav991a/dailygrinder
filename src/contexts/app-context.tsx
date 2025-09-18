
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
  doc,
  updateDoc,
  writeBatch
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

interface AppContextType {
  user: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'userId' | 'createdAt'> & { createdAt?: string }) => Promise<void>;
  updateProject: (projectId: string, project: Partial<Omit<Project, 'id'>>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  isCreateProjectDialogOpen: boolean;
  openCreateProjectDialog: () => void;
  closeCreateProjectDialog: () => void;
  isEditProjectDialogOpen: boolean;
  openEditProjectDialog: (project: Project) => void;
  closeEditProjectDialog: () => void;
  editingProject: Project | null;
  timeEntries: TimeEntry[];
  addTimeEntry: (timeEntry: Omit<TimeEntry, 'id' | 'userId'>) => Promise<void>;
  deleteTimeEntry: (timeEntryId: string) => Promise<void>;
  updateTimeEntry: (timeEntryId: string, timeEntry: Partial<Omit<TimeEntry, 'id'>>) => Promise<void>;
  isEditTimeEntryDialogOpen: boolean;
  openEditTimeEntryDialog: (timeEntry: TimeEntry) => void;
  closeEditTimeEntryDialog: () => void;
  editingTimeEntry: TimeEntry | null;
  timer: {
    running: boolean;
    projectId: string | null;
    description: string;
  };
  elapsedTime: number;
  startTimer: (projectId: string, description: string) => void;
  stopTimer: () => void;
  openLogTimeDialog: (projectId?: string) => void;
  closeLogTimeDialog: () => void;
  isLogTimeDialogOpen: boolean;
  logTimeDialogDefaultProjectId?: string;
  openLogPracticeDialog: () => void;
  closeLogPracticeDialog: () => void;
  isLogPracticeDialogOpen: boolean;
  getOrCreateInternalActivitiesProject: () => Promise<string | null>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const auth = getAuth(app);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false);
  const [logTimeDialogDefaultProjectId, setLogTimeDialogDefaultProjectId] = useState<string | undefined>();

  const [isLogPracticeDialogOpen, setIsLogPracticeDialogOpen] = useState(false);

  const [isEditTimeEntryDialogOpen, setIsEditTimeEntryDialogOpen] = useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = useState<TimeEntry | null>(null);

  const [timer, setTimer] = useState({ running: false, projectId: null, description: '' });
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const { toast } = useToast();
  const router = useRouter();

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timer.running && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
      }, 1000);
    } else if (!timer.running) {
      if (interval) clearInterval(interval);
      setElapsedTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer.running, startTime]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (!firebaseUser) {
        setProjects([]);
        setTimeEntries([]);
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Fetch projects and time entries for the user
  useEffect(() => {
    if (!user) {
        setProjects([]);
        setTimeEntries([]);
        return;
    };
  
    const projectsQuery = query(collection(db, 'projects'), where('userId', '==', user.uid));
    const projectsUnsubscribe = onSnapshot(projectsQuery, (snapshot) => {
        const projectsData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Project));
        setProjects(projectsData);
    }, (error) => {
      console.error("Error fetching projects: ", error);
      toast({ title: "Error fetching projects", description: error.message, variant: "destructive" });
    });

    const timeEntriesQuery = query(collection(db, 'timeEntries'), where('userId', '==', user.uid));
    const timeEntriesUnsubscribe = onSnapshot(timeEntriesQuery, (snapshot) => {
        const entriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeEntry));
        setTimeEntries(entriesData);
    }, (error) => {
        console.error("Error fetching time entries: ", error);
        toast({ title: "Error fetching time entries", description: error.message, variant: "destructive" });
    });
  
    return () => {
        projectsUnsubscribe();
        timeEntriesUnsubscribe();
    };
  }, [user, toast]);

  // --- Auth ---
  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };
  
  const logout = async () => {
    await signOut(auth);
  };
  
  // --- Projects ---
  const addProject = async (project: Omit<Project, 'id' | 'userId' | 'createdAt'> & { createdAt?: string }) => {
    if (!user) {
        toast({ title: "Error", description: "You must be logged in to add a project.", variant: "destructive" });
        return;
    }
    try {
      await addDoc(collection(db, 'projects'), {
        ...project,
        userId: user.uid,
        createdAt: project.createdAt || new Date().toISOString()
      });
    } catch (e) {
      console.error("Error adding document: ", e);
      toast({ title: "Error", description: "There was an error saving your project.", variant: "destructive" });
    }
  };

  const updateProject = async (projectId: string, project: Partial<Omit<Project, 'id'>>) => {
    if (!user) return;
    try {
        const projectRef = doc(db, 'projects', projectId);
        await updateDoc(projectRef, project);
    } catch (e) {
        console.error("Error updating project: ", e);
        toast({ title: "Error", description: "There was an error updating your project.", variant: "destructive" });
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!user) return;
    try {
        const batch = writeBatch(db);
        const projectRef = doc(db, 'projects', projectId);
        batch.delete(projectRef);

        const timeEntriesQuery = query(collection(db, 'timeEntries'), where('projectId', '==', projectId), where('userId', '==', user.uid));
        const timeEntriesSnapshot = await getDocs(timeEntriesQuery);
        timeEntriesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        toast({
            title: 'Project Deleted',
            description: 'The project and all its time entries have been successfully removed.',
        });
    } catch (e) {
        console.error('Error deleting project: ', e);
        toast({
            title: 'Error Deleting Project',
            description: 'There was a problem deleting the project. Please try again.',
            variant: 'destructive',
        });
    }
  };

  // --- Time Entries ---
  const addTimeEntry = async (timeEntry: Omit<TimeEntry, 'id' | 'userId'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'timeEntries'), {
        ...timeEntry,
        userId: user.uid,
      });
    } catch (e) {
      console.error('Error adding time entry: ', e);
      toast({ title: "Error logging time", description: "There was an error saving your time entry.", variant: "destructive" });
    }
  };

  const deleteTimeEntry = async (timeEntryId: string) => {
    if (!user) return;
    try {
        await deleteDoc(doc(db, 'timeEntries', timeEntryId));
        toast({ title: "Time entry deleted", description: "Your time entry has been successfully deleted." });
    } catch (e) {
        console.error('Error deleting time entry: ', e);
        toast({ title: "Error deleting time entry", description: "There was an error deleting your time entry.", variant: "destructive" });
    }
  };

  const updateTimeEntry = async (timeEntryId: string, timeEntry: Partial<Omit<TimeEntry, 'id'>>) => {
      if (!user) return;
      try {
          const timeEntryRef = doc(db, 'timeEntries', timeEntryId);
          await updateDoc(timeEntryRef, timeEntry);
      } catch(e) {
          console.error("Error updating time entry: ", e);
          toast({ title: "Error", description: "There was an error updating your time entry.", variant: "destructive" });
      }
  };


  // --- Dialogs ---
  const openCreateProjectDialog = () => setIsCreateProjectDialogOpen(true);
  const closeCreateProjectDialog = () => setIsCreateProjectDialogOpen(false);
  
  const openEditProjectDialog = (project: Project) => {
    setEditingProject(project);
    setIsEditProjectDialogOpen(true);
  };
  const closeEditProjectDialog = () => {
    setIsEditProjectDialogOpen(false);
    setEditingProject(null);
  };
  
  const openLogTimeDialog = (projectId?: string) => {
    setLogTimeDialogDefaultProjectId(projectId);
    setIsLogTimeDialogOpen(true);
  };
  const closeLogTimeDialog = () => setIsLogTimeDialogOpen(false);

  const openLogPracticeDialog = () => setIsLogPracticeDialogOpen(true);
  const closeLogPracticeDialog = () => setIsLogPracticeDialogOpen(false);
  
  const openEditTimeEntryDialog = (timeEntry: TimeEntry) => {
    setEditingTimeEntry(timeEntry);
    setIsEditTimeEntryDialogOpen(true);
  };
  const closeEditTimeEntryDialog = () => {
    setEditingTimeEntry(null);
    setIsEditTimeEntryDialogOpen(false);
  };

  // --- Timer ---
  const startTimer = (projectId: string, description: string) => {
    if (timer.running) {
      toast({ title: "Timer is already active", description: "You must stop the current timer before starting a new one.", variant: "destructive" });
      return;
    }
    setTimer({ running: true, projectId, description });
    setStartTime(new Date());
    router.push('/focus');
  };

  const stopTimer = () => {
    if (!timer.running || !startTime || !timer.projectId) return;

    const endTime = new Date();
    const newTimeEntry = {
      projectId: timer.projectId,
      description: timer.description,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };

    addTimeEntry(newTimeEntry);
    
    toast({
        title: "Time Logged",
        description: `Your session for "${projects.find(p => p.id === timer.projectId)?.name}" has been logged.`,
    });

    setTimer({ running: false, projectId: null, description: '' });
    setStartTime(null);
    setElapsedTime(0);
  };

  // --- Internal Activities Project ---
  const getOrCreateInternalActivitiesProject = async (): Promise<string | null> => {
    if (!user) return null;

    const internalProjectName = 'Internal Activities';
    let internalProject = projects.find(p => p.name === internalProjectName);

    if (internalProject) {
        return internalProject.id;
    }

    try {
        const q = query(collection(db, 'projects'), where('name', '==', internalProjectName), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].id;
        } else {
            const docRef = await addDoc(collection(db, 'projects'), {
                name: internalProjectName,
                description: "Tracks non-project work like practice, learning, and administrative tasks.",
                userId: user.uid,
                createdAt: new Date().toISOString()
            });
            return docRef.id;
        }
    } catch (e) {
        console.error("Error getting or creating internal activities project: ", e);
        toast({ title: "Error", description: "Could not get or create the internal activities project.", variant: "destructive" });
        return null;
    }
  };


  const value: AppContextType = {
    user,
    loading,
    login,
    logout,
    projects,
    addProject,
    updateProject,
    deleteProject,
    isCreateProjectDialogOpen,
    openCreateProjectDialog,
    closeCreateProjectDialog,
    isEditProjectDialogOpen,
    openEditProjectDialog,
    closeEditProjectDialog,
    editingProject,
    timeEntries,
    addTimeEntry,
    deleteTimeEntry,
    updateTimeEntry,
    isEditTimeEntryDialogOpen,
    openEditTimeEntryDialog,
    closeEditTimeEntryDialog,
    editingTimeEntry,
    timer,
    elapsedTime,
    startTimer,
    stopTimer,
    openLogTimeDialog,
    closeLogTimeDialog,
    isLogTimeDialogOpen,
    logTimeDialogDefaultProjectId,
    openLogPracticeDialog,
    closeLogPracticeDialog,
    isLogPracticeDialogOpen,
    getOrCreateInternalActivitiesProject
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
