
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PlusCircle, LayoutDashboard, LogOut } from "lucide-react";
import { format, isToday, isYesterday, parseISO, compareDesc, startOfDay, differenceInMilliseconds } from 'date-fns';

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
  SidebarFooter,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAppContext } from "@/contexts/app-context";
import { Logo } from "@/components/icons";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import type { Project, TimeEntry } from "@/lib/types";
import { formatTotalDuration } from "@/lib/utils";

const groupProjectsByActivityDate = (projects: Project[], timeEntries: TimeEntry[]) => {
  const dailyGroups: Record<string, { projects: Set<Project>, entries: TimeEntry[] }> = {};

  // Group time entries by day
  timeEntries.forEach(entry => {
    const entryDate = startOfDay(parseISO(entry.startTime));
    const entryDateKey = entryDate.toISOString();
    const project = projects.find(p => p.id === entry.projectId && p.name !== "Internal Activities");

    if (project) {
      if (!dailyGroups[entryDateKey]) {
        dailyGroups[entryDateKey] = { projects: new Set(), entries: [] };
      }
      dailyGroups[entryDateKey].projects.add(project);
      dailyGroups[entryDateKey].entries.push(entry);
    }
  });
  
  // Handle projects with no time entries, grouping them by creation date
  projects.forEach(project => {
    if (project.name === "Internal Activities") return;
    const hasEntries = timeEntries.some(entry => entry.projectId === project.id);
    if (!hasEntries) {
      const creationDate = startOfDay(parseISO(project.createdAt));
      const creationDateKey = creationDate.toISOString();
      if (!dailyGroups[creationDateKey]) {
        dailyGroups[creationDateKey] = { projects: new Set(), entries: [] };
      }
      dailyGroups[creationDateKey].projects.add(project);
    }
  });


  return Object.entries(dailyGroups)
    .map(([dateKey, { projects: projectSet, entries }]) => {
      const date = parseISO(dateKey);
      let label: string;

      if (isToday(date)) {
        label = "Today";
      } else if (isYesterday(date)) {
        label = "Yesterday";
      } else {
        label = format(date, 'MMMM d, yyyy');
      }

      const totalDuration = entries.reduce((acc, entry) => {
        if (!entry.startTime || !entry.endTime) return acc;
        return acc + differenceInMilliseconds(parseISO(entry.endTime), parseISO(entry.startTime));
      }, 0);

      return {
        label,
        date: date,
        projects: Array.from(projectSet).sort((a, b) => a.name.localeCompare(b.name)),
        totalDuration,
      };
    })
    .sort((a, b) => compareDesc(a.date, b.date));
};


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { 
    projects, 
    timeEntries,
    logout,
    openCreateProjectDialog,
    isCreateProjectDialogOpen,
    closeCreateProjectDialog,
  } = useAppContext();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const groupedProjects = useMemo(() => {
    if (!isClient) return [];
    return groupProjectsByActivityDate(projects, timeEntries);
  }, [projects, timeEntries, isClient]);

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
                        No projects yet. Create one to start!
                    </div>
                </SidebarGroup>
            )}

            {isClient && groupedProjects.map(({ label, projects, totalDuration }) => (
                <SidebarGroup key={label}>
                    <SidebarGroupLabel className="flex justify-between items-center">
                      <span>{label}</span>
                      {totalDuration > 0 && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {formatTotalDuration(totalDuration)}
                        </span>
                      )}
                    </SidebarGroupLabel>
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
          <Button variant="ghost" onClick={openCreateProjectDialog}>
            <PlusCircle className="mr-2" />
            New Project
          </Button>
        </SidebarFooter>
      </Sidebar>

      <main className="flex-1">
        <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b" style={{ height: '65px' }}>
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
          </div>
          <div className="flex items-center gap-4">
             <Button variant="ghost" onClick={logout}>
              <LogOut className="mr-2 hidden md:block" />
              Logout
            </Button>
          </div>
        </header>
        <div className="p-4 md:p-6">
            {children}
        </div>
      </main>
      
      <CreateProjectDialog open={isCreateProjectDialogOpen} onOpenChange={closeCreateProjectDialog} />
    </SidebarProvider>
  );
}
