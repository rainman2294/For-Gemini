import * as React from 'react';
import { useState, useMemo } from 'react';
import { Project, ProjectStatus, ProjectMedia } from '@/types/project';
import { Avatar } from '@/components/ui/avatar';
import { AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronRight, Image as ImageIcon, FileText, MoreVertical, Edit, Archive, ArchiveRestore, Trash2, Palette, PenTool, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Timeline } from './Timeline';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  projectStatuses,
  getStatusColorClass,
  getStatusBorderColorClass,
  getPriorityColor,
} from "@/lib/statuses";
import { LightboxModal } from "./LightboxModal";
import { workspaceService } from '@/services/workspaceService';

interface MondayViewProps {
  projects: Project[];
  onEditProject: (project: Project) => void;
  onStatusChange: (project: Project, newStatus: ProjectStatus) => void;
  onArchiveProject: (project: Project) => void;
  onRestoreProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  isLoggedIn: boolean;
  onProjectClick: (projectId: string) => void;
}

type GroupedProjects = {
  [key: string]: Project[];
};

const MondayView: React.FC<MondayViewProps> = ({
  projects,
  onEditProject,
  onStatusChange,
  onArchiveProject,
  onRestoreProject,
  onDeleteProject,
  isLoggedIn,
  onProjectClick,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Active', 'This month', 'Next month']));
  const [lightboxState, setLightboxState] = useState<{ media: ProjectMedia[]; index: number } | null>(null);

  const groupedProjects = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const grouped: GroupedProjects = {
      'Active': [],
      'This month': [],
      'Next month': [],
      'Future': [],
      'Past': [],
    };
    
    projects.forEach(project => {
      if (project.status !== 'delivered' && !project.isArchived) {
        grouped['Active'].push(project);
      }
      
      const endDate = project.endDate ? new Date(project.endDate) : null;
      if (!endDate) {
        if (!grouped['Future'].find(p => p.id === project.id)) grouped['Future'].push(project);
        return;
      }
      
      const projectMonth = endDate.getMonth();
      const projectYear = endDate.getFullYear();
      
      if (projectYear < currentYear || (projectYear === currentYear && projectMonth < currentMonth)) {
        if (!grouped['Past'].find(p => p.id === project.id)) grouped['Past'].push(project);
      } else if (projectYear === currentYear && projectMonth === currentMonth) {
        if (!grouped['This month'].find(p => p.id === project.id)) grouped['This month'].push(project);
      } else if (projectYear === currentYear && projectMonth === currentMonth + 1) {
        if (!grouped['Next month'].find(p => p.id === project.id)) grouped['Next month'].push(project);
      } else {
        if (!grouped['Future'].find(p => p.id === project.id)) grouped['Future'].push(project);
      }
    });
    
    return grouped;
  }, [projects]);

  const toggleGroup = (group: string) => {
    const newExpandedGroups = new Set(expandedGroups);
    if (newExpandedGroups.has(group)) {
      newExpandedGroups.delete(group);
    } else {
      newExpandedGroups.add(group);
    }
    setExpandedGroups(newExpandedGroups);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleImageClick = (project: Project) => {
    if (project.media.length > 0) {
      setLightboxState({ media: project.media, index: 0 });
    }
  };

  const handleMoodboard = async (project) => {
    try {
      const moodboard = await workspaceService.createWorkspaceForProject(project.id, 'moodboard');
      console.log('Moodboard:', moodboard.workspace.id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleWhiteboard = async (project) => {
    try {
      const whiteboard = await workspaceService.createWorkspaceForProject(project.id, 'whiteboard');
      console.log('Whiteboard:', whiteboard.workspace.id);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {Object.entries(groupedProjects).map(([group, groupProjects]) => (
        <Card key={group} className="glass-card shadow-md monday-group-card">
          <div 
            className="flex justify-between items-center px-6 py-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors monday-group-header"
            onClick={() => toggleGroup(group)}
          >
            <div className="flex items-center gap-2">
              {expandedGroups.has(group) ? 
                <ChevronDown className="h-5 w-5 text-muted-foreground" /> : 
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              }
              <h3 className="text-lg font-semibold">{group}</h3>
              <Badge variant="outline" className="ml-2 bg-primary/10">{groupProjects.length}</Badge>
            </div>
          </div>
          
          {expandedGroups.has(group) && groupProjects.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-muted bg-muted/30">
                    <th className="text-left py-1 px-4 pl-6 w-[16%] font-medium text-sm text-muted-foreground">Project</th>
                    <th className="text-left py-1 px-4 w-20 font-medium text-sm text-muted-foreground">PM</th>
                    <th className="text-center py-1 px-4 w-[12rem] font-medium text-sm text-muted-foreground">Status</th>
                    <th className="text-center py-1 px-4 font-medium text-sm text-muted-foreground">Timeline</th>
                    <th className="text-center py-1 px-4 w-20 font-medium text-sm text-muted-foreground">Images</th>
                    <th className="text-center py-1 px-4 w-24 font-medium text-sm text-muted-foreground">Brief</th>
                    <th className="text-center py-1 px-4 w-24 font-medium text-sm text-muted-foreground">
                      <div className="flex items-center justify-center gap-1">
                        <Palette className="h-3 w-3" />
                        <span>Moodboard</span>
                      </div>
                    </th>
                    <th className="text-center py-1 px-4 w-24 font-medium text-sm text-muted-foreground">
                      <div className="flex items-center justify-center gap-1">
                        <PenTool className="h-3 w-3" />
                        <span>Whiteboard</span>
                      </div>
                    </th>
                    <th className="py-1 px-4 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {groupProjects.map(project => (
                    <tr 
                      key={project.id}
                      className="border-b border-muted hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => onProjectClick(project.id)}
                    >
                      <td className="py-1 px-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getPriorityColor(project.priority)}`} />
                          <div>
                            <h3 className="font-semibold text-sm">{project.name}</h3>
                            <p className="text-xs text-muted-foreground">{project.client}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-1 px-4">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {project.projectManager ? project.projectManager.substring(0, 2).toUpperCase() : 'NA'}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{project.projectManager || 'Not assigned'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      <td
                        className="py-1 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Select
                          value={project.status}
                          onValueChange={(value: ProjectStatus) =>
                            onStatusChange(project, value)
                          }
                        >
                          <SelectTrigger
                            className={`w-full max-w-[190px] mx-auto py-1 px-3 text-xs font-medium hover-shimmer border-l-4 ${getStatusBorderColorClass(
                              project.status
                            )}`}
                          >
                            <SelectValue>
                              {projectStatuses.find(
                                (opt) => opt.value === project.status
                              )?.label || project.status}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {projectStatuses.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-1 px-4 pr-6">
                        <div className="min-w-[300px]">
                          <Timeline project={project} isCompact={true} />
                        </div>
                      </td>
                      <td className="py-1 px-4 text-center">
                        {project.media.length > 0 ? (
                          <div className="w-12 h-12 mx-auto cursor-pointer" onClick={(e) => {
                            e.stopPropagation();
                            handleImageClick(project);
                          }}>
                            <img 
                              src={project.media[0].url} 
                              alt={project.media[0].filename}
                              className="w-full h-full object-cover rounded-md hover:scale-105 transition-transform"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </td>
                      <td className="py-1 px-4 text-center">
                        {project.brief ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover-shimmer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <p>{project.brief}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </td>
                      
                      {/* Moodboard Column */}
                      <td className="py-1 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover-shimmer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoodboard(project);
                          }}
                        >
                          <Palette className="h-4 w-4 text-purple-500" />
                        </Button>
                      </td>
                      
                      {/* Whiteboard Column */}
                      <td className="py-1 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover-shimmer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWhiteboard(project);
                          }}
                        >
                          <PenTool className="h-4 w-4 text-green-500" />
                        </Button>
                      </td>
                      
                      <td className="py-1 px-4 text-center">
                        {isLoggedIn && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => onEditProject(project)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              {project.isArchived ? (
                                <DropdownMenuItem onClick={() => onRestoreProject(project)}>
                                  <ArchiveRestore className="mr-2 h-4 w-4" />
                                  <span>Restore</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => onArchiveProject(project)}>
                                  <Archive className="mr-2 h-4 w-4" />
                                  <span>Archive</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => onDeleteProject(project)} className="text-red-500">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {expandedGroups.has(group) && groupProjects.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
              No projects in this group.
            </div>
          )}
        </Card>
      ))}

      {lightboxState && (
        <LightboxModal 
          media={lightboxState.media}
          initialIndex={lightboxState.index}
          onClose={() => setLightboxState(null)}
        />
      )}
    </div>
  );
};

export default MondayView; 