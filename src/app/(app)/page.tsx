
"use client";

import { useState, useEffect } from 'react';
import { differenceInMilliseconds, isToday, parseISO, format as formatDate, startOfToday, isSameDay } from 'date-fns';
import { Plus, Download, Trash2, Calendar as CalendarIcon, BookOpen } from 'lucide-react';
import { Bar, BarChart, XAxis, YAxis, Tooltip } from 'recharts';

import { useAppContext } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateTotalDuration, formatDurationForExport, cn } from '@/lib/utils';
import type { TimeEntry } from '@/lib/types';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { WeeklyReport } from '@/components/weekly-report';


const chartConfig = {
  duration: {
    label: 'Duration',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { projects, timeEntries, openLogTimeDialog, user, deleteTimeEntry, openLogPracticeDialog } = useAppContext();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    setIsClient(true);
  }, []);

  const selectedDayEntries = isClient 
    ? timeEntries
        .filter(entry => entry.startTime && isSameDay(parseISO(entry.startTime), selectedDate))
        .sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()) 
    : [];

  const totalSelectedDayDurationMs = calculateTotalDuration(selectedDayEntries);

  const formatTotalDuration = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const projectTimeData = isClient ? projects.map(project => {
    const projectEntries = selectedDayEntries.filter(entry => entry.projectId === project.id);
    const duration = projectEntries.reduce((acc, entry) => {
      if (!entry.startTime || !entry.endTime) return acc;
      return acc + differenceInMilliseconds(parseISO(entry.endTime), parseISO(entry.startTime));
    }, 0);
    return {
      name: project.name,
      duration: duration / (1000 * 60), // in minutes
    };
  }).filter(p => p.duration > 0) : [];

  const handleExport = () => {
    if (timeEntries.length === 0) {
      toast({
        title: 'No Time Entries to Export',
        description: 'You must have at least one time entry to export.',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Project Name', 'Date', 'Task Description', 'Duration'];
    const sortedEntries = [...timeEntries].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    const csvRows = [
      headers.join(','),
      ...sortedEntries.map(entry => {
        const project = projects.find(p => p.id === entry.projectId);
        if (!entry.startTime || !entry.endTime) return '';
        const durationMs = differenceInMilliseconds(parseISO(entry.endTime), parseISO(entry.startTime));
        const formattedDuration = formatDurationForExport(durationMs);
        const date = formatDate(parseISO(entry.startTime), 'yyyy-MM-dd');
        
        return [
            `"${project ? project.name.replace(/"/g, '""') : 'Unknown Project'}"`, 
            date,
            `"${entry.description.replace(/"/g, '""')}"`,
            `"${formattedDuration}"`
        ].join(',')
      }).filter(Boolean)
    ];
    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'time_entries.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: 'Time Entries Exported',
      description: 'Your time entries have been successfully exported to time_entries.csv.',
    });
  };

  const userName = user?.email?.split('@')[0].split('.')[0].toUpperCase() || 'there';

  const getDateDescription = () => {
    if (isToday(selectedDate)) return "today";
    return `on ${formatDate(selectedDate, 'PPP')}`;
  }

  if (!isClient || !user) {
    return null;
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline">Welcome {userName}</h1>
            <p className="text-muted-foreground">Here's a summary of your grind {getDateDescription()}.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={"outline"}
                    className={cn(
                        "w-full md:w-[240px] justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                    )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? formatDate(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    />
                </PopoverContent>
            </Popover>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Button onClick={handleExport} disabled={timeEntries.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Export
                </Button>
                <Button onClick={() => openLogPracticeDialog()}>
                    <BookOpen className="mr-2 h-4 w-4" /> Practice
                </Button>
                <Button onClick={() => openLogTimeDialog()}>
                    <Plus className="mr-2 h-4 w-4" /> Log Time
                </Button>
            </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total for {formatDate(selectedDate, 'MMMM d')}</CardTitle>
          <CardDescription>Total time you've logged on this day.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{formatTotalDuration(totalSelectedDayDurationMs)}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Daily Breakdown</CardTitle>
            <CardDescription>Time spent per project on {formatDate(selectedDate, 'PPP')}.</CardDescription>
        </CardHeader>
        <CardContent>
            {projectTimeData.length > 0 ? (
                 <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                    <BarChart accessibilityLayer data={projectTimeData}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}m`} />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--secondary))' }}
                            content={<ChartTooltipContent
                                formatter={(value, name, item) => (
                                    <div className="flex flex-col">
                                        <span className="font-bold">{item.payload.name}</span>
                                        <span>{Math.round(Number(value))} minutes</span>
                                    </div>
                                )}
                            />}
                         />
                        <Bar dataKey="duration" fill="var(--color-duration)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ChartContainer>
            ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <p>No time logged on this day.</p>
                </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity on {formatDate(selectedDate, 'MMMM d')}</CardTitle>
          <CardDescription>Your time entries for the selected day.</CardDescription>
        </CardHeader>
        <CardContent>
          {selectedDayEntries.length > 0 ? (
            <div className="space-y-4">
              {selectedDayEntries.map((entry: TimeEntry) => {
                const project = projects.find(p => p.id === entry.projectId);
                if (!entry.startTime || !entry.endTime) return null;
                return (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                    <div>
                      <p className="font-semibold">{entry.description}</p>
                      <p className="text-sm text-muted-foreground">{project?.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-right">
                            {formatTotalDuration(differenceInMilliseconds(parseISO(entry.endTime), parseISO(entry.startTime)))}
                        </div>
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
            <p className="text-sm text-muted-foreground">No entries logged for this day.</p>
          )}
        </CardContent>
      </Card>
      
      <WeeklyReport />

    </div>
    </>
  );
}
