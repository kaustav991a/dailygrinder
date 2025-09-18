

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
    // If no entries, use the project's creation date
    return parseISO(project.createdAt);
  };
  
  const groups: Record<string, Set<Project>> = {};
  
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
      groups[groupLabel] = new Set();
    }
    groups[groupLabel].add(project);
  });

  return Object.entries(groups)
    .map(([label, projectSet]) => ({
      label,
      projects: Array.from(projectSet).sort((a, b) => a.name.localeCompare(b.name))
    }))
    .sort((a, b) => {
        if (a.label === 'Today') return -1;
        if (b.label === 'Today') return 1;
        if (a.label === 'Yesterday') return -1;
        if (b.label === 'Yesterday') return 1;
        const dateA = new Date(a.label);
        const dateB = new Date(b.label);
        return compareDesc(dateA, dateB);
    });
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { 
    projects, 
    timeEntries,
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
      
      <CreateProjectDialog open={createProjectOpen} onOpenChange={setCreateProjectOpen} />
    </SidebarProvider>
  );
}
