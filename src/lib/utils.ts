import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { intervalToDuration, formatDuration as formatDurationFns } from 'date-fns';
import type { TimeEntry } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return '0s';
  }
  const duration = intervalToDuration({ start: 0, end: milliseconds });
  return formatDurationFns(duration, {
    format: ['hours', 'minutes', 'seconds'],
    zero: false,
    delimiter: ' ',
  }).replace(/ (hour|minute|second)s?/g, (match, p1) => p1.charAt(0));
}

export function formatDurationForExport(milliseconds: number): string {
    if (milliseconds < 1000) {
      return '0 mins';
    }
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
  
    if (hours > 0) {
      return `${hours}hr ${minutes} min`;
    }
    return `${minutes} mins`;
}

export function calculateTotalDuration(timeEntries: TimeEntry[]): number {
  return timeEntries.reduce((total, entry) => {
    const start = new Date(entry.startTime);
    const end = new Date(entry.endTime);
    return total + (end.getTime() - start.getTime());
  }, 0);
}
