
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Edit2 } from 'lucide-react';
import { differenceInMilliseconds, parseISO } from 'date-fns';

import { useAppContext } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
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
import type { Project, TimeEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatTotalDuration } from '@/lib/utils';
import { TaskSuggester } from '@/components/task-suggester';
import { EditProjectDialog } from '@/components/edit-project-dialog';
import { LogTimeDialog } from '@/components/log-time-dialog';


export default function ProjectPage() {
  const { id } = useParams();
  const router = useRouter();
  const { 
    projects, 
    deleteProject,
    timeEntries,
    openEditProjectDialog,
    closeEditProjectDialog,
    isEditProjectDialogOpen,
    editingProject,
    openLogTimeDialog,
    closeLogTimeDialog,
    isLogTimeDialogOpen,
    logTimeDialogDefaultProjectId,
    deleteTimeEntry,
    openEditTimeEntryDialog
  } = useAppContext();
  
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    const foundProject = projects.find(p => p.id === id);
    if(foundProject) {
        setProject(foundProject);
    }
  }, [id, projects]);
  
  const projectTimeEntries = useMemo(() => {
    if (!project) return [];
    return timeEntries
      .filter(entry => entry.projectId === project.id)
      .sort((a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime());
  }, [project, timeEntries]);

  if (!project) {
    return <div>Loading project...</div>;
  }

  const handleDelete = async () => {
    await deleteProject(project.id);
    router.push('/');
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
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full md:w-auto">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Project
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the project and all of its associated time entries.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

          <Button variant="outline" className="w-full md:w-auto" onClick={() => openEditProjectDialog(project)}>
            <Edit className="mr-2 h-4 w-4" /> Edit Project
          </Button>
          <Button className="w-full md:w-auto" onClick={() => openLogTimeDialog(project.id)}>
            <Plus className="mr-2 h-4 w-4" /> Log Time
          </Button>
        </div>
      </div>

      <TaskSuggester project={project} timeEntries={projectTimeEntries} />
      
      <Card>
        <CardHeader>
          <CardTitle>Time Entries</CardTitle>
          <CardDescription>All time logged for {project.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          {projectTimeEntries.length > 0 ? (
            <div className="space-y-4">
              {projectTimeEntries.map((entry: TimeEntry) => {
                if (!entry.startTime || !entry.endTime) return null;
                return (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                    <div>
                      <p className="font-semibold">{entry.description}</p>
                      <p className="text-sm text-muted-foreground">{new Date(entry.startTime).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-right">
                            {formatTotalDuration(differenceInMilliseconds(parseISO(entry.endTime), parseISO(entry.startTime)))}
                        </div>
                         <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTimeEntryDialog(entry)}>
                          <Edit2 className="h-4 w-4" />
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
                );
              })}
            </div>
          ) : (
            <div className="border-dashed border-2 border-muted rounded-lg p-8 text-center">
                <p>No time entries yet for this project.</p>
                <Button variant="link" onClick={() => openLogTimeDialog(project.id)}>Log your first entry!</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    
    {editingProject && (
        <EditProjectDialog
            open={isEditProjectDialogOpen}
            onOpenChange={closeEditProjectDialog}
            project={editingProject}
        />
    )}
    
    <LogTimeDialog
        open={isLogTimeDialogOpen}
        onOpenChange={closeLogTimeDialog}
        defaultProjectId={logTimeDialogDefaultProjectId}
    />
    </>
  );
}

