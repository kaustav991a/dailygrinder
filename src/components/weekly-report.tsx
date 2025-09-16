"use client";

import { useState } from 'react';
import { format, differenceInMilliseconds, subDays, isWithinInterval, parseISO } from 'date-fns';
import { Sparkles, Loader2, CheckCircle, BarChart2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { generateWeeklySummary, type GenerateWeeklySummaryOutput } from '@/ai/flows/generate-weekly-summary';
import { useAppContext } from '@/contexts/app-context';
import { formatDuration } from '@/lib/utils';
import type { TimeEntry } from '@/lib/types';

export function WeeklyReport() {
  const { timeEntries, projects } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<GenerateWeeklySummaryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const now = new Date();
      const oneWeekAgo = subDays(now, 7);

      const weeklyEntries = timeEntries.filter(entry => 
        isWithinInterval(parseISO(entry.startTime), { start: oneWeekAgo, end: now })
      );

      if (weeklyEntries.length === 0) {
        setError("No time entries in the last 7 days to generate a report.");
        setLoading(false);
        return;
      }

      const formattedEntries = weeklyEntries
        .map(entry => {
            const project = projects.find(p => p.id === entry.projectId);
            const duration = formatDuration(differenceInMilliseconds(parseISO(entry.endTime), parseISO(entry.startTime)));
            return `- Project: ${project?.name || 'Unknown'}\n  - Task: "${entry.description}"\n  - Duration: ${duration}\n  - Date: ${format(parseISO(entry.startTime), 'PPP')}`;
        })
        .join('\n');
      
      const result = await generateWeeklySummary({
        timeEntries: formattedEntries,
      });

      setReport(result);
    } catch (e) {
      console.error(e);
      setError('Failed to generate the report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI-Powered Weekly Summary</CardTitle>
        <CardDescription>
          Get an AI-generated summary of your productivity over the last 7 days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-start gap-4">
          <Button onClick={handleGenerateReport} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {loading ? 'Generating...' : 'Generate Weekly Report'}
          </Button>

          {report && (
            <Card className="w-full bg-secondary">
              <CardHeader>
                <CardTitle>Your Weekly Report</CardTitle>
                <CardDescription>{report.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-bold mb-2 flex items-center"><BarChart2 className="mr-2 h-5 w-5 text-primary" />Project Breakdown</h4>
                  <div className="space-y-2">
                    {report.projectBreakdown.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 rounded-md bg-background">
                        <span className="font-semibold">{item.projectName}</span>
                        <span className="text-muted-foreground">{item.hours.toFixed(1)} hours</span>
                      </div>
                    ))}
                  </div>
                   <p className="text-right font-bold mt-2">Total: {report.totalHours.toFixed(1)} hours</p>
                </div>
                <div>
                  <h4 className="font-bold mb-2 flex items-center"><CheckCircle className="mr-2 h-5 w-5 text-green-500" />Key Highlights</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {report.highlights.map((highlight, index) => (
                      <li key={index}>{highlight}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
