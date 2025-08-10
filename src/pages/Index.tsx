import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Filter, List, Calendar as CalendarIcon, Upload, Download, Maximize2, Minimize2, LayoutGrid, ArrowLeft, Home, LogIn, ChevronDown, ChevronRight, Edit2, Trash2, Activity, Users, Palette, PenTool, GitBranch, Clock, Pin, Moon, Sun, Bell, CheckCircle, Target, Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Project, ProjectStatus, ViewMode, FilterMode, ProjectPriority, ProjectMedia, ExternalLink, Artist, Note } from '@/types/project';
import { sanitizeProject } from '@/types/project';
import { ProjectCard } from '@/components/ProjectCard';
import { ProjectForm } from '@/components/ProjectForm';
import { CalendarView } from '@/components/CalendarView';
import MondayView from '@/components/MondayView';
import { ActivityFeed } from '@/components/ActivityFeed';
import { ProfileTab } from '@/components/ProfileTab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectStatuses } from '@/lib/statuses';
import { mockApi, useMockApi as useMockApiHook } from '@/lib/mockApi';
import { LoginModal } from '@/components/LoginModal';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { activityService } from '@/services/activityService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useProjectFilters, SortMode } from '@/hooks/useProjectFilters';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useTheme } from '@/lib/theme-provider';

// New component imports
import { ProjectDetail } from '@/components/ProjectDetail';
import { MoodboardsView } from '@/components/workspaces/MoodboardsView';
import { WhiteboardsView, WorkflowsView, TimelineView } from '@/components/workspaces/WorkspaceViews';
import { GlobalSearch } from '@/components/GlobalSearch';
import { Badge } from '@/components/ui/badge';
import { HamburgerMenu } from '@/components/ui/hamburger-menu';
import { ActivityDetails } from '@/components/ActivityDetails';
import { Activity as ActivityType } from '@/types/activity';
import { projectService } from '@/services/projectService';
import { notesService } from '@/services/notesService';

const apiConfig = (typeof window !== 'undefined' && window.pulse2) ? window.pulse2 : null;

// Define component props type
type CurrentView = 'list' | 'detail' | 'form';

const Index = () => {
  const shouldUseMock = useMockApiHook();
  // State management
  const [currentView, setCurrentView] = useState<CurrentView>('list');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isCompact, setIsCompact] = useState(false);
  const [pinnedGroups, setPinnedGroups] = useState([
    { id: '1', name: 'Priority', projectIds: [], expanded: true }
  ]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [pinningProjectId, setPinningProjectId] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  
  // New state for floating elements
  const [showPinnedSidebar, setShowPinnedSidebar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [isSearchingGlobally, setIsSearchingGlobally] = useState(false);
  const [searchScope, setSearchScope] = useState<'current' | 'global'>('current');
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Focus mode state - hide header when in project detail views
  const [isInFocusMode, setIsInFocusMode] = useState(false);
  
  // Mobile hamburger menu state
  const [isHamburgerMenuOpen, setIsHamburgerMenuOpen] = useState(false);
  
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const { toast, toasts } = useToast();
  const queryClient = useQueryClient();
  const activityLogger = useActivityLogger();

  // Authentication
  const isLoggedIn = Boolean(jwtToken);

  // Track notification count based on toasts
  useEffect(() => {
    const newNotificationCount = toasts.filter(t => t.open).length;
    setNotificationCount(newNotificationCount);
  }, [toasts]);

  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    const displayName = localStorage.getItem('userDisplayName');
    if (token) setJwtToken(token);
    if (displayName) setUserDisplayName(displayName);
    // Ensure global API client picks up token immediately
    try {
      const t = localStorage.getItem('jwtToken');
      if (t) {
        // WordPressApiClient instance pulls token in constructor, but ensure any singletons re-use it
        // @ts-ignore
        if (typeof window !== 'undefined') { (window as any).__pulse2Jwt = t; }
      }
    } catch {}
  }, []);

  // API queries and mutations
  const { data: allProjects = [], isLoading, error } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const projects = await projectService.getProjects();
      // Sanitize all projects to ensure data integrity
      return projects.map(project => sanitizeProject(project));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Project, 'id'>) => {
      return projectService.createProject(data);
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project Created', description: 'Your project has been created successfully.' });
      
      // Log activity
      activityLogger.logProjectCreated(
        newProject.id,
        newProject.name,
        newProject.client
      );
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create project.', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) => {
      return projectService.updateProject(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project Updated', description: 'Your project has been updated successfully.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update project.', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return projectService.deleteProject(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project Deleted', description: 'Your project has been deleted successfully.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete project.', variant: 'destructive' });
    },
  });

  // Use project filters hook with actual data
  const {
    filteredAndSortedProjects: actualFilteredProjects,
    filterMode,
    setFilterMode,
    sortMode,
    setSortMode,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
  } = useProjectFilters(allProjects || []);

  // Event handlers
  // Enhanced handleCreateProject with mutations and workspace linking
  const handleCreateProject = async (projectData: Omit<Project, 'id' | 'statusHistory' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Add creator information
      const projectWithCreator = {
        ...projectData,
        createdBy: userDisplayName || 'Unknown User'
      };
      
      const newProject = await projectService.createProject(projectWithCreator);
      // Invalidate and refresh projects
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project Created', description: `${newProject.name} has been created.` });
      
      // Log activity
      activityLogger.logProjectCreated(
        newProject.id,
        newProject.name,
        newProject.client
      );
      
      // Navigate or update view
      handleBackToList();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEditProject = (data: Partial<Project>) => {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
      
      // Log activity for project update
      activityService.logActivity({
        type: 'project_updated',
        title: data.name || editingProject.name,
        projectId: editingProject.id,
        userId: 'current-user',
        metadata: { 
          changes: Object.keys(data)
        }
      });
    }
  };

  const handleSortChange = (value: string) => {
    setSortMode(value as SortMode);
  };

  // Import/Export handlers
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (Array.isArray(data.projects)) {
          for (const project of data.projects) {
            const projectData = {
              ...project,
              notes: [],
              media: [],
              externalLinks: [],
              artists: [],
              statusHistory: project.statusHistory || []
            };
            delete projectData.id;
            await createMutation.mutateAsync(projectData);
            
            if (project.notes && Array.isArray(project.notes)) {
              for (const note of project.notes) {
                await importNoteRecursive(note, project.id);
              }
            }
          }
          toast({ title: 'Import Successful', description: 'Projects imported successfully.' });
        } else {
          toast({ title: 'Import Error', description: 'Invalid file format.', variant: 'destructive' });
        }
      } catch (error) {
        console.error('Import error:', error);
        toast({ title: 'Import Error', description: 'Failed to import projects.', variant: 'destructive' });
      }
    };
    input.click();
  };

  const handleExport = () => {
    const exportData = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      projects: actualFilteredProjects,
      activities: activityService.getActivities(),
      metadata: {
        totalProjects: actualFilteredProjects.length,
        activeProjects: actualFilteredProjects.filter(p => !p.isArchived).length,
        archivedProjects: actualFilteredProjects.filter(p => p.isArchived).length,
        exportedBy: userDisplayName || 'Unknown User'
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulse2-projects-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    // Log export activity
    activityService.logActivity({
      type: 'project_updated',
      title: `Exported ${actualFilteredProjects.length} projects`,
      projectId: '',
      userId: 'current-user',
      metadata: { exportType: 'projects', count: actualFilteredProjects.length }
    });
  };

  // Note import helper
  const importNoteRecursive = async (note: Note, projectId: string, parentId?: string) => {
    const noteData = {
      content: note.content,
      projectId: projectId,
      parentId: parentId,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    };

    try {
      const created = await notesService.createNote(noteData);
      if (created && created.id && note.replies && Array.isArray(note.replies)) {
        for (const reply of note.replies) {
          await importNoteRecursive(reply, projectId, created.id);
        }
      }
    } catch (e) {
      console.error('Failed to import a note:', e);
    }
  }

  const handleDeleteProject = (project: Project) => {
    if (window.confirm(`Are you sure you want to delete "${project.name}"?`)) {
      activityLogger.logActivity({
        type: 'project_deleted',
        projectId: project.id,
        details: { projectName: project.name },
      });
      deleteMutation.mutate(project.id);
    }
  };

  const handleStatusChange = (project: Project, newStatus: ProjectStatus) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const statusHistory = project.statusHistory || [];
    const filteredHistory = statusHistory.filter(entry => {
      const entryDate = entry.date.split('T')[0];
      return entryDate !== todayStr;
    });
    const newHistoryEntry = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      status: newStatus,
      date: new Date().toISOString(),
      note: `Status updated to ${newStatus}`
    };
    const updatedHistory = [...filteredHistory, newHistoryEntry];
    const updatedData = { status: newStatus, statusHistory: updatedHistory };
    updateMutation.mutate({ id: project.id, data: updatedData });
    
    // Log activity for status change
    activityLogger.logStatusChanged(project.id, project.status, newStatus);
  };

  const handleArchiveProject = (project: Project, isArchived: boolean) => {
    updateMutation.mutate({ id: project.id, data: { ...project, isArchived } });
    toast({ title: isArchived ? 'Project Archived' : 'Project Restored' });
    
    if (isArchived) {
      activityLogger.logActivity({
        type: 'project_archived',
        projectId: project.id,
        details: { projectName: project.name },
      });
    }
  };

  const handleOpenProjectForm = (project: Project | null = null) => {
    if (!isLoggedIn && !project) {
      setIsLoginModalOpen(true);
      return;
    }
    setEditingProject(project);
    setCurrentView('form');
    setIsInFocusMode(true); // Enter focus mode when editing/creating projects
  };

  const handleShowProjectDetail = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentView('detail');
    setIsInFocusMode(true); // Enter focus mode when viewing project details
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedProjectId(null);
    setEditingProject(null);
    setIsInFocusMode(false); // Exit focus mode when going back to list
  };

  // Handle mobile navigation from hamburger menu
  const handleMobileNavigate = (view: string) => {
    setViewMode(view as ViewMode);
    setCurrentView('list');
    setSelectedProjectId(null);
    setEditingProject(null);
    
    // Tab navigation should NOT trigger focus mode
    // Focus mode only for detailed project work
    setIsInFocusMode(false);
    
    setIsHamburgerMenuOpen(false);
  };

  // Pinned project functions
  const createGroup = () => {
    const newGroup = {
      id: Date.now().toString(),
      name: 'New Group',
      projectIds: [],
      expanded: true
    };
    setPinnedGroups([...pinnedGroups, newGroup]);
    setEditingGroupId(newGroup.id);
    setEditingGroupName(newGroup.name);
  };

  const removeGroup = (groupId: string) => {
    setPinnedGroups(pinnedGroups.filter(g => g.id !== groupId));
  };

  const toggleGroup = (index: number) => {
    const newGroups = [...pinnedGroups];
    newGroups[index].expanded = !newGroups[index].expanded;
    setPinnedGroups(newGroups);
  };

  const startEditingGroup = (groupId: string, groupName: string) => {
    setEditingGroupId(groupId);
    setEditingGroupName(groupName);
  };

  const saveGroupName = () => {
    if (editingGroupId && editingGroupName.trim()) {
      const newGroups = [...pinnedGroups];
      const group = newGroups.find(g => g.id === editingGroupId);
      if (group) {
        group.name = editingGroupName.trim();
        setPinnedGroups(newGroups);
      }
    }
    cancelEditingGroup();
  };

  const cancelEditingGroup = () => {
    setEditingGroupId(null);
    setEditingGroupName('');
  };

  const handlePin = (projectId: string | null, groupId: string) => {
    if (!projectId) return;
    const newGroups = [...pinnedGroups];
    const group = newGroups.find(g => g.id === groupId);
    if (group && !group.projectIds.includes(projectId)) {
      group.projectIds.push(projectId);
      setPinnedGroups(newGroups);
    }
    setPinningProjectId(null);
  };

  const handleUnpin = (projectId: string) => {
    const newGroups = [...pinnedGroups];
    newGroups.forEach(group => {
      group.projectIds = group.projectIds.filter(id => id !== projectId);
    });
    setPinnedGroups(newGroups);
  };

  const isPinned = (projectId: string) => {
    return pinnedGroups.some(group => group.projectIds.includes(projectId));
  };

  // New state for activity details
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [isActivityDetailsOpen, setIsActivityDetailsOpen] = useState(false);
  
  // Handler for activity clicks
  const handleActivityClick = (activity: ActivityType) => {
    setSelectedActivity(activity);
    setIsActivityDetailsOpen(true);
  };
  
  // Navigate to the appropriate item based on activity type
  const handleNavigateToActivityItem = () => {
    if (!selectedActivity) return;
    
    // Close the activity details dialog
    setIsActivityDetailsOpen(false);
    
    // Handle navigation based on activity type
    if (selectedActivity.projectId) {
      // For project-related activities, navigate to the project
      handleShowProjectDetail(selectedActivity.projectId);
      
      // If it's a workspace-specific activity, navigate to the appropriate workspace tab
      if (selectedActivity.type.includes('moodboard')) {
        // Navigate to moodboard tab
        // This would be implemented in the ProjectDetail component
      } else if (selectedActivity.type.includes('whiteboard')) {
        // Navigate to whiteboard tab
      } else if (selectedActivity.type.includes('workflow')) {
        // Navigate to workflow tab
      } else if (selectedActivity.type.includes('timeline')) {
        // Navigate to timeline tab
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Enhanced Header */}
      <header className={cn(
        "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 transition-all duration-500 ease-in-out",
        isInFocusMode && "transform -translate-y-full"
      )}>
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left Side - Logo, Title, User */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              {/* Mobile Hamburger Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsHamburgerMenuOpen(true)}
                className="md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              {/* Logo */}
              <div className="flex items-center gap-2">
                <span className="text-3xl font-extrabold bg-gradient-to-r from-pink-500 to-purple-400 bg-clip-text text-transparent tracking-tight">CT</span>
              </div>
              
              {/* Title and Subtitle */}
              <div className="flex flex-col">
                <h1 className="text-xl font-bold">
                  {currentView === 'list' && viewMode === 'activity' && 'Activity Feed'}
                  {currentView === 'list' && viewMode === 'profile' && (isLoggedIn && userDisplayName ? `${userDisplayName} & Team` : 'Profile & Team')}
                  {currentView === 'list' && viewMode === 'moodboards' && 'Moodboards'}
                  {currentView === 'list' && viewMode === 'whiteboards' && 'Whiteboards'}
                  {currentView === 'list' && viewMode === 'workflows' && 'Workflows'}
                  {currentView === 'list' && viewMode === 'timeline' && 'Timeline'}
                  {currentView === 'list' && !['activity', 'profile', 'moodboards', 'whiteboards', 'workflows', 'timeline'].includes(viewMode) && 'Projects'}
                  {currentView === 'detail' && 'Project Details'}
                  {currentView === 'form' && (editingProject ? 'Edit Project' : 'New Project')}
                </h1>
                <span className="text-xs text-muted-foreground">A unified view of all our creative projects.</span>
              </div>
            </div>
            
            {/* User Info */}
            {isLoggedIn && userDisplayName && (
              <div className="px-3 py-1.5 rounded-md text-sm font-medium bg-muted text-muted-foreground border border-border">
                {userDisplayName}
              </div>
            )}
          </div>

          {/* Right Side - Global Search */}
          <div className="flex items-center gap-4">
            {/* Global Search */}
            <div className="flex items-center gap-2 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder={searchScope === 'global' ? "Search entire app..." : "Search current tab..."} 
                  className="pl-10 w-64 hover-shimmer cyrus-ui" 
                  value={globalSearchTerm} 
                  onChange={(e) => {
                    setGlobalSearchTerm(e.target.value);
                    setShowSearchResults(e.target.value.trim().length > 0);
                  }}
                  onFocus={() => globalSearchTerm.trim().length > 0 && setShowSearchResults(true)}
                />
                <GlobalSearch
                  searchTerm={globalSearchTerm}
                  searchScope={searchScope}
                  currentTab={viewMode}
                  onResultClick={(result) => {
                    console.log('Navigate to:', result);
                    setShowSearchResults(false);
                    setGlobalSearchTerm('');
                    // TODO: Implement navigation based on result type
                  }}
                  isVisible={showSearchResults}
                  onClose={() => setShowSearchResults(false)}
                />
              </div>
              <Button
                variant={searchScope === 'global' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchScope(searchScope === 'global' ? 'current' : 'global')}
                className="hover-shimmer cyrus-ui"
                title={searchScope === 'global' ? 'Search entire app' : 'Search current tab only'}
              >
                <Target className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Hidden on mobile */}
        <div className="px-4 border-b hidden md:block">
          <div className="flex items-center gap-1">
            <Button
              onClick={() => {
                setViewMode('list');
                setIsInFocusMode(false);
              }}
              className={cn(
                "rounded-none border-b-2 border-transparent hover-shimmer cyrus-ui",
                viewMode === 'list' ? "button-primary-enhanced" : ""
              )}
            >
              <List className="h-4 w-4 mr-2" />
              Projects
            </Button>
            <Button
              onClick={() => {
                setViewMode('calendar');
                setIsInFocusMode(false);
              }}
              className={cn(
                "rounded-none border-b-2 border-transparent hover-shimmer cyrus-ui",
                viewMode === 'calendar' ? "button-primary-enhanced" : ""
              )}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendar
            </Button>
            <Button
              onClick={() => {
                setViewMode('monday');
                setIsInFocusMode(false);
              }}
              className={cn(
                "rounded-none border-b-2 border-transparent hover-shimmer cyrus-ui",
                viewMode === 'monday' ? "button-primary-enhanced" : ""
              )}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Monday
            </Button>
            <Button
              onClick={() => {
                setViewMode('moodboards');
                setIsInFocusMode(false); // Keep header visible for tab navigation
              }}
              className={cn(
                "rounded-none border-b-2 border-transparent hover-shimmer cyrus-ui",
                viewMode === 'moodboards' ? "button-primary-enhanced" : ""
              )}
              data-viewmode="moodboards"
            >
              <Palette className="h-4 w-4 mr-2" />
              Moodboards
            </Button>
            <Button
              onClick={() => {
                setViewMode('whiteboards');
                setIsInFocusMode(false); // Keep header visible for tab navigation
              }}
              className={cn(
                "rounded-none border-b-2 border-transparent hover-shimmer cyrus-ui",
                viewMode === 'whiteboards' ? "button-primary-enhanced" : ""
              )}
              data-viewmode="whiteboards"
            >
              <PenTool className="h-4 w-4 mr-2" />
              Whiteboards
            </Button>
            <Button
              onClick={() => {
                setViewMode('workflows');
                setIsInFocusMode(false); // Keep header visible for tab navigation
              }}
              className={cn(
                "rounded-none border-b-2 border-transparent hover-shimmer cyrus-ui",
                viewMode === 'workflows' ? "button-primary-enhanced" : ""
              )}
            >
              <GitBranch className="h-4 w-4 mr-2" />
              Workflows
            </Button>
            <Button
              onClick={() => {
                setViewMode('timeline');
                setIsInFocusMode(false); // Keep header visible for tab navigation
              }}
              className={cn(
                "rounded-none border-b-2 border-transparent hover-shimmer cyrus-ui",
                viewMode === 'timeline' ? "button-primary-enhanced" : ""
              )}
            >
              <Clock className="h-4 w-4 mr-2" />
              Timeline
            </Button>
            <Button
              onClick={() => {
                setViewMode('activity');
                setIsInFocusMode(false);
              }}
              className={cn(
                "rounded-none border-b-2 border-transparent hover-shimmer cyrus-ui",
                viewMode === 'activity' ? "button-primary-enhanced" : ""
              )}
            >
              <Activity className="h-4 w-4 mr-2" />
              Activity
            </Button>
            <Button
              onClick={() => {
                setViewMode('profile');
                setIsInFocusMode(false);
              }}
              className={cn(
                "rounded-none border-b-2 border-transparent hover-shimmer cyrus-ui",
                viewMode === 'profile' ? "button-primary-enhanced" : ""
              )}
            >
              {isLoggedIn && userDisplayName ? (
                <>
                  <div className="w-4 h-4 mr-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                    {userDisplayName.charAt(0).toUpperCase()}
                  </div>
                  {userDisplayName}
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Profile
                </>
              )}
            </Button>

            {/* Hide Header Button - Moved to after Profile tab */}
            <Button
              variant="ghost"
              onClick={() => setIsInFocusMode(true)}
              className="rounded-none border-b-2 border-transparent ml-2"
              title="Hide Header"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>

            {/* Login Button (only when not logged in) */}
            <div className="ml-auto flex items-center gap-3">
              {!isLoggedIn && (
                <Button onClick={() => setIsLoginModalOpen(true)} className="button-primary-enhanced hover-shimmer cyrus-ui">
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className={cn(
        "flex-1 transition-all duration-500 ease-in-out", 
        showPinnedSidebar && "ml-80",
        isInFocusMode && "transform -translate-y-[120px]" // Move up by header height
      )}>
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={(token, displayName) => {
            setJwtToken(token);
            setUserDisplayName(displayName);
            localStorage.setItem('userDisplayName', displayName);
          }}
        />

        <div className={cn("p-0", isInFocusMode && "pt-4")}>
          {isLoading && <p className="p-4">Loading projects...</p>}
          
          {/* Project List View */}
          {!isLoading && !error && currentView === 'list' && (
            <>
              {/* Filter and View Controls - Shared for Projects and Monday views */}
              {(viewMode === 'list' || viewMode === 'monday') && (
                <div className="p-4 glass-card m-4 mb-2">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 relative min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search projects..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProjectStatus | 'all')}>
                      <SelectTrigger className="w-[180px] hover-shimmer cyrus-ui"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {projectStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    <Select value={sortMode} onValueChange={handleSortChange}>
                      <SelectTrigger className="w-[180px] hover-shimmer cyrus-ui"><SelectValue placeholder="Sort by..." /></SelectTrigger>
                      <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="oldest">Oldest</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                                      </Select>

                  <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                    <Button 
                      size="sm" 
                      onClick={() => setFilterMode('active')} 
                      className={cn(
                        "hover-shimmer",
                        filterMode === 'active' ? "button-primary-enhanced" : ""
                      )}
                    >
                      Active
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => setFilterMode('archived')} 
                      className={cn(
                        "hover-shimmer",
                        filterMode === 'archived' ? "button-primary-enhanced" : ""
                      )}
                    >
                      Archived
                    </Button>
                  </div>

                  {/* Compact button - Only show for list view */}
                  {viewMode === 'list' && (
                    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                      <Button
                        size="sm"
                        onClick={() => setIsCompact(!isCompact)}
                        className={cn(
                          "hover-shimmer",
                          isCompact ? "button-primary-enhanced" : ""
                        )}
                      >
                        {isCompact ? (
                          <>
                            <Maximize2 className="h-4 w-4 mr-2" />
                            <span>Expand</span>
                          </>
                        ) : (
                          <>
                            <Minimize2 className="h-4 w-4 mr-2" />
                            <span>Compact</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Project Actions */}
                  <div className="flex items-center gap-2">
                    <Button onClick={() => handleOpenProjectForm(null)} className="button-primary-enhanced hover-shimmer cyrus-ui">
                      <Plus className="h-4 w-4 mr-2" />
                      New Project
                    </Button>
                    <Button onClick={handleImport} className="button-primary-enhanced hover-shimmer cyrus-ui">
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </Button>
                    <Button onClick={handleExport} className="button-primary-enhanced hover-shimmer cyrus-ui">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  </div>
                </div>
              )}

              {/* Content based on view mode */}
              {viewMode === 'list' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                  {actualFilteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onEdit={() => handleOpenProjectForm(project)}
                      onStatusChange={(newStatus) => handleStatusChange(project, newStatus)}
                      onArchive={() => handleArchiveProject(project, true)}
                      onRestore={() => handleArchiveProject(project, false)}
                      onDelete={() => handleDeleteProject(project)}
                      isCompact={isCompact}
                      isLoggedIn={isLoggedIn}
                      onClick={() => handleShowProjectDetail(project.id)}
                    />
                  ))}
                </div>
              )}
              {viewMode === 'calendar' && (
                <CalendarView 
                  projects={actualFilteredProjects} 
                  onProjectClick={handleShowProjectDetail}
                  onActivityClick={handleActivityClick}
                />
              )}
              {viewMode === 'activity' && (
                <ActivityFeed 
                  limit={50}
                  showFilters={true}
                  showRefreshButton={true}
                  isMainActivityTab={true}
                  onActivityClick={(activity) => {
                    if (activity.projectId) {
                      handleShowProjectDetail(activity.projectId);
                    }
                  }}
                />
              )}
              {viewMode === 'profile' && (
                <ProfileTab />
              )}
              {viewMode === 'moodboards' && (
                <MoodboardsView 
                  projects={actualFilteredProjects}
                  onEnterFocusMode={() => setIsInFocusMode(true)}
                  onExitFocusMode={() => setIsInFocusMode(false)}
                />
              )}
              {viewMode === 'whiteboards' && (
                <WhiteboardsView 
                  projects={actualFilteredProjects} 
                  onEnterFocusMode={() => setIsInFocusMode(true)}
                  onExitFocusMode={() => setIsInFocusMode(false)}
                />
              )}
              {viewMode === 'workflows' && (
                <WorkflowsView 
                  projects={actualFilteredProjects}
                  onEnterFocusMode={() => setIsInFocusMode(true)}
                  onExitFocusMode={() => setIsInFocusMode(false)}
                />
              )}
              {viewMode === 'timeline' && (
                <TimelineView 
                  projects={actualFilteredProjects}
                  onEnterFocusMode={() => setIsInFocusMode(true)}
                  onExitFocusMode={() => setIsInFocusMode(false)}
                />
              )}
              {viewMode === 'monday' && (
                <MondayView 
                  projects={actualFilteredProjects}
                  onEditProject={(project) => handleOpenProjectForm(project)}
                  onStatusChange={(project, newStatus) => handleStatusChange(project, newStatus)}
                  onArchiveProject={(project) => handleArchiveProject(project, true)}
                  onRestoreProject={(project) => handleArchiveProject(project, false)}
                  onDeleteProject={(project) => handleDeleteProject(project)}
                  isLoggedIn={isLoggedIn}
                  onProjectClick={(projectId) => handleShowProjectDetail(projectId)}
                />
              )}
            </>
          )}

          {/* Project Detail View */}
          {currentView === 'detail' && selectedProjectId && (
            <ProjectDetail 
              project={allProjects.find(p => p.id === selectedProjectId)!} 
              onBack={handleBackToList} 
              onEdit={() => handleOpenProjectForm(allProjects.find(p => p.id === selectedProjectId)!)}
              isLoggedIn={isLoggedIn}
              onPin={() => {
                if (isPinned(selectedProjectId)) {
                  handleUnpin(selectedProjectId);
                } else if (pinnedGroups.length === 1) {
                  handlePin(selectedProjectId, pinnedGroups[0].id);
                } else {
                  setPinningProjectId(selectedProjectId);
                }
              }}
              isPinned={isPinned(selectedProjectId)}
              autoRefresh={autoRefresh}
              onToggleAutoRefresh={setAutoRefresh}
            />
          )}

          {/* Project Form View */}
          {currentView === 'form' && (
            <ProjectForm
              onClose={handleBackToList}
              onSubmit={(data) => {
                if (editingProject) {
                  handleEditProject(data);
                } else {
                  handleCreateProject(data);
                }
                handleBackToList();
              }}
              project={editingProject || undefined}
              isLoggedIn={isLoggedIn}
            />
          )}
        
          {!isLoading && actualFilteredProjects.length === 0 && currentView === 'list' && (
            <div className="text-center py-16 glass-card m-4">
              <h3 className="text-xl font-semibold">No projects found</h3>
              <p className="text-muted-foreground mt-2">
                {filterMode === 'active' ? 'Create a new project to get started.' : 'No archived projects match your filters.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Buttons - Right Side */}
      <div className="fixed right-4 bottom-4 flex flex-col gap-3 z-50">
        {/* Theme Toggle */}
        <Button
          onClick={toggleTheme}
          className="w-12 h-12 rounded-full glass-card border-0 shadow-lg hover-shimmer cyrus-ui transition-all duration-300 hover:scale-110 hover:glow"
          size="icon"
          variant="ghost"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (showPinnedSidebar) setShowPinnedSidebar(false);
              // Clear notification count when opening notifications
              if (!showNotifications) {
                setNotificationCount(0);
              }
            }}
            className={cn(
              "w-12 h-12 rounded-full glass-card border-0 shadow-lg hover-shimmer cyrus-ui transition-all duration-300 hover:scale-110 hover:glow",
              showNotifications && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
            size="icon"
            variant="ghost"
          >
            <Bell className="h-4 w-4" />
          </Button>
          {/* Notification Badge - Show count only when there are notifications */}
          {notificationCount > 0 && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg z-[60] border-2 border-background pointer-events-none animate-pulse">
              {notificationCount > 9 ? '9+' : notificationCount}
            </div>
          )}
        </div>

        {/* Pinned Projects */}
        <Button
          onClick={() => {
            setShowPinnedSidebar(!showPinnedSidebar);
            if (showNotifications) setShowNotifications(false);
          }}
          className={cn(
            "w-12 h-12 rounded-full glass-card border-0 shadow-lg hover-shimmer cyrus-ui transition-all duration-300 hover:scale-110 hover:glow",
            showPinnedSidebar && "ring-2 ring-primary ring-offset-2 ring-offset-background"
          )}
          size="icon"
          variant="ghost"
        >
          <Pin className="h-4 w-4" />
        </Button>
      </div>

      {/* Sliding Sidebar - Left Side */}
      {(showPinnedSidebar || showNotifications) && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => {
              setShowPinnedSidebar(false);
              setShowNotifications(false);
            }}
          />
          
          {/* Sidebar */}
          <div className="fixed top-0 left-0 h-full w-full sm:w-80 md:w-96 bg-background/95 backdrop-blur-sm border-r shadow-2xl z-50 overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent">
                  {showNotifications ? 'Recent Activity' : 'Pinned Projects'}
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowPinnedSidebar(false);
                    setShowNotifications(false);
                  }}
                  className="hover-shimmer cyrus-ui"
                >
                  ×
                </Button>
              </div>
            </div>
            
            <div className="p-4">
              {showNotifications ? (
                <div className="space-y-3">
                  {(() => {
                    // Get real activity data from localStorage
                    const activities = JSON.parse(localStorage.getItem('activities') || '[]');
                    const recentActivities = activities.slice(0, 10); // Show last 10 activities
                    
                    if (recentActivities.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No recent activity</p>
                          <p className="text-xs">Activity will appear here when you interact with projects</p>
                        </div>
                      );
                    }
                    
                    return recentActivities.map((activity, index) => (
                      <div key={activity.id || index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                        <div className="w-2 h-2 rounded-full bg-indicator mt-2 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-sm font-medium truncate">{activity.title}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(activity.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {activity.description || activity.title}
                          </p>
                          {activity.projectName && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                {activity.projectName}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                // Pinned projects content
                <div className="space-y-3">
                  {pinnedGroups.map(group => (
                    <div key={group.id}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{group.name}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {group.projectIds.length}
                        </Badge>
                      </div>
                      {group.projectIds.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No pinned projects</p>
                      ) : (
                        <div className="space-y-2">
                          {group.projectIds.map(projectId => {
                            const project = allProjects.find(p => p.id === projectId);
                            return project ? (
                              <div
                                key={projectId}
                                className="flex items-center gap-2 p-2 rounded bg-muted/10 hover:bg-muted/20 cursor-pointer transition-colors"
                                onClick={() => {
                                  handleShowProjectDetail(projectId);
                                  setShowPinnedSidebar(false);
                                }}
                              >
                                <div className="w-2 h-2 rounded-full bg-indicator"></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{project.name}</p>
                                  <p className="text-xs text-muted-foreground">{project.client}</p>
                                </div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Pin Project Dialog */}
      <Dialog open={!!pinningProjectId} onOpenChange={() => setPinningProjectId(null)}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Select a group to pin this project</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {pinnedGroups.map(group => (
              <Button 
                key={group.id} 
                onClick={() => handlePin(pinningProjectId, group.id)} 
                variant="outline"
                className="hover-shimmer cyrus-ui"
              >
                {group.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Focus Mode Back Button */}
      {isInFocusMode && (
        <Button
          onClick={() => setIsInFocusMode(false)}
          className={cn(
            "fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] shadow-xl transition-all duration-300 ease-in-out",
            "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
            "border border-border/50 hover:bg-accent hover:text-accent-foreground",
            "h-10 w-10 rounded-full p-0",
            "hover:scale-110 active:scale-95"
          )}
          title="Show Header"
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
      )}

      {/* Mobile Hamburger Menu */}
      <HamburgerMenu
        isOpen={isHamburgerMenuOpen}
        onClose={() => setIsHamburgerMenuOpen(false)}
        onNavigate={handleMobileNavigate}
        currentView={viewMode}
        isLoggedIn={isLoggedIn}
        userDisplayName={userDisplayName}
        notificationCount={notificationCount}
        onLogout={() => {
          setJwtToken(null);
          setUserDisplayName(null);
          localStorage.removeItem('jwtToken');
          localStorage.removeItem('userDisplayName');
          localStorage.removeItem('userId');
          setIsHamburgerMenuOpen(false);
        }}
        onLogin={() => {
          setIsLoginModalOpen(true);
          setIsHamburgerMenuOpen(false);
        }}
      />

      {/* Activity Details Dialog */}
      <ActivityDetails
        activity={selectedActivity}
        open={isActivityDetailsOpen}
        onOpenChange={setIsActivityDetailsOpen}
        onNavigateToItem={handleNavigateToActivityItem}
      />
    </div>
  );
};

export default Index;
