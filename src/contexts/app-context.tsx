
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
import type { Project, TimeEntry, Team } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface AppContextType {
  user: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  teams: Team[];
  selectedTeamId: string | null;
  setSelectedTeamId: (teamId: string) => void;
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'userId' | 'teamId' | 'createdAt'> & { createdAt?: string }) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  isCreateProjectDialogOpen: boolean;
  setIsCreateProjectDialogOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const auth = getAuth(app);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamIdState] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const router = useRouter();

  const setSelectedTeamId = (teamId: string) => {
    setSelectedTeamIdState(teamId);
    localStorage.setItem('selectedTeamId', teamId);
  };
  
  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (!firebaseUser) {
        setTeams([]);
        setProjects([]);
        setSelectedTeamIdState(null);
        localStorage.removeItem('selectedTeamId');
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Fetch user's teams
  useEffect(() => {
    if (!user) return;
  
    const teamsQuery = query(collection(db, 'teams'), where('memberIds', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(teamsQuery, async (snapshot) => {
      if (snapshot.empty) {
        // Create a default team if user has none
        const defaultTeamName = `${user.email?.split('@')[0] || 'My'}'s Team`;
        try {
          const docRef = await addDoc(collection(db, 'teams'), {
            name: defaultTeamName,
            ownerId: user.uid,
            memberIds: [user.uid],
          });
          const newTeam = { id: docRef.id, name: defaultTeamName, ownerId: user.uid, memberIds: [user.uid] };
          setTeams([newTeam]);
          setSelectedTeamId(docRef.id);
        } catch (error) {
          console.error("Error creating default team: ", error);
          toast({ title: "Error", description: "Could not create a default team.", variant: "destructive" });
        }
      } else {
        const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        setTeams(teamsData);
        
        const storedTeamId = localStorage.getItem('selectedTeamId');
        const isValidStoredTeam = teamsData.some(team => team.id === storedTeamId);

        if (isValidStoredTeam) {
          setSelectedTeamIdState(storedTeamId);
        } else if (teamsData.length > 0) {
          setSelectedTeamId(teamsData[0].id);
        }
      }
    }, (error) => {
      console.error("Error fetching teams: ", error);
      toast({ title: "Error fetching teams", description: error.message, variant: "destructive" });
    });
  
    return () => unsubscribe();
  }, [user, toast]);

  // Fetch projects for the selected team
  useEffect(() => {
    if (!selectedTeamId || !user) {
      setProjects([]);
      return;
    };
  
    const projectsQuery = query(
      collection(db, 'projects'), 
      where('teamId', '==', selectedTeamId),
      where('userId', '==', user.uid) // Ensure user only sees their projects within a team
    );

    const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
        const projectsData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Project));
        setProjects(projectsData);
    }, (error) => {
      console.error("Error fetching projects: ", error);
      toast({ title: "Error fetching projects", description: error.message, variant: "destructive" });
    });
  
    return () => unsubscribe();
  }, [selectedTeamId, user, toast]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };
  
  const logout = async () => {
    await signOut(auth);
  };
  
  const addProject = async (project: Omit<Project, 'id' | 'userId' | 'teamId' | 'createdAt'> & { createdAt?: string }) => {
    if (!user || !selectedTeamId) {
        toast({ title: "Error", description: "You must be logged in and have a team selected to add a project.", variant: "destructive" });
        return;
    }
    try {
      await addDoc(collection(db, 'projects'), {
        ...project,
        userId: user.uid,
        teamId: selectedTeamId,
        createdAt: project.createdAt || new Date().toISOString()
      });
      toast({ title: "Project Created", description: `"${project.name}" has been successfully created.`});
      setIsCreateProjectDialogOpen(false);
    } catch (e) {
      console.error("Error adding document: ", e);
      toast({ title: "Error", description: "There was an error saving your project.", variant: "destructive" });
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!user) return;
    try {
        const batch = writeBatch(db);

        // 1. Delete the project itself
        const projectRef = doc(db, 'projects', projectId);
        batch.delete(projectRef);

        // 2. Find and delete all associated time entries
        const timeEntriesQuery = query(collection(db, 'timeEntries'), where('projectId', '==', projectId));
        const timeEntriesSnapshot = await getDocs(timeEntriesQuery);
        timeEntriesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Commit the batch
        await batch.commit();

        toast({
            title: 'Project Deleted',
            description: 'The project and all its time entries have been successfully removed.',
        });
        router.push('/');
    } catch (e) {
        console.error('Error deleting project: ', e);
        toast({
            title: 'Error Deleting Project',
            description: 'There was a problem deleting the project. Please try again.',
            variant: 'destructive',
        });
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    teams,
    selectedTeamId,
    setSelectedTeamId,
    projects,
    addProject,
    deleteProject,
    isCreateProjectDialogOpen,
    setIsCreateProjectDialogOpen,
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
