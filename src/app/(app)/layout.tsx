

"use client";

import { useState, useEffect, useRef } from "react";
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
} from "@/components/ui/sidebar";
import { useAppContext } from "@/contexts/app-context";
import { Logo } from "@/components/icons";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { LogTimeDialog } from "@/components/log-time-dialog";
import type { Project } from "@/lib/types";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { 
    projects, 
    isLogTimeDialogOpen, 
    closeLogTimeDialog, 
    logTimeDialogDefaultProjectId,
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
  const headerRef = useRef<HTMLHeadElement>(null);
  const [headerHeight, setHeaderHeight] = useState(65); // Default height

  useEffect(() => {
    setIsClient(true);
    if (!loading && !user) {
        router.push('/login');
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setHeaderHeight(entry.contentRect.height);
      }
    });

    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => {
      if (headerRef.current) {
        observer.unobserve(headerRef.current);
      }
    };
  }, []);

  const formatElapsedTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const groupProjectsByDate = (projects: Project[]) => {
    const sortedProjects = projects.sort((a, b) => 
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader 
            className="flex-row items-center justify-between px-4 py-3 border-b"
            style={{ height: headerHeight ? `${headerHeight}px` : 'auto' }}
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

            {isClient && projects.length === 0 && (
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
        <header ref={headerRef} className="flex items-center justify-between px-4 md:px-6 py-3 border-b">
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            {isClient && timer.running && timer.projectId && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-primary" />
                  <div className="text-sm">
                    <p className="font-semibold">{projects.find(p => p.id === timer.projectId)?.name}</p>
                    <p className="font-mono text-muted-foreground">{formatElapsedTime(elapsedTime)}</p>
                  </div>
                </div>
                <Button size="sm" onClick={stopTimer}>
                  <Square className="mr-2" />
                  Stop Timer
                </Button>
              </div>
            )}
             <Button variant="ghost" onClick={logout}>
              <LogOut className="mr-2" />
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
    </SidebarProvider>
  );
}
