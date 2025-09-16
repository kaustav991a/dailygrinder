"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Timer, Square } from 'lucide-react';
import { useAppContext } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AmbientSoundPlayer } from '@/components/ambient-sound-player';

export default function FocusPage() {
  const { timer, elapsedTime, stopTimer, projects } = useAppContext();
  const router = useRouter();

  // If the timer isn't running, redirect back to the dashboard.
  useEffect(() => {
    if (!timer.running) {
      router.replace('/');
    }
  }, [timer.running, router]);

  const formatElapsedTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const currentProject = projects.find(p => p.id === timer.projectId);

  if (!timer.running) {
    // Render nothing or a loader while redirecting
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <div className="absolute top-4 right-4">
        <AmbientSoundPlayer />
      </div>
      <Card className="w-full max-w-2xl text-center shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-center gap-2 text-primary">
            <Timer className="w-8 h-8" />
            <CardTitle className="text-3xl font-headline">Focus Mode</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <div>
            <p className="text-lg text-muted-foreground">Project</p>
            <h2 className="text-4xl font-semibold">{currentProject?.name || '...'}</h2>
          </div>
          <div>
            <p className="text-lg text-muted-foreground">Current Task</p>
            <h3 className="text-2xl">{timer.description || '...'}</h3>
          </div>
          <div className="font-mono text-8xl font-bold tracking-tighter">
            {formatElapsedTime(elapsedTime)}
          </div>
          <Button size="lg" onClick={stopTimer} className="w-full max-w-xs text-lg py-6">
            <Square className="mr-3 h-6 w-6" />
            Stop & Log Time
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
