import React, { useState, useEffect } from 'react';
import { Plus, PenTool, GitBranch, Clock, Check, Pin, MessageCircle, Calendar, Image, Eye, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatDate } from '@/lib/utils';
import { BaseWorkspace, WhiteboardWorkspace } from '@/types/workspace';
import { Project } from '@/types/project';
import WhiteboardDetail from './WhiteboardDetail';
import WorkflowDetail from './workflow/WorkflowDetail';
import TimelineDetail from './timeline/TimelineDetail';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { workspaceService } from '@/services/workspaceService';
import { useToast } from '@/hooks/use-toast';
import { mockApi } from '@/lib/mockApi';
import { useWorkspaces } from '@/hooks/useWorkspaces';

interface WorkspaceViewProps {
  className?: string;
  projects?: Project[];
  onEnterFocusMode?: () => void;
  onExitFocusMode?: () => void;
}

// Projects will come from props - no mock data needed

export function WhiteboardsView({ className, projects: projectsFromProps = [], onEnterFocusMode, onExitFocusMode }: WorkspaceViewProps) {
  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'create'>('list');
  const [selectedWhiteboard, setSelectedWhiteboard] = useState<BaseWorkspace | null>(null);
  const [whiteboards, setWhiteboards] = useState<WhiteboardWorkspace[]>([]);
  const { toast } = useToast();
  const { workspaces, isLoading: wsLoading, error: wsError, createWorkspaceForProject, invalidate } = useWorkspaces();
  
  useEffect(() => {
    if (wsError) {
      console.error('Failed to load workspaces:', wsError);
      toast({ title: 'Error', description: 'Failed to load whiteboards', variant: 'destructive' });
    }
  }, [wsError, toast]);

  useEffect(() => {
    const list = (workspaces || []).filter(ws => ws.type === 'whiteboard') as WhiteboardWorkspace[];
    setWhiteboards(list);
  }, [workspaces]);

  const handleViewWhiteboard = (whiteboard: WhiteboardWorkspace) => {
    setSelectedWhiteboard(whiteboard);
    setCurrentView('detail');
    onEnterFocusMode?.();
  };
  
  const handleProjectSelect = async (project: any) => {
    try {
      const result = await createWorkspaceForProject({ projectId: project.id, type: 'whiteboard' });
      toast({ title: result.isNew ? 'Whiteboard created' : 'Existing whiteboard found', description: result.message });
      await invalidate();
      handleViewWhiteboard(result.workspace as WhiteboardWorkspace);
    } catch (error) {
      console.error('Failed to create whiteboard:', error);
      toast({ title: 'Error', description: 'Failed to create whiteboard', variant: 'destructive' });
    }
  };

  const handleCreateWhiteboard = () => {
    setCurrentView('create');
  };

  const handleBack = () => {
    setSelectedWhiteboard(null);
    setCurrentView('list');
    // Exit focus mode when returning to list
    onExitFocusMode?.();
  };

  // Detail view
  if (currentView === 'detail' && selectedWhiteboard) {
    return (
      <WhiteboardDetail
        whiteboard={selectedWhiteboard}
        onBack={handleBack}
      />
    );
  }

  // Create view - Project selection
  if (currentView === 'create') {
    return (
      <div className={cn("p-6", className)}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentView('list')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Create Whiteboard</h2>
              <p className="text-muted-foreground">
                Select a project to create image review workspace
              </p>
            </div>
          </div>

          {/* Project Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectsFromProps.map((project) => (
              <Card 
                key={project.id}
                className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] border-l-4"
                style={{ borderLeftColor: '#3b82f6' }}
                onClick={() => handleProjectSelect(project)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{project.client}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="outline">{project.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Created</span>
                      <span>{formatDate(project.createdAt)}</span>
                    </div>
                    <div className="pt-2">
                      <Button className="w-full" size="sm">
                        Create Whiteboard
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {projectsFromProps.length === 0 && !wsLoading && (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-gray-400 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Available</h3>
              <p className="text-gray-500">
                Create a project first to set up whiteboard image review
              </p>
            </div>
          )}
          
          {wsLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List view - Projects with image review data
  return (
    <div className={cn("p-6", className)}>
      {/* Header - Match Moodboard Style Exactly */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Whiteboards</h2>
          <p className="text-muted-foreground">
            Create and manage image review workspaces for design feedback
          </p>
        </div>
        <Button onClick={handleCreateWhiteboard} className="button-primary-enhanced hover-shimmer cyrus-ui">
          <Plus className="h-4 w-4 mr-2" />
          New Whiteboard
        </Button>
      </div>

      {wsLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading whiteboards...</p>
        </div>
      ) : (
        <>
          {/* Whiteboards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whiteboards.map((whiteboard) => {
              // Find associated project
              const project = projectsFromProps.find(p => p.id === whiteboard.projectId);
              const projectName = project ? project.name : "Unknown Project";
              const projectClient = project ? project.client : "";

          return (
            <Card 
                  key={whiteboard.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] overflow-hidden"
                  onClick={() => handleViewWhiteboard(whiteboard)}
            >
              {/* Preview Images */}
              <div className="h-48 grid grid-cols-2 gap-1 bg-gray-100 overflow-hidden">
                {(() => {
                  // Get project images (first 3). ProjectMedia.type is a category,
                  // so detect images by URL extension instead of m.type === 'image'.
                  const projectImages = (project?.media || [])
                    .filter(m => /\.(png|jpe?g|gif|webp|svg)$/i.test(m.url))
                    .slice(0, 3);
                  
                  if (projectImages.length === 0) {
                    return (
                      <div className="col-span-2 flex items-center justify-center">
                        <div className="text-center">
                          <PenTool className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">No images yet</p>
                        </div>
                      </div>
                    );
                  }
                  
                  return projectImages.map((image, index) => (
                    <div 
                      key={index} 
                      className={`${index === 0 && projectImages.length > 1 ? 'row-span-2' : ''} relative overflow-hidden`}
                    >
                      <img 
                        src={image.url} 
                        alt={image.filename || `Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ));
                })()}
              </div>
              
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <div>
                        <CardTitle className="text-lg">{whiteboard.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{projectName} {projectClient && `• ${projectClient}`}</p>
                    </div>
                      <PenTool className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Stats Row */}
                      <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                          <Image className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {(whiteboard as any).images?.length || 0} images
                          </span>
                    </div>
                    <div className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {(whiteboard as any).comments?.length || 0} comments
                      </span>
                    </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatDate(whiteboard.updatedAt)}
                          </span>
                  </div>
                </div>

                      {/* Preview (if available) */}
                      <div className="aspect-video bg-muted rounded-md overflow-hidden relative">
                        {(whiteboard as any).images && (whiteboard as any).images.length > 0 ? (
                          <img 
                            src={(whiteboard as any).images[0].url} 
                            alt="Whiteboard preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <PenTool className="h-12 w-12 opacity-20" />
                  </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </div>
                  
                      {/* Action Button */}
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewWhiteboard(whiteboard);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Whiteboard
                      </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
          {whiteboards.length === 0 && !wsLoading && (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg mt-8">
              <div className="text-gray-400 mb-4">
                <PenTool className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Whiteboards Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create a whiteboard to start collaborating on image reviews
          </p>
          <Button onClick={handleCreateWhiteboard} className="button-primary-enhanced hover-shimmer cyrus-ui">
            <Plus className="h-4 w-4 mr-2" />
                New Whiteboard
          </Button>
        </div>
          )}
        </>
      )}
    </div>
  );
}

export function WorkflowsView({ className, projects = [], onEnterFocusMode, onExitFocusMode }: WorkspaceViewProps) {
  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'create'>('list');
  const [selectedWorkflow, setSelectedWorkflow] = useState<BaseWorkspace | null>(null);

  const handleViewWorkflow = async (project: Project) => {
    try {
      // Try to get existing workflows for this project
      const workflows = await workspaceService.getWorkflows();
      const existingWorkflow = workflows.find(w => w.projectId === project.id);
      
      if (existingWorkflow) {
        setSelectedWorkflow(existingWorkflow);
        setCurrentView('detail');
        onEnterFocusMode?.();
      } else {
        // Create a new workflow for this project
        const newWorkflow = await workspaceService.createWorkflow({
          projectId: project.id,
          name: `${project.name} - Workflow`,
          createdBy: 'Current User',
          isArchived: false,
          collaborators: ['current-user'],
          settings: {
            isPublic: false,
            allowComments: true,
            allowEditing: true,
            autoSave: true
          }
        });

        setSelectedWorkflow(newWorkflow);
        setCurrentView('detail');
        onEnterFocusMode?.();
      }
    } catch (error) {
      console.error('Failed to handle workflow:', error);
      // Fallback to creating a mock workflow object for development
      const workflow = {
        id: `workflow-${project.id}`,
        projectId: project.id,
        name: `${project.name} - Workflow`,
        type: 'workflow' as const,
        createdBy: 'Current User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isArchived: false,
        collaborators: ['current-user'],
        settings: {
          isPublic: false,
          allowComments: true,
          allowEditing: true,
          autoSave: true
        }
      };

      setSelectedWorkflow(workflow);
      setCurrentView('detail');
      onEnterFocusMode?.();
    }
  };

  const handleCreateWorkflow = () => {
    setCurrentView('create');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedWorkflow(null);
    onExitFocusMode?.();
  };

  if (currentView === 'detail' && selectedWorkflow) {
    // Find the project that this workflow belongs to
    const project = projects.find(p => p.id === selectedWorkflow.projectId);
    
    return (
      <WorkflowDetail 
        workspace={selectedWorkflow}
        onBack={handleBackToList}
        className={className}
        project={project}
      />
    );
  }

  // Create view - Project selection
  if (currentView === 'create') {
    return (
      <div className={cn("p-6", className)}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentView('list')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Create Workflow</h2>
              <p className="text-muted-foreground">
                Select a project to create project workflow
              </p>
            </div>
          </div>

          {/* Project Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card 
                key={project.id}
                className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] border-l-4"
                style={{ borderLeftColor: '#3b82f6' }}
                onClick={() => handleViewWorkflow(project)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{project.client}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="outline">{project.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Created</span>
                      <span>{formatDate(project.createdAt)}</span>
                    </div>
                    <div className="pt-2">
                      <Button className="w-full" size="sm">
                        Create Workflow
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-6", className)}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground mt-2">
            Creative pipeline management and approval processes
          </p>
        </div>
        <Button onClick={handleCreateWorkflow} className="button-primary-enhanced hover-shimmer cyrus-ui">
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card 
            key={project.id} 
            className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] overflow-hidden"
            onClick={() => handleViewWorkflow(project)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <GitBranch className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{project.name} - Workflow</h3>
                  <p className="text-sm text-muted-foreground">Client: {project.client}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" />
                  <span>Pipeline</span>
                </div>
                <span>{formatDate(project.updatedAt)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {project.status}
                </Badge>
                <GitBranch className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Workflow Projects</h3>
          <p className="text-gray-500 mb-4">
            Create your first project workflow to start managing creative pipelines
          </p>
          <Button onClick={handleCreateWorkflow} className="button-primary-enhanced hover-shimmer cyrus-ui">
            <Plus className="h-4 w-4 mr-2" />
            Create Workflow
          </Button>
        </div>
      )}
    </div>
  );
}

export function TimelineView({ className, projects = [], onEnterFocusMode, onExitFocusMode }: WorkspaceViewProps) {
  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'create'>('list');
  const [selectedTimeline, setSelectedTimeline] = useState<BaseWorkspace | null>(null);

  const handleViewTimeline = async (project: any) => {
    try {
      // Try to get existing timelines for this project
      const timelines = await workspaceService.getTimelines(project.id);
      const existingTimeline = timelines.find(t => t.projectId === project.id);
      
      if (existingTimeline) {
        setSelectedTimeline(existingTimeline);
        setCurrentView('detail');
        onEnterFocusMode?.();
      } else {
        // Create a new timeline for this project
        const newTimeline = await workspaceService.createTimeline({
          projectId: project.id,
          name: `${project.name} - Timeline`,
          createdBy: 'Current User',
          isArchived: false,
          collaborators: ['current-user'],
          settings: {
            isPublic: false,
            allowComments: true,
            allowEditing: true,
            autoSave: true
          }
        });

        setSelectedTimeline(newTimeline);
        setCurrentView('detail');
        onEnterFocusMode?.();
      }
    } catch (error) {
      console.error('Failed to handle timeline:', error);
      // Fallback to creating a mock timeline object for development
      const timeline = {
        id: `timeline-${project.id}`,
        projectId: project.id,
        name: `${project.name} - Timeline`,
        type: 'timeline' as const,
        createdBy: 'Current User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isArchived: false,
        collaborators: ['current-user'],
        settings: {
          isPublic: false,
          allowComments: true,
          allowEditing: true,
          autoSave: true
        }
      };

      setSelectedTimeline(timeline);
      setCurrentView('detail');
      onEnterFocusMode?.();
    }
  };

  const handleCreateTimeline = () => {
    setCurrentView('create');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedTimeline(null);
    onExitFocusMode?.();
  };

  if (currentView === 'detail' && selectedTimeline) {
    return (
      <TimelineDetail 
        workspace={selectedTimeline}
        onBack={handleBackToList}
        className={className}
      />
    );
  }

  // Create view - Project selection
  if (currentView === 'create') {
    return (
      <div className={cn("p-6", className)}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentView('list')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Create Timeline</h2>
              <p className="text-muted-foreground">
                Select a project to create project timeline
              </p>
            </div>
          </div>

          {/* Project Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card 
                key={project.id}
                className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] border-l-4"
                style={{ borderLeftColor: '#3b82f6' }}
                onClick={() => handleViewTimeline(project)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{project.client}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="outline">{project.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Created</span>
                      <span>{formatDate(project.createdAt)}</span>
                    </div>
                    <div className="pt-2">
                      <Button className="w-full" size="sm">
                        Create Timeline
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-6", className)}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Timelines</h1>
          <p className="text-muted-foreground mt-2">
            Project timeline management with Gantt charts and milestone tracking
          </p>
        </div>
        <Button onClick={handleCreateTimeline} className="button-primary-enhanced hover-shimmer cyrus-ui">
          <Plus className="h-4 w-4 mr-2" />
          New Timeline
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => {
          // Calculate timeline metrics for this project
          const taskCount = Math.floor(Math.random() * 15) + 5;
          const completedTasks = Math.floor(Math.random() * taskCount);
          const completionPercentage = Math.round((completedTasks / taskCount) * 100);
          const milestoneCount = Math.floor(Math.random() * 5) + 2;
          const teamSize = Math.floor(Math.random() * 6) + 2;
          const isOnTrack = completionPercentage >= 60;
          const nextMilestone = ['Design Review', 'Beta Release', 'Client Approval', 'Launch Prep'][Math.floor(Math.random() * 4)];

          return (
            <Card 
              key={project.id} 
              className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] overflow-hidden"
              onClick={() => handleViewTimeline(project)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{project.name} Timeline</h3>
                    <p className="text-sm text-muted-foreground">Client: {project.client}</p>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">Progress</span>
                    <span className="text-xs text-muted-foreground">{completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-orange-500 h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div className="text-center">
                    <div className="font-semibold">{taskCount}</div>
                    <div className="text-muted-foreground">Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{milestoneCount}</div>
                    <div className="text-muted-foreground">Milestones</div>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between mb-2">
                  <Badge 
                    variant={isOnTrack ? "default" : "destructive"} 
                    className="text-xs"
                  >
                    {isOnTrack ? 'On Track' : 'Behind Schedule'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {teamSize} members
                  </span>
                </div>

                {/* Next Milestone */}
                <div className="text-xs text-muted-foreground mb-2">
                  Next: {nextMilestone}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDate(project.updatedAt)}</span>
                  <Clock className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Timeline Projects</h3>
          <p className="text-gray-500 mb-4">
            Create your first project timeline to start tracking tasks and milestones
          </p>
          <Button onClick={handleCreateTimeline}>
            <Plus className="h-4 w-4 mr-2" />
            Create Timeline
          </Button>
        </div>
      )}
    </div>
  );
}