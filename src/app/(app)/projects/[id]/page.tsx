
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { differenceInMilliseconds, format } from 'date-fns';
import { Plus, Edit, Trash2 } from 'lucide-react';

import { useAppContext } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDuration } from '@/lib/utils';
import type { TimeEntry } from '@/lib/types';
import { TaskSuggester } from '@/components/task-suggester';
import { EditTimeEntryDialog } from '@/components/edit-time-entry-dialog';
import { EditProjectDialog } from '@/components/edit-project-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ProjectPage() {
  const { id } = useParams();
  const router = useRouter();
  const { 
    getProjectById, 
    getTimeEntriesByProjectId, 
    openLogTimeDialog, 
    deleteTimeEntry,
    openEditTimeEntryDialog,
    closeEditTimeEntryDialog,
    isEditTimeEntryDialogOpen,
    editingTimeEntry
  } = useAppContext();
  
  const [isClient, setIsClient] = useState(false);
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);
  useEffect(() => { setIsClient(true) }, []);

  const projectId = Array.isArray(id) ? id[0] : id;
  const project = getProjectById(projectId);
  const timeEntries = getTimeEntriesByProjectId(projectId);

  const totalDuration = timeEntries.reduce((acc, entry) => {
    return acc + differenceInMilliseconds(new Date(entry.endTime), new Date(entry.startTime));
  }, 0);

  if (!isClient) {
      return null;
  }
  
  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">{project.name}</h1>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={() => setIsEditProjectDialogOpen(true)} className="w-full md:w-auto">
            <Edit className="mr-2 h-4 w-4" /> Edit Project
          </Button>
          <Button onClick={() => openLogTimeDialog(project.id)} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Log Time
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total Time Tracked</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{formatDuration(totalDuration)}</p>
        </CardContent>
      </Card>
      
      <TaskSuggester project={project} timeEntries={timeEntries} />

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest time entries for this project.</CardDescription>
        </CardHeader>
        <CardContent>
          {timeEntries.length > 0 ? (
            <div className="space-y-4">
              {timeEntries.sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).map((entry: TimeEntry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div>
                    <p className="font-semibold">{entry.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(entry.startTime), 'MMM d, yyyy, h:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">
                      {formatDuration(differenceInMilliseconds(new Date(entry.endTime), new Date(entry.startTime)))}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTimeEntryDialog(entry)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this time entry.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTimeEntry(entry.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No time has been logged for this project yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
    {editingTimeEntry && (
        <EditTimeEntryDialog
            open={isEditTimeEntryDialogOpen}
            onOpenChange={closeEditTimeEntryDialog}
            timeEntry={editingTimeEntry}
        />
    )}
    {project && (
      <EditProjectDialog
        open={isEditProjectDialogOpen}
        onOpenChange={setIsEditProjectDialogOpen}
        project={project}
      />
    )}
    </>
  );
}
