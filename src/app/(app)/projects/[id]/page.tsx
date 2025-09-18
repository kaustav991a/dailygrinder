
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Edit, Trash2 } from 'lucide-react';

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
import type { Project } from '@/lib/types';


export default function ProjectPage() {
  const { id } = useParams();
  const router = useRouter();
  const { projects, deleteProject } = useAppContext();
  
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    const foundProject = projects.find(p => p.id === id);
    if(foundProject) {
        setProject(foundProject);
    }
  }, [id, projects]);
  
  if (!project) {
    return <div>Loading project...</div>;
  }

  const handleDelete = async () => {
    await deleteProject(project.id);
    router.push('/');
  }

  return (
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

          <Button variant="outline" className="w-full md:w-auto" disabled>
            <Edit className="mr-2 h-4 w-4" /> Edit Project
          </Button>
          <Button className="w-full md:w-auto" disabled>
            <Plus className="mr-2 h-4 w-4" /> Log Time
          </Button>
        </div>
      </div>
      <div className="border-dashed border-2 border-muted rounded-lg p-8 text-center">
        <p>Project details and time entries will be shown here.</p>
      </div>
    </div>
  );
}
