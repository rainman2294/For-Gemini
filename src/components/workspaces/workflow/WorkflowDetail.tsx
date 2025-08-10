import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, CheckCircle, Clock, Users, AlertCircle, Filter, ChevronRight, Settings, BarChart3, FileText, List, Kanban, GitBranch, Calendar, User, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatDate } from '@/lib/utils';
import { BaseWorkspace, WorkflowStage, ChecklistItem, ApprovalRecord, WorkflowTemplate, WorkflowMetrics } from '@/types/workspace';
import { Project } from '@/types/project';
import { workspaceService } from '@/services/workspaceService';
import WorkflowStageCard from './WorkflowStageCard';
import WorkflowPipeline from './WorkflowPipeline';
import ChecklistManager from './ChecklistManager';
import ApprovalSystem from './ApprovalSystem';
import StageCreationDialog from './StageCreationDialog';

interface WorkflowDetailProps {
  workspace: BaseWorkspace;
  onBack: () => void;
  className?: string;
  project?: Project; // Add project prop for real data
}

export default function WorkflowDetail({ workspace, onBack, className, project }: WorkflowDetailProps) {
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [selectedStage, setSelectedStage] = useState<WorkflowStage | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [metrics, setMetrics] = useState<WorkflowMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(true); // Track API availability
  const [viewMode, setViewMode] = useState<'pipeline' | 'list' | 'kanban'>('pipeline');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'order' | 'dueDate' | 'priority' | 'status'>('order');
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'assign' | 'complete' | 'skip' | null>(null);

  useEffect(() => {
    loadWorkflowData();
  }, [workspace.id]);

  useEffect(() => {
    if (selectedStage) {
      // Add a small delay to prevent rapid API calls
      const timeoutId = setTimeout(() => {
        loadStageDetails(selectedStage.id);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [selectedStage]);

  const loadWorkflowData = async () => {
    try {
      setIsLoading(true);
      
      // Load workflow data from WordPress API
      const [stagesResult, templatesResult, metricsResult] = await Promise.allSettled([
        workspaceService.getWorkflowStages(workspace.id),
        workspaceService.getWorkflowTemplates(),
        workspaceService.getWorkflowMetrics(workspace.id)
      ]);
      
      // Handle stages data
      if (stagesResult.status === 'fulfilled') {
        setStages(stagesResult.value);
        setApiAvailable(true); // API is working
        if (stagesResult.value.length > 0 && !selectedStage) {
          setSelectedStage(stagesResult.value[0]);
        }
      } else {
        console.warn('API not available, creating workflow from project data');
        setApiAvailable(false); // API is not working
        // Create workflow stages based on real project data
        const projectStages = createWorkflowFromProject(project);
        setStages(projectStages);
        if (projectStages.length > 0 && !selectedStage) {
          setSelectedStage(projectStages[0]);
        }
      }
      
      // Handle templates data
      if (templatesResult.status === 'fulfilled') {
        setTemplates(templatesResult.value);
      } else {
        setTemplates([]);
      }
      
      // Handle metrics data
      if (metricsResult.status === 'fulfilled') {
        setMetrics(metricsResult.value);
      } else {
        setMetrics(null);
      }
    } catch (error) {
      console.warn('Failed to load workflow data, using fallback:', error);
      // Use fallback data when everything fails
      const projectStages = createWorkflowFromProject(project);
      setStages(projectStages);
      if (projectStages.length > 0 && !selectedStage) {
        setSelectedStage(projectStages[0]);
      }
      setTemplates([]);
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Map project status to workflow status
  const mapProjectStatusToWorkflowStatus = (projectStatus: string): 'not_started' | 'in_progress' | 'completed' => {
    switch (projectStatus) {
      case 'delivered':
      case 'render-approved':
        return 'completed';
      case 'preview':
      case 'preview-feedback':
      case 'preview-approved':
      case 'rendering':
      case 'waiting-preview-reply':
      case 'waiting-render-reply':
        return 'in_progress';
      default:
        return 'not_started';
    }
  };

  // Create workflow stages based on real project data
  const createWorkflowFromProject = (project?: Project): WorkflowStage[] => {
    if (!project) {
      return [];
    }

    const workflowStatus = mapProjectStatusToWorkflowStatus(project.status);

    const baseStages: WorkflowStage[] = [
      {
        id: 'stage-1',
        workspaceId: workspace.id,
        name: 'Project Brief Review',
        description: `Review project requirements for ${project.name}`,
        order: 0,
        isRequired: true,
        assignedTo: project.artists.map(artist => artist.id),
        status: workflowStatus,
        dependencies: [],
        estimatedHours: 4,
        actualHours: 0,
        dueDate: project.startDate,
        priority: project.priority,
        checklistItems: [],
        completedAt: workflowStatus === 'completed' ? project.updatedAt : null,
        completedBy: project.projectManager,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      {
        id: 'stage-2',
        workspaceId: workspace.id,
        name: 'Design Development',
        description: `Create initial design concepts for ${project.name}`,
        order: 1,
        isRequired: true,
        assignedTo: project.artists.map(artist => artist.id),
        status: workflowStatus,
        dependencies: ['stage-1'],
        estimatedHours: 16,
        actualHours: 0,
        dueDate: new Date(new Date(project.startDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: project.priority,
        checklistItems: [],
        completedAt: workflowStatus === 'completed' ? project.updatedAt : null,
        completedBy: project.projectManager,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      {
        id: 'stage-3',
        workspaceId: workspace.id,
        name: 'Client Review',
        description: `Present designs to ${project.client} for feedback`,
        order: 2,
        isRequired: true,
        assignedTo: [project.projectManager],
        status: workflowStatus === 'completed' ? 'completed' : 'not_started',
        dependencies: ['stage-2'],
        estimatedHours: 4,
        actualHours: 0,
        dueDate: project.endDate,
        priority: project.priority,
        checklistItems: [],
        completedAt: workflowStatus === 'completed' ? project.updatedAt : null,
        completedBy: project.projectManager,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }
    ];

    return baseStages;
  };

  const loadStageDetails = async (stageId: string) => {
    // Skip API calls if we know the API is not available
    if (!apiAvailable) {
      console.warn('API not available, using project-based data for stage details');
      const projectChecklist = createChecklistFromProject(stageId, project);
      setChecklistItems(projectChecklist);
      setApprovals([]);
      return;
    }

    try {
      // Try to load from API first
      const [checklistResult, approvalsResult] = await Promise.allSettled([
        workspaceService.getStageChecklistItems(stageId),
        workspaceService.getWorkflowApprovals({ stageId })
      ]);
      
      // Handle checklist data
      if (checklistResult.status === 'fulfilled') {
        setChecklistItems(checklistResult.value);
      } else {
        console.warn('API not available for stage details, using project-based data');
        setApiAvailable(false); // Mark API as unavailable
        // Create checklist from project data
        const projectChecklist = createChecklistFromProject(stageId, project);
        setChecklistItems(projectChecklist);
      }
      
      // Handle approvals data
      if (approvalsResult.status === 'fulfilled') {
        setApprovals(approvalsResult.value);
      } else {
        setApprovals([]);
      }
    } catch (error) {
      console.warn('Failed to load stage details, using fallback data:', error);
      setApiAvailable(false); // Mark API as unavailable
      // Use fallback data
      const projectChecklist = createChecklistFromProject(stageId, project);
      setChecklistItems(projectChecklist);
      setApprovals([]);
    }
  };

  // Create checklist items based on project data
  const createChecklistFromProject = (stageId: string, project?: Project): ChecklistItem[] => {
    if (!project) return [];

    const workflowStatus = mapProjectStatusToWorkflowStatus(project.status);

    const checklistItems: ChecklistItem[] = [
      {
        id: 'item-1',
        stageId: stageId,
        text: `Review ${project.name} requirements`,
        description: `Go through the detailed requirements for ${project.name} and note any questions`,
        completed: workflowStatus !== 'not_started',
        completedBy: workflowStatus !== 'not_started' ? project.projectManager : undefined,
        completedAt: workflowStatus !== 'not_started' ? project.updatedAt : undefined,
        estimatedHours: 2,
        actualHours: workflowStatus !== 'not_started' ? 1.5 : undefined,
        priority: project.priority,
        tags: [],
        dependencies: [],
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      {
        id: 'item-2',
        stageId: stageId,
        text: `Schedule kickoff meeting with ${project.client}`,
        description: `Coordinate with ${project.client} and team for project kickoff`,
        completed: workflowStatus === 'completed',
        completedBy: workflowStatus === 'completed' ? project.projectManager : undefined,
        completedAt: workflowStatus === 'completed' ? project.updatedAt : undefined,
        estimatedHours: 1,
        actualHours: workflowStatus === 'completed' ? 0.5 : undefined,
        priority: 'medium',
        tags: [],
        dependencies: [],
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      {
        id: 'item-3',
        stageId: stageId,
        text: `Create project timeline`,
        description: `Draft initial timeline with key milestones for ${project.name}`,
        completed: false,
        completedBy: undefined,
        completedAt: undefined,
        estimatedHours: 3,
        actualHours: undefined,
        priority: 'medium',
        tags: [],
        dependencies: [],
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }
    ];

    return checklistItems;
  };

  // Utility functions
  const getFilteredAndSortedStages = () => {
    let filteredStages = stages;

    if (filterStatus !== 'all') {
      filteredStages = filteredStages.filter(stage => stage.status === filterStatus);
    }

    if (filterAssignee !== 'all') {
      filteredStages = filteredStages.filter(stage => 
        stage.assignedTo.includes(filterAssignee)
      );
    }

          return filteredStages.sort((a, b) => {
        switch (sortBy) {
          case 'dueDate': {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          }
          case 'priority': {
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          case 'status': {
            const statusOrder = { not_started: 0, in_progress: 1, completed: 2, skipped: 3, blocked: 4 };
            return statusOrder[a.status] - statusOrder[b.status];
          }
          case 'order':
          default:
            return a.order - b.order;
        }
      });
  };

  const getStageProgress = () => {
    if (stages.length === 0) return 0;
    const completedStages = stages.filter(stage => stage.status === 'completed').length;
    return Math.round((completedStages / stages.length) * 100);
  };

  const getWorkflowProgress = () => {
    if (stages.length === 0) return 0;
    const completedStages = stages.filter(stage => stage.status === 'completed').length;
    return Math.round((completedStages / stages.length) * 100);
  };

  const getStageStatusBadge = (status: string) => {
    const statusConfig = {
      not_started: { color: 'bg-slate-500/20 border-slate-500/30', text: 'Not Started', icon: Clock },
      in_progress: { color: 'bg-blue-500/20 border-blue-500/30', text: 'In Progress', icon: BarChart3 },
      completed: { color: 'bg-green-500/20 border-green-500/30', text: 'Completed', icon: CheckCircle },
      skipped: { color: 'bg-gray-500/20 border-gray-500/30', text: 'Skipped', icon: AlertCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_started;
    const IconComponent = config.icon;
    
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs border backdrop-blur-sm",
          config.color
        )}
      >
        <IconComponent className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const handleStageCreated = (newStage: WorkflowStage) => {
    setStages(prev => [...prev, newStage].sort((a, b) => a.order - b.order));
    setSelectedStage(newStage);
    setShowStageDialog(false);
  };

  const handleStageCompleted = async (stageId: string) => {
    try {
      // Try to use the API first
      await workspaceService.completeWorkflowStage(stageId);
      // Only reload data if API call was successful
      await loadWorkflowData();
    } catch (error) {
      console.warn('API not available, updating local state');
      // Update local state when API is not available
      setStages(prevStages => 
        prevStages.map(stage => 
          stage.id === stageId 
            ? { 
                ...stage, 
                status: 'completed' as const,
                completedAt: new Date().toISOString(),
                completedBy: 'current-user' // You can replace this with actual user ID
              }
            : stage
        )
      );
      
      // Update selected stage if it's the one being completed
      if (selectedStage?.id === stageId) {
        setSelectedStage(prev => prev ? {
          ...prev,
          status: 'completed' as const,
          completedAt: new Date().toISOString(),
          completedBy: 'current-user'
        } : null);
      }
      
      // Don't call loadWorkflowData() when API is not available
      // This prevents the cascade of API errors
    }
  };

  const handleStageStarted = async (stageId: string) => {
    try {
      // Try to use the API first
      await workspaceService.updateWorkflowStage(stageId, { status: 'in_progress' });
      // Only reload data if API call was successful
      await loadWorkflowData();
    } catch (error) {
      console.warn('API not available, updating local state');
      // Update local state when API is not available
      setStages(prevStages => 
        prevStages.map(stage => 
          stage.id === stageId 
            ? { ...stage, status: 'in_progress' as const }
            : stage
        )
      );
      
      // Update selected stage if it's the one being started
      if (selectedStage?.id === stageId) {
        setSelectedStage(prev => prev ? {
          ...prev,
          status: 'in_progress' as const
        } : null);
      }
      
      // Don't call loadWorkflowData() when API is not available
      // This prevents the cascade of API errors
    }
  };

  const handleChecklistUpdated = () => {
    if (selectedStage) {
      loadStageDetails(selectedStage.id);
    }
  };

  const handleApprovalUpdated = () => {
    if (selectedStage) {
      loadStageDetails(selectedStage.id);
    }
  };

  const filteredStages = getFilteredAndSortedStages();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header - Match moodboard/whiteboard styling */}
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{workspace.name}</h1>
              {project && (
                <div className="flex gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {project.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {project.priority}
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {project && (
                <>
                  <div className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    <span>{project.client}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <GitBranch className="h-3.5 w-3.5" />
                    <span>{stages.length} stages</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>{getWorkflowProgress()}% complete</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(workspace.createdAt, 'MMMM d, yyyy')}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
          <Select value={viewMode} onValueChange={(value: 'pipeline' | 'list' | 'kanban') => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pipeline">Pipeline</SelectItem>
              <SelectItem value="list">List</SelectItem>
              <SelectItem value="kanban">Kanban</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            onClick={() => setShowStageDialog(!showStageDialog)}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {showStageDialog ? 'Cancel' : 'Add Stage'}
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">{getWorkflowProgress()}%</span>
            </div>
            <div className="w-full bg-muted/20 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${getWorkflowProgress()}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>{stages.filter(s => s.status === 'completed').length} of {stages.length} stages completed</span>
              {project && (
                <span>Due {formatDate(project.endDate)}</span>
              )}
            </div>
            
            {/* Status Summary Cards */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="glass-card p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p className="text-sm font-bold text-green-600">
                      {stages.filter(s => s.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Play className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                    <p className="text-sm font-bold text-blue-600">
                      {stages.filter(s => s.status === 'in_progress').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                    <Clock className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="text-sm font-bold text-orange-600">
                      {stages.filter(s => s.status === 'not_started').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stage Creation Dialog */}
      {showStageDialog && (
        <div className="mb-6">
          <Card>
            <CardContent className="p-6">
              <StageCreationDialog 
                workspaceId={workspace.id}
                onStageCreated={handleStageCreated}
                nextOrder={stages.length}
                existingStages={stages}
                onClose={() => setShowStageDialog(false)}
                project={project}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content - Full Width Stages */}
      <div className="space-y-6">
        {/* Workflow View */}
        <div>
          {viewMode === 'pipeline' && (
            <WorkflowPipeline 
              stages={filteredStages}
              selectedStage={selectedStage}
              onStageSelect={setSelectedStage}
              onStageCompleted={handleStageCompleted}
              onStageStarted={handleStageStarted}
            />
          )}
          
          {viewMode === 'list' && (
            <div className="space-y-4">
              {filteredStages.map(stage => (
                <WorkflowStageCard
                  key={stage.id}
                  stage={stage}
                  isSelected={selectedStage?.id === stage.id}
                  onClick={() => setSelectedStage(stage)}
                  onCompleted={() => handleStageCompleted(stage.id)}
                  onStarted={() => handleStageStarted(stage.id)}
                />
              ))}
            </div>
          )}

          {viewMode === 'kanban' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['not_started', 'in_progress', 'completed'].map(status => (
                <div key={status} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      status === 'not_started' && 'bg-slate-500',
                      status === 'in_progress' && 'bg-blue-500',
                      status === 'completed' && 'bg-green-500'
                    )} />
                    <h3 className="font-semibold capitalize">
                      {status.replace('_', ' ')}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {stages.filter(s => s.status === status).length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {stages
                      .filter(stage => stage.status === status)
                      .map(stage => (
                        <Card
                          key={stage.id}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md",
                            selectedStage?.id === stage.id && 'ring-2 ring-primary'
                          )}
                          onClick={() => setSelectedStage(stage)}
                        >
                          <CardContent className="p-3">
                            <h4 className="font-medium text-sm">{stage.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {stage.assignedTo.length} assigned
                            </p>
                          </CardContent>
                        </Card>
                      ))
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stage Details Panel - Now below stages */}
        {selectedStage && (
          <div className="space-y-6">
            {/* Stage Info and Checklist Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Stage Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{selectedStage.name}</CardTitle>
                    {getStageStatusBadge(selectedStage.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {selectedStage.description}
                  </p>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>{selectedStage.assignedTo.length} assigned</span>
                  </div>
                  
                  {selectedStage.dueDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>Due {formatDate(selectedStage.dueDate)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      {checklistItems.filter(item => item.completed).length} / {checklistItems.length} tasks completed
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Checklist - Spans 2 columns for more room */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Checklist</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChecklistManager
                    stageId={selectedStage.id}
                    items={checklistItems}
                    onUpdated={handleChecklistUpdated}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Approvals - Now below the stage details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                <ApprovalSystem
                  stageId={selectedStage.id}
                  workspaceId={workspace.id}
                  approvals={approvals}
                  onUpdated={handleApprovalUpdated}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}