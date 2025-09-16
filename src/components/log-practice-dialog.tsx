
"use client";

import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, Play, BookOpen } from 'lucide-react';
import { format, set } from 'date-fns';

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
  Form,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppContext } from "@/contexts/app-context";
import { useToast } from "@/hooks/use-toast";

const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/; // HH:mm format

const manualFormSchema = z.object({
  activityType: z.string().min(1, "Please select an activity type."),
  description: z.string().min(1, "Please describe what you did."),
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

const timerFormSchema = z.object({
  activityType: z.string().min(1, "Please select an activity type."),
  description: z.string().min(1, "Please describe what you are doing."),
});

type LogPracticeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DialogFormContext = React.createContext<{ onOpenChange: (open: boolean) => void; } | null>(null);

function useDialogFormContext() {
  const context = React.useContext(DialogFormContext);
  if (!context) {
    throw new Error('useDialogFormContext must be used within a DialogFormContext.Provider');
  }
  return context;
}

function ManualPracticeForm() {
  const { addTimeEntry, getOrCreateInternalActivitiesProject } = useAppContext();
  const { toast } = useToast();
  const { control, handleSubmit, reset } = useFormContext<z.infer<typeof manualFormSchema>>();
  const { onOpenChange } = useDialogFormContext();

  async function onSubmit(values: z.infer<typeof manualFormSchema>) {
    const internalProjectId = await getOrCreateInternalActivitiesProject();
    if (!internalProjectId) return;

    const startDateTime = set(values.startDate, { hours: parseInt(values.startTime.split(':')[0]), minutes: parseInt(values.startTime.split(':')[1]) });
    const endDateTime = set(values.endDate, { hours: parseInt(values.endTime.split(':')[0]), minutes: parseInt(values.endTime.split(':')[1]) });

    const fullDescription = `${values.activityType}: ${values.description}`;

    await addTimeEntry({
      projectId: internalProjectId,
      description: fullDescription,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString()
    });

    toast({
      title: "Activity logged",
      description: `Your internal activity has been successfully logged.`,
    });
    reset({
        activityType: "Practicing",
        description: "",
        startDate: new Date(),
        startTime: format(new Date(), "HH:mm"),
        endDate: new Date(),
        endTime: format(new Date(), "HH:mm"),
      });
    onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <SharedActivityFields control={control} />
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <FormLabel>Start Date</FormLabel>
            <FormLabel>Start Time</FormLabel>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
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
            control={control}
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
                control={control}
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
                control={control}
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
        <Button type="submit">Log Activity</Button>
      </DialogFooter>
    </form>
  )
}

function TimerPracticeForm() {
    const { startTimer, timer, getOrCreateInternalActivitiesProject } = useAppContext();
    const { handleSubmit, watch, control } = useFormContext<z.infer<typeof timerFormSchema>>();
    const { onOpenChange } = useDialogFormContext();

    const values = watch();

    const handleStartTimer = async () => {
        const internalProjectId = await getOrCreateInternalActivitiesProject();
        if (!internalProjectId) return;
        const fullDescription = `${values.activityType}: ${values.description}`;
        startTimer(internalProjectId, fullDescription);
        onOpenChange(false);
    };

    return (
        <form onSubmit={handleSubmit(handleStartTimer)} className="space-y-4 pt-4">
            <SharedActivityFields control={control} />
            <DialogFooter>
                <Button type="submit" disabled={timer.running}>
                    <Play className="mr-2" />
                    {timer.running ? 'Timer is already running' : 'Start Timer'}
                </Button>
            </DialogFooter>
        </form>
    );
}

const SharedActivityFields = ({ control }: { control: any }) => {
  return (
    <>
      <FormField
        control={control}
        name="activityType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Activity Type</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
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
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea placeholder="e.g., Studied database normalization, Checked team emails" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

export function LogPracticeDialog({ open, onOpenChange }: LogPracticeDialogProps) {
  const [activeTab, setActiveTab] = React.useState("timer");

  const manualForm = useForm<z.infer<typeof manualFormSchema>>({
    resolver: zodResolver(manualFormSchema),
    defaultValues: {
      activityType: "Practicing",
      description: "",
      startDate: new Date(),
      startTime: format(new Date(), "HH:mm"),
      endDate: new Date(),
      endTime: format(new Date(), "HH:mm"),
    },
  });

  const timerForm = useForm<z.infer<typeof timerFormSchema>>({
    resolver: zodResolver(timerFormSchema),
    defaultValues: {
      activityType: "Practicing",
      description: "",
    },
  });
  
  React.useEffect(() => {
    if (open) {
      const now = new Date();
      manualForm.reset({
        activityType: "Practicing",
        description: "",
        startDate: now,
        startTime: format(now, "HH:mm"),
        endDate: now,
        endTime: format(now, "HH:mm"),
      });
      timerForm.reset({
        activityType: "Practicing",
        description: "",
      })
    }
  }, [open, manualForm, timerForm]);
  
  const dialogFormContextValue = { onOpenChange };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BookOpen /> Log Internal Activity</DialogTitle>
          <DialogDescription>
            Track time spent on non-project activities like learning or admin tasks.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="timer">Timer</TabsTrigger>
                <TabsTrigger value="manual">Manual</TabsTrigger>
            </TabsList>
            <TabsContent value="timer">
                <DialogFormContext.Provider value={dialogFormContextValue}>
                    <FormProvider {...timerForm}>
                        <TimerPracticeForm />
                    </FormProvider>
                </DialogFormContext.Provider>
            </TabsContent>
            <TabsContent value="manual">
                 <DialogFormContext.Provider value={dialogFormContextValue}>
                    <FormProvider {...manualForm}>
                        <ManualPracticeForm />
                    </FormProvider>
                </DialogFormContext.Provider>
            </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
