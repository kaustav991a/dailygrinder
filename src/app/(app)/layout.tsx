

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PlusCircle, LayoutDashboard, Timer, Square, LogOut } from "lucide-react";
import { format, isToday, isYesterday, parseISO, compareDesc } from 'date-fns';

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
import type { Project } from "@/lib/types";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { 
    projects, 
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
  

  const formatElapsedTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const groupProjectsByDate = (projects: Project[]) => {
    const sortedProjects = projects
      .filter(p => p.name !== "Internal Activities") // Exclude 'Internal Activities' project
      .sort((a, b) => 
        compareDesc(parseISO(a.createdAt || new Date().toISOString()), parseISO(b.createdAt || new Date().toISOString()))
      );

    const groups = sortedProjects.reduce((acc, project) => {
      const projectDate = parseISO(project.createdAt || new Date().toISOString());
      let groupLabel: string;
      if (isToday(projectDate)) {
        groupLabel = "Today";
      } else if (isYesterday(projectDate)) {
        groupLabel = "Yesterday";
      } else {
        groupLabel = format(projectDate, 'MMMM d, yyyy');
      }
      
      if (!acc[groupLabel]) {
        acc[groupLabel] = [];
      }
      acc[groupLabel].push(project);
      return acc;
    }, {} as Record<string, Project[]>);

    return Object.entries(groups).sort(([labelA], [labelB]) => {
      if (labelA === 'Today') return -1;
      if (labelB === 'Today') return 1;
      if (labelA === 'Yesterday' && labelB !== 'Today') return -1;
      if (labelB === 'Yesterday' && labelA !== 'Today') return 1;
      return compareDesc(new Date(labelA), new Date(labelB));
    });
  };
  
  const groupedProjects = isClient ? groupProjectsByDate(projects) : [];

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
                        No projects yet. Create one!
                    </div>
                </SidebarGroup>
            )}

            {isClient && groupedProjects.map(([groupLabel, projectsInGroup]) => (
                <SidebarGroup key={groupLabel}>
                    <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
                    <SidebarMenu className="px-0">
                    {projectsInGroup.map(project => (
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
