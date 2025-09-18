
import type { User as FirebaseUser } from 'firebase/auth';

// This exports the FirebaseUser type as User for convenience
export type User = FirebaseUser;

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
}

export interface Project {
  id: string;
  userId: string;
  teamId: string;
  name: string;
  description: string;
  createdAt: string; // ISO 8601 format
}

export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string;
  description: string;
  startTime: string; // ISO 8601 format
  endTime: string;   // ISO 8601 format
}
