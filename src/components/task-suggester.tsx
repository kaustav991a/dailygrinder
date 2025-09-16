"use client";

import { useState } from 'react';
import { format } from 'date-fns';
import { Lightbulb, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { suggestNextTasks } from '@/ai/flows/suggest-next-tasks';
import type { Project, TimeEntry } from '@/lib/types';

interface TaskSuggesterProps {
  project: Project;
  timeEntries: TimeEntry[];
}

export function TaskSuggester({ project, timeEntries }: TaskSuggesterProps) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<{ suggestedTasks: string[], reasoning: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSuggestTasks = async () => {
    setLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const previousTimeEntries = timeEntries
        .map(entry => `- "${entry.description}" from ${format(new Date(entry.startTime), 'Pp')} to ${format(new Date(entry.endTime), 'Pp')}`)
        .join('\n');
      
      const result = await suggestNextTasks({
        projectDescription: project.description,
        previousTimeEntries: previousTimeEntries || 'No time entries yet.',
      });

      setSuggestion(result);
    } catch (e) {
      console.error(e);
      setError('Failed to get suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intelligent Task Suggester</CardTitle>
        <CardDescription>
          Let AI suggest your next tasks based on the project description and your logged time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-start gap-4">
          <Button onClick={handleSuggestTasks} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
            {loading ? 'Thinking...' : 'Suggest Next Tasks'}
          </Button>

          {suggestion && (
            <Card className="w-full bg-secondary">
              <CardContent className="p-6">
                <h4 className="font-bold mb-2">Suggested Tasks:</h4>
                <ul className="list-disc pl-5 space-y-1 mb-4">
                  {suggestion.suggestedTasks.map((task, index) => (
                    <li key={index}>{task}</li>
                  ))}
                </ul>
                <h4 className="font-bold mb-2">Reasoning:</h4>
                <p className="text-sm text-muted-foreground">{suggestion.reasoning}</p>
              </CardContent>
            </Card>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
