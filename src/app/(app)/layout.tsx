
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PlusCircle, LayoutDashboard, LogOut } from "lucide-react";
import { format, isToday, isYesterday, parseISO, compareDesc, isSameDay, differenceInMilliseconds } from 'date-fns';

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
  const timeEntriesByProject = new Map<string, TimeEntry[]>();
  timeEntries.forEach(entry => {
    if (!timeEntriesByProject.has(entry.projectId)) {
      timeEntriesByProject.set(entry.projectId, []);
    }
    timeEntriesByProject.get(entry.projectId)!.push(entry);
  });

  const getMostRecentDate = (project: Project): Date => {
    const entries = timeEntriesByProject.get(project.id);
    if (entries && entries.length > 0) {
      return entries.reduce((latest, entry) => {
        const entryDate = parseISO(entry.startTime);
        return entryDate > latest ? entryDate : latest;
      }, new Date(0));
    }
    return parseISO(project.createdAt);
  };
  
  const groups: Record<string, { projects: Set<Project>, date: Date }> = {};
  
  projects.forEach(project => {
    if (project.name === "Internal Activities") return;

    const mostRecentDate = getMostRecentDate(project);
    let groupLabel: string;

    if (isToday(mostRecentDate)) {
      groupLabel = "Today";
    } else if (isYesterday(mostRecentDate)) {
      groupLabel = "Yesterday";
    } else {
      groupLabel = format(mostRecentDate, 'MMMM d, yyyy');
    }

    if (!groups[groupLabel]) {
      groups[groupLabel] = { projects: new Set(), date: mostRecentDate };
    }
    groups[groupLabel].projects.add(project);
  });

  return Object.entries(groups)
    .map(([label, { projects: projectSet, date }]) => {
      const dailyEntries = timeEntries.filter(entry => isSameDay(parseISO(entry.startTime), date));
      const totalDuration = dailyEntries.reduce((acc, entry) => {
        if (!entry.startTime || !entry.endTime) return acc;
        return acc + differenceInMilliseconds(parseISO(entry.endTime), parseISO(entry.startTime));
      }, 0);

      return {
        label,
        projects: Array.from(projectSet).sort((a, b) => a.name.localeCompare(b.name)),
        totalDuration,
      };
    })
    .sort((a, b) => {
        if (a.label === 'Today') return -1;
        if (b.label === 'Today') return 1;
        if (a.label === 'Yesterday') return -1;
        if (b.label === 'Yesterday') return 1;
        try {
            const dateA = new Date(a.label);
            const dateB = new Date(b.label);
            return compareDesc(dateA, dateB);
        } catch (e) {
            return 0;
        }
    });
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
