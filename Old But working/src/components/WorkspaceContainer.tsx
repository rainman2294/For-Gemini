import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Users, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  BaseWorkspace, 
  MoodboardWorkspace, 
  WhiteboardWorkspace, 
  WorkflowWorkspace, 
  TimelineWorkspace, 
  WorkspaceType 
} from '@/types/workspace';
import { Project } from '@/types/project';
import { workspaceService } from '@/services/workspaceService';
import { WorkspaceNav } from './WorkspaceNav';
import { MoodboardWorkspace as MoodboardComponent } from './workspaces/MoodboardWorkspace';
// Import other workspace components as they're created
// import { WhiteboardWorkspace } from './workspaces/WhiteboardWorkspace';
// import { WorkflowWorkspace } from './workspaces/WorkflowWorkspace';
// import { TimelineWorkspace } from './workspaces/TimelineWorkspace';

interface WorkspaceContainerProps {
  project: Project;
  userId: string;
  userName: string;
  onBack: () => void;
  className?: string;
}

export function WorkspaceContainer({ 
  project, 
  userId, 
  userName, 
  onBack,
  className 
}: WorkspaceContainerProps) {
  const { toast } = useToast();
  
  const [workspaces, setWorkspaces] = useState<BaseWorkspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<BaseWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load workspaces for the project
  useEffect(() => {
    loadWorkspaces();
  }, [project.id]);

  // Load active workspace details when selection changes
  useEffect(() => {
    if (activeWorkspaceId) {
      loadActiveWorkspace(activeWorkspaceId);
    } else {
      setActiveWorkspace(null);
    }
  }, [activeWorkspaceId]);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For now, use mock data - replace with real API call
      const projectWorkspaces = await workspaceService.getMockWorkspaces(project.id);
      setWorkspaces(projectWorkspaces);
      
      // Auto-select first workspace if none selected
      if (projectWorkspaces.length > 0 && !activeWorkspaceId) {
        setActiveWorkspaceId(projectWorkspaces[0].id);
      }
    } catch (err) {
      setError('Failed to load workspaces');
      console.error('Error loading workspaces:', err);
      toast({
        title: "Error",
        description: "Failed to load workspaces. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadActiveWorkspace = async (workspaceId: string) => {
    try {
      // For now, use the workspace from the list - replace with detailed API call
      const workspace = workspaces.find(w => w.id === workspaceId);
      if (workspace) {
        // Enhance with mock data based on type
        const enhancedWorkspace = await enhanceWorkspaceWithMockData(workspace);
        setActiveWorkspace(enhancedWorkspace);
      }
    } catch (err) {
      console.error('Error loading workspace details:', err);
      toast({
        title: "Error",
        description: "Failed to load workspace details.",
        variant: "destructive",
      });
    }
  };

  const enhanceWorkspaceWithMockData = async (workspace: BaseWorkspace): Promise<BaseWorkspace> => {
    // Add type-specific mock data
    switch (workspace.type) {
      case 'moodboard':
        return {
          ...workspace,
          canvas: {
            width: 1920,
            height: 1080,
            background: '#f8f9fa',
            elements: [
              {
                id: 'element-1',
                type: 'image',
                position: { x: 100, y: 100, z: 1 },
                size: { width: 200, height: 150 },
                content: {
                  url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=300&fit=crop',
                  filename: 'inspiration-1.jpg',
                  originalWidth: 800,
                  originalHeight: 600
                },
                annotations: [
                  {
                    id: 'annotation-1',
                    position: { x: 50, y: 20, z: 0 },
                    content: 'Love this color palette!',
                    authorId: userId,
                    authorName: userName,
                    createdAt: new Date().toISOString(),
                    resolved: false,
                    replies: []
                  }
                ],
                createdBy: userId,
                createdAt: new Date(Date.now() - 3600000).toISOString()
              },
              {
                id: 'element-2',
                type: 'text',
                position: { x: 350, y: 100, z: 2 },
                size: { width: 250, height: 60 },
                content: {
                  text: 'Brand Direction: Modern & Minimalist',
                  fontSize: 18,
                  fontFamily: 'Inter',
                  color: '#1f2937'
                },
                annotations: [],
                createdBy: userId,
                createdAt: new Date(Date.now() - 7200000).toISOString()
              },
              {
                id: 'element-3',
                type: 'color-swatch',
                position: { x: 100, y: 280, z: 3 },
                size: { width: 80, height: 80 },
                content: {
                  color: '#3b82f6',
                  name: 'Primary Blue'
                },
                annotations: [],
                createdBy: userId,
                createdAt: new Date(Date.now() - 1800000).toISOString()
              }
            ]
          },
          inspirationSources: [
            {
              id: 'source-1',
              url: 'https://dribbble.com/shots/example',
              title: 'Modern Dashboard Design',
              description: 'Clean and minimal approach',
              thumbnail: 'https://images.unsplash.com/photo-1558618666-fbd6c327c5ec?w=200&h=150&fit=crop',
              addedBy: userId,
              addedAt: new Date().toISOString()
            }
          ]
        } as MoodboardWorkspace;
      
      // Add other workspace types as they're implemented
      default:
        return workspace;
    }
  };

  const handleCreateWorkspace = async (type: WorkspaceType) => {
    try {
      const workspaceName = `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
      
      const newWorkspace: Omit<BaseWorkspace, 'id' | 'createdAt' | 'updatedAt'> = {
        projectId: project.id,
        name: workspaceName,
        type,
        createdBy: userId,
        isArchived: false,
        collaborators: [userId],
        settings: {
          isPublic: false,
          allowComments: true,
          allowEditing: true,
          autoSave: true
        }
      };

      // For now, create a mock workspace - replace with real API call
      const createdWorkspace: BaseWorkspace = {
        ...newWorkspace,
        id: `${type}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setWorkspaces(prev => [...prev, createdWorkspace]);
      setActiveWorkspaceId(createdWorkspace.id);
      
      toast({
        title: "Workspace Created",
        description: `${workspaceName} has been created successfully.`,
      });
    } catch (err) {
      console.error('Error creating workspace:', err);
      toast({
        title: "Error",
        description: "Failed to create workspace. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleWorkspaceUpdate = (updatedWorkspace: BaseWorkspace) => {
    setActiveWorkspace(updatedWorkspace);
    setWorkspaces(prev => 
      prev.map(w => w.id === updatedWorkspace.id ? updatedWorkspace : w)
    );
  };

  const renderActiveWorkspace = () => {
    if (!activeWorkspace) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">No workspace selected</h3>
            <p className="text-sm">Choose a workspace from the sidebar or create a new one.</p>
          </div>
        </div>
      );
    }

    switch (activeWorkspace.type) {
      case 'moodboard':
        return (
          <MoodboardComponent
            workspace={activeWorkspace as MoodboardWorkspace}
            projectId={project.id}
            userId={userId}
            userName={userName}
            onUpdate={handleWorkspaceUpdate}
          />
        );
      
      case 'whiteboard':
        return (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Whiteboard Workspace</h3>
              <p className="text-sm">Coming soon - Interactive brainstorming and sketching</p>
            </div>
          </div>
        );
      
      case 'workflow':
        return (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Workflow Workspace</h3>
              <p className="text-sm">Coming soon - Creative pipeline and approval process</p>
            </div>
          </div>
        );
      
      case 'timeline':
        return (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Timeline Workspace</h3>
              <p className="text-sm">Coming soon - Task scheduling and team workload</p>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Unknown workspace type</h3>
              <p className="text-sm">This workspace type is not supported yet.</p>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className={cn("flex h-full items-center justify-center", className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex h-full items-center justify-center", className)}>
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Button onClick={loadWorkspaces} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-gray-50 dark:bg-gray-900", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {project.name}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {project.client} • Workspaces
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {activeWorkspace && (
            <>
              <Badge variant="outline" className="capitalize">
                {activeWorkspace.type}
              </Badge>
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4 mr-2" />
                {activeWorkspace.collaborators.length}
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Workspace Navigation */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full p-4 bg-white dark:bg-gray-800 border-r overflow-y-auto">
              <WorkspaceNav
                projectId={project.id}
                workspaces={workspaces}
                activeWorkspaceId={activeWorkspaceId}
                onWorkspaceSelect={setActiveWorkspaceId}
                onCreateWorkspace={handleCreateWorkspace}
              />
            </div>
          </ResizablePanel>
          
          <ResizableHandle />
          
          {/* Active Workspace */}
          <ResizablePanel defaultSize={80}>
            {renderActiveWorkspace()}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}