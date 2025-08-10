import React from 'react';
import { 
  Palette, 
  PenTool, 
  GitBranch, 
  Calendar, 
  Plus, 
  Settings,
  Users,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { BaseWorkspace, WorkspaceType } from '@/types/workspace';

interface WorkspaceNavProps {
  projectId: string;
  workspaces: BaseWorkspace[];
  activeWorkspaceId?: string;
  onWorkspaceSelect: (workspaceId: string) => void;
  onCreateWorkspace: (type: WorkspaceType) => void;
  className?: string;
}

const workspaceConfig = {
  moodboard: {
    icon: Palette,
    label: 'Moodboard',
    description: 'Visual inspiration and mood exploration',
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
    darkColor: 'bg-purple-900/20',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-200',
  },
  whiteboard: {
    icon: PenTool,
    label: 'Whiteboard',
    description: 'Interactive brainstorming and sketching',
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    darkColor: 'bg-blue-900/20',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
  },
  workflow: {
    icon: GitBranch,
    label: 'Workflow',
    description: 'Creative pipeline and approval process',
    color: 'bg-green-500',
    lightColor: 'bg-green-50',
    darkColor: 'bg-green-900/20',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
  },
  timeline: {
    icon: Calendar,
    label: 'Timeline',
    description: 'Task scheduling and team workload',
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50',
    darkColor: 'bg-orange-900/20',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-200',
  }
} as const;

export function WorkspaceNav({ 
  projectId, 
  workspaces, 
  activeWorkspaceId, 
  onWorkspaceSelect, 
  onCreateWorkspace,
  className 
}: WorkspaceNavProps) {
  const groupedWorkspaces = workspaces.reduce((acc, workspace) => {
    if (!acc[workspace.type]) {
      acc[workspace.type] = [];
    }
    acc[workspace.type].push(workspace);
    return acc;
  }, {} as Record<WorkspaceType, BaseWorkspace[]>);

  const getWorkspaceStats = (type: WorkspaceType) => {
    const typeWorkspaces = groupedWorkspaces[type] || [];
    const active = typeWorkspaces.filter(w => !w.isArchived).length;
    const total = typeWorkspaces.length;
    return { active, total };
  };

  const renderWorkspaceSection = (type: WorkspaceType) => {
    const config = workspaceConfig[type];
    const typeWorkspaces = groupedWorkspaces[type] || [];
    const stats = getWorkspaceStats(type);
    const Icon = config.icon;

    return (
      <div key={type} className="space-y-2">
        {/* Section Header */}
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center",
              config.color
            )}>
              <Icon className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {config.label}
            </span>
            {stats.total > 0 && (
              <Badge variant="secondary" className="text-xs">
                {stats.active}
              </Badge>
            )}
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCreateWorkspace(type)}
                  className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Create {config.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Workspace List */}
        <div className="space-y-1 pl-2">
          {typeWorkspaces.length === 0 ? (
            <button
              onClick={() => onCreateWorkspace(type)}
              className={cn(
                "w-full text-left p-2 rounded-md border-2 border-dashed transition-colors",
                "hover:border-gray-300 dark:hover:border-gray-600",
                config.borderColor,
                "text-gray-500 dark:text-gray-400"
              )}
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span className="text-sm">Create {config.label}</span>
              </div>
              <p className="text-xs mt-1 opacity-75">
                {config.description}
              </p>
            </button>
          ) : (
            typeWorkspaces.map((workspace) => (
              <WorkspaceItem
                key={workspace.id}
                workspace={workspace}
                config={config}
                isActive={workspace.id === activeWorkspaceId}
                onClick={() => onWorkspaceSelect(workspace.id)}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Workspaces
        </h3>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs">
            {workspaces.filter(w => !w.isArchived).length} active
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Workspace Sections */}
      <div className="space-y-6">
        {Object.keys(workspaceConfig).map((type) => 
          renderWorkspaceSection(type as WorkspaceType)
        )}
      </div>

      {/* Quick Actions */}
      <Separator />
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 px-2">
          Quick Actions
        </h4>
        <div className="grid grid-cols-2 gap-2 px-2">
          <Button variant="outline" size="sm" className="justify-start">
            <Users className="w-4 h-4 mr-2" />
            Collaborators
          </Button>
          <Button variant="outline" size="sm" className="justify-start">
            <Clock className="w-4 h-4 mr-2" />
            Activity
          </Button>
        </div>
      </div>
    </div>
  );
}

interface WorkspaceItemProps {
  workspace: BaseWorkspace;
  config: typeof workspaceConfig[keyof typeof workspaceConfig];
  isActive: boolean;
  onClick: () => void;
}

function WorkspaceItem({ workspace, config, isActive, onClick }: WorkspaceItemProps) {
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "w-full text-left p-2 rounded-md transition-all duration-200",
              "hover:bg-gray-50 dark:hover:bg-gray-800/50",
              "border border-transparent",
              isActive && [
                config.lightColor,
                "dark:" + config.darkColor,
                config.borderColor,
                "border-opacity-50"
              ],
              workspace.isArchived && "opacity-50"
            )}
          >
            <div className="flex items-start gap-2">
              <div className={cn(
                "w-4 h-4 rounded-sm flex items-center justify-center flex-shrink-0 mt-0.5",
                isActive ? config.color : "bg-gray-200 dark:bg-gray-700"
              )}>
                <Icon className={cn(
                  "w-2.5 h-2.5",
                  isActive ? "text-white" : "text-gray-500 dark:text-gray-400"
                )} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-medium truncate",
                    isActive ? config.textColor : "text-gray-700 dark:text-gray-300"
                  )}>
                    {workspace.name}
                  </span>
                  {workspace.collaborators.length > 1 && (
                    <div className="flex -space-x-1">
                      {workspace.collaborators.slice(0, 3).map((collaboratorId, idx) => (
                        <div
                          key={collaboratorId}
                          className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600 border border-white dark:border-gray-800 flex items-center justify-center"
                        >
                          <span className="text-[8px] font-medium text-gray-600 dark:text-gray-300">
                            {idx + 1}
                          </span>
                        </div>
                      ))}
                      {workspace.collaborators.length > 3 && (
                        <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 border border-white dark:border-gray-800 flex items-center justify-center">
                          <span className="text-[8px] font-medium text-gray-500 dark:text-gray-400">
                            +{workspace.collaborators.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Updated {new Date(workspace.updatedAt).toLocaleDateString()}
                  </span>
                  {workspace.settings.isPublic && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      Public
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div>
            <p className="font-medium">{workspace.name}</p>
            <p className="text-xs text-gray-500">
              {config.description}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {workspace.collaborators.length} collaborator{workspace.collaborators.length !== 1 ? 's' : ''}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}