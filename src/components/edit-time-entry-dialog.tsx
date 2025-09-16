
"use client";

import React, { useEffect, useMemo } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, Edit } from 'lucide-react';
import { format, set, parseISO } from 'date-fns';

import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/contexts/app-context";
import { useToast } from "@/hooks/use-toast";
import type { TimeEntry } from '@/lib/types';

const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/; // HH:mm format

const formSchema = z.object({
  projectId: z.string().min(1, "Please select a project."),
  description: z.string().min(1, "Please describe what you worked on."),
  startDate: z.date({ required_error: "Start date is required." }),
  startTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)."),
  endDate: z.date({ required_error: "End date is required." }),
  endTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)."),
}).refine(data => {
  const startDateTime = set(data.startDate, { hours: parseInt(data.startTime.split(':')[0]), minutes: parseInt(data.startTime.split(':')[1]) });
  const endDateTime = set(data.endDate, { hours: parseInt(data.endTime.split(':')[0]), minutes: parseInt(data.endTime.split(':')[1]) });
  return endDateTime > startDateTime;
}, {
  message: "End date and time must be after start date and time.",
  path: ["endTime"],
});

type EditTimeEntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeEntry: TimeEntry;
};

export function EditTimeEntryDialog({ open, onOpenChange, timeEntry }: EditTimeEntryDialogProps) {
  const { updateTimeEntry, projects } = useAppContext();
  const { toast } = useToast();

  const internalProject = useMemo(() => projects.find(p => p.name === 'Internal Activities'), [projects]);

  const isInternal = timeEntry.projectId === internalProject?.id;

  const [activityType, description] = useMemo(() => {
    if (isInternal) {
      const parts = timeEntry.description.split(': ');
      if (parts.length > 1) {
        return [parts[0], parts.slice(1).join(': ')];
      }
    }
    return [null, timeEntry.description];
  }, [timeEntry.description, isInternal]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: timeEntry.projectId,
      description: description,
      startDate: parseISO(timeEntry.startTime),
      startTime: format(parseISO(timeEntry.startTime), "HH:mm"),
      endDate: parseISO(timeEntry.endTime),
      endTime: format(parseISO(timeEntry.endTime), "HH:mm"),
    },
  });

  useEffect(() => {
    const [newActivityType, newDescription] = isInternal ?
        (timeEntry.description.split(': ').length > 1 ? [timeEntry.description.split(': ')[0], timeEntry.description.split(': ').slice(1).join(': ')] : [null, timeEntry.description])
        : [null, timeEntry.description];

    form.reset({
        projectId: timeEntry.projectId,
        description: newDescription,
        startDate: parseISO(timeEntry.startTime),
        startTime: format(parseISO(timeEntry.startTime), "HH:mm"),
        endDate: parseISO(timeEntry.endTime),
        endTime: format(parseISO(timeEntry.endTime), "HH:mm"),
    });
    // We don't have a field for activityType in the form schema, so we manage it separately
    // but we can set a default value in a state if needed
  }, [timeEntry, form, isInternal]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const startDateTime = set(values.startDate, { hours: parseInt(values.startTime.split(':')[0]), minutes: parseInt(values.startTime.split(':')[1]) });
    const endDateTime = set(values.endDate, { hours: parseInt(values.endTime.split(':')[0]), minutes: parseInt(values.endTime.split(':')[1]) });

    let finalDescription = values.description;
    if (values.projectId === internalProject?.id) {
        const selectedActivityType = (document.querySelector('[name="activityType"]') as HTMLSelectElement)?.value || activityType;
        finalDescription = `${selectedActivityType}: ${values.description}`;
    }

    await updateTimeEntry(timeEntry.id, {
      projectId: values.projectId,
      description: finalDescription,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString()
    });

    const projectName = projects.find(p => p.id === values.projectId)?.name;
    toast({
      title: "Time entry updated",
      description: `Your time entry for "${projectName}" has been successfully updated.`,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'><Edit/> Edit Time Entry</DialogTitle>
          <DialogDescription>
            Make changes to your time entry. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            {isInternal ? (
                <FormItem>
                    <FormLabel>Activity Type</FormLabel>
                    <Select name="activityType" defaultValue={activityType || undefined}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select an activity type" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Practicing">Practicing</SelectItem>
                            <SelectItem value="Checking">Checking</SelectItem>
                        </SelectContent>
                    </Select>
                </FormItem>
            ) : (
                <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {projects.filter(p => p.name !== 'Internal Activities').map(project => (
                            <SelectItem key={project.id} value={project.id}>
                                {project.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isInternal ? 'Description' : 'Work Description'}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={isInternal ? "e.g., Studied database normalization" : "e.g., Implemented the login feature"} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <FormLabel>Start Date</FormLabel>
                  <FormLabel>Start Time</FormLabel>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <Popover>
                          <PopoverTrigger asChild>
                          <FormControl>
                              <Button
                              variant={"outline"}
                              className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                              )}
                              >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                          </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                          />
                          </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <FormLabel>End Date</FormLabel>
                  <FormLabel>End Time</FormLabel>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                      <FormItem>
                          <Popover>
                              <PopoverTrigger asChild>
                              <FormControl>
                                  <Button
                                  variant={"outline"}
                                  className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                  )}
                                  >
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                              </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                              />
                              </PopoverContent>
                          </Popover>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                      <FormItem>
                          <FormControl>
                          <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
