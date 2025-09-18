

"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PlusCircle, LayoutDashboard, Timer, Square, LogOut } from "lucide-react";
import { format, isToday, isYesterday, parseISO, compareDesc, startOfDay } from 'date-fns';

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarFooter,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAppContext } from "@/contexts/app-context";
import { Logo } from "@/components/icons";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { LogTimeDialog } from "@/components/log-time-dialog";
import { LogPracticeDialog } from "@/components/log-practice-dialog";
import type { Project, TimeEntry } from "@/lib/types";

const groupProjectsByActivityDate = (projects: Project[], timeEntries: TimeEntry[]) => {
  const projectMap = new Map<string, Project>(projects.map(p => [p.id, p]));
  const groups: Record<string, Set<Project>> = {};
  
  // Get all unique project IDs from time entries
  const activeProjectIds = new Set(timeEntries.map(entry => entry.projectId));
  
  // Initialize groups with projects that have no time entries under a 'No Activity' group
  // or handle them as you see fit. For now, we only show projects with activity.

  timeEntries.forEach(entry => {
      if (projectMap.get(entry.projectId)?.name === "Internal Activities") return;
      
      const activityDate = parseISO(entry.startTime);
      let groupLabel: string;
  
      if (isToday(activityDate)) {
          groupLabel = "Today";
      } else if (isYesterday(activityDate)) {
          groupLabel = "Yesterday";
      } else {
          groupLabel = format(activityDate, 'MMMM d, yyyy');
      }
  
      if (!groups[groupLabel]) {
          groups[groupLabel] = new Set();
      }
  
      const project = projectMap.get(entry.projectId);
      if (project) {
          groups[groupLabel].add(project);
      }
  });

  return Object.entries(groups)
    .map(([label, projectSet]) => ({
      label,
      projects: Array.from(projectSet).sort((a, b) => a.name.localeCompare(b.name))
    }))
    .sort((a, b) => {
        const dateA = a.label === 'Today' ? startOfDay(new Date()) : a.label === 'Yesterday' ? startOfDay(new Date(Date.now() - 86400000)) : new Date(a.label);
        const dateB = b.label === 'Today' ? startOfDay(new Date()) : b.label === 'Yesterday' ? startOfDay(new Date(Date.now() - 86400000)) : new Date(b.label);
        return compareDesc(dateA, dateB);
    });
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { 
    projects, 
    timeEntries,
    isLogTimeDialogOpen, 
    closeLogTimeDialog, 
    logTimeDialogDefaultProjectId,
    isLogPracticeDialogOpen,
    closeLogPracticeDialog,
    timer,
    stopTimer,
    elapsedTime,
    user,
    loading,
    logout
  } = useAppContext();
  const pathname = usePathname();
  const router = useRouter();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const groupedProjects = useMemo(() => {
    if (!isClient) return [];
    return groupProjectsByActivityDate(projects, timeEntries);
  }, [projects, timeEntries, isClient]);

  const formatElapsedTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // Hide layout for focus mode
  if (pathname === '/focus') {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader 
            className="flex-row items-center justify-between px-4 py-3 border-b"
            style={{ height: '65px' }}
        >
          <Link href="/" className="flex items-center gap-2">
            <Logo className="w-8 h-8 text-primary" />
            <span className="text-lg font-semibold font-headline">Daily Grind</span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu className="pt-2 px-2">
            <SidebarMenuItem>
              <Link href="/">
                <SidebarMenuButton isActive={pathname === "/"} tooltip="Dashboard">
                  <LayoutDashboard />
                  Dashboard
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
          
          <SidebarSeparator />

            {isClient && groupedProjects.length === 0 && (
                <SidebarGroup>
                    <SidebarGroupLabel>Projects</SidebarGroupLabel>
                    <div className="p-2 text-sm text-muted-foreground">
                        No active projects. Start logging time!
                    </div>
                </SidebarGroup>
            )}

            {isClient && groupedProjects.map(({ label, projects }) => (
                <SidebarGroup key={label}>
                    <SidebarGroupLabel>{label}</SidebarGroupLabel>
                    <SidebarMenu className="px-0">
                    {projects.map(project => (
                        <SidebarMenuItem key={project.id}>
                        <Link href={`/projects/${project.id}`}>
                            <SidebarMenuButton 
                                isActive={pathname === `/projects/${project.id}`} 
                                tooltip={project.name}
                            >
                                {project.name}
                            </SidebarMenuButton>
                        </Link>
                        </SidebarMenuItem>
                    ))}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </SidebarContent>

        <SidebarFooter>
          <Button variant="ghost" onClick={() => setCreateProjectOpen(true)}>
            <PlusCircle className="mr-2" />
            New Project
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b" style={{ height: '65px' }}>
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
          </div>
          <div className="flex items-center gap-4">
            {isClient && timer.running && timer.projectId && (
              <div className="flex items-center gap-2 md:gap-4">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-primary" />
                  <div className="text-sm">
                    <p className="font-semibold">{projects.find(p => p.id === timer.projectId)?.name}</p>
                    <p className="font-mono text-muted-foreground">{formatElapsedTime(elapsedTime)}</p>
                  </div>
                </div>
                <Button size="sm" onClick={stopTimer}>
                  <Square className="mr-2 hidden md:block" />
                  Stop
                </Button>
              </div>
            )}
             <Button variant="ghost" onClick={logout}>
              <LogOut className="mr-2 hidden md:block" />
              Logout
            </Button>
          </div>
        </header>
        <div className="p-4 md:p-6">
            {children}
        </div>
      </SidebarInset>
      
      <CreateProjectDialog open={createProjectOpen} onOpenChange={setCreateProjectOpen} />
      <LogTimeDialog 
        open={isLogTimeDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            closeLogTimeDialog();
          }
        }} 
        defaultProjectId={logTimeDialogDefaultProjectId} 
      />
      <LogPracticeDialog
        open={isLogPracticeDialogOpen}
        onOpenChange={(open) => {
            if (!open) {
                closeLogPracticeDialog();
            }
        }}
      />
    </SidebarProvider>
  );
}
