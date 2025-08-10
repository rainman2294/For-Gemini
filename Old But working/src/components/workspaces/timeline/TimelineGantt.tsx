import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Flag, Link2, MoreHorizontal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatDate } from '@/lib/utils';

interface TimelineTask {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progressPercentage: number;
  estimatedHours: number;
  actualHours: number;
  parentTaskId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface TimelineMilestone {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'achieved' | 'missed' | 'cancelled';
  color: string;
  isCritical: boolean;
  completionPercentage: number;
  achievedAt: string | null;
  achievedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TimelineGanttProps {
  tasks: TimelineTask[];
  milestones: TimelineMilestone[];
  dependencies: any[];
  viewMode: 'gantt' | 'table' | 'calendar';
  timeRange: 'week' | 'month' | 'quarter';
  onTaskUpdated: () => void;
}

export default function TimelineGantt({ 
  tasks, 
  milestones, 
  dependencies, 
  viewMode, 
  timeRange, 
  onTaskUpdated 
}: TimelineGanttProps) {
  const [timelineWidth, setTimelineWidth] = useState(1200);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate timeline dimensions
  const getTimelineBounds = () => {
    if (tasks.length === 0) {
      const now = new Date();
      return {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
      };
    }

    const allDates = [
      ...tasks.map(task => new Date(task.startDate)),
      ...tasks.map(task => new Date(task.endDate)),
      ...milestones.map(milestone => new Date(milestone.dueDate))
    ];

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    // Add padding
    const padding = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
    return {
      start: new Date(minDate.getTime() - padding * 24 * 60 * 60 * 1000),
      end: new Date(maxDate.getTime() + padding * 24 * 60 * 60 * 1000)
    };
  };

  const timelineBounds = getTimelineBounds();
  const totalDays = Math.ceil((timelineBounds.end.getTime() - timelineBounds.start.getTime()) / (24 * 60 * 60 * 1000));

  // Generate time grid
  const generateTimeGrid = () => {
    const grid = [];
    const current = new Date(timelineBounds.start);
    const unit = timeRange === 'week' ? 1 : timeRange === 'month' ? 7 : 30;
    
    while (current <= timelineBounds.end) {
      grid.push(new Date(current));
      current.setDate(current.getDate() + unit);
    }
    
    return grid;
  };

  const timeGrid = generateTimeGrid();
  const dayWidth = timelineWidth / totalDays;

  // Calculate task position and width
  const getTaskPosition = (task: TimelineTask) => {
    const startDate = new Date(task.startDate);
    const endDate = new Date(task.endDate);
    
    const startDays = Math.floor((startDate.getTime() - timelineBounds.start.getTime()) / (24 * 60 * 60 * 1000));
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    
    return {
      left: Math.max(0, startDays * dayWidth),
      width: Math.max(dayWidth * 0.5, duration * dayWidth)
    };
  };

  // Get milestone position
  const getMilestonePosition = (milestone: TimelineMilestone) => {
    const date = new Date(milestone.dueDate);
    const days = Math.floor((date.getTime() - timelineBounds.start.getTime()) / (24 * 60 * 60 * 1000));
    return days * dayWidth;
  };

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'on_hold': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-500';
      case 'high': return 'border-orange-500';
      case 'medium': return 'border-blue-500';
      default: return 'border-gray-400';
    }
  };

  if (viewMode === 'table') {
    return (
      <Card className="glass-card border-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200/20">
                  <th className="text-left p-4 font-medium">Task</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Priority</th>
                  <th className="text-left p-4 font-medium">Progress</th>
                  <th className="text-left p-4 font-medium">Start Date</th>
                  <th className="text-left p-4 font-medium">End Date</th>
                  <th className="text-left p-4 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr 
                    key={task.id} 
                    className="border-b border-gray-200/10 hover:bg-gray-50/5 transition-colors"
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{task.name}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {task.description}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="secondary" className={cn(
                        "text-white",
                        getStatusColor(task.status)
                      )}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-primary rounded-full transition-all"
                            style={{ width: `${task.progressPercentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {task.progressPercentage}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      {formatDate(task.startDate)}
                    </td>
                    <td className="p-4 text-sm">
                      {formatDate(task.endDate)}
                    </td>
                    <td className="p-4 text-sm">
                      {task.actualHours}/{task.estimatedHours}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (viewMode === 'calendar') {
    // Simple calendar view - could be enhanced with a proper calendar component
    return (
      <Card className="glass-card border-0">
        <CardContent className="p-6">
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Calendar View</h3>
            <p className="text-muted-foreground">
              Calendar view will be implemented in Phase 4
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Gantt Chart View
  return (
    <TooltipProvider>
      <Card className="glass-card border-0">
        <CardContent className="p-0">
          <div ref={containerRef} className="overflow-x-auto">
            {/* Timeline Header */}
            <div className="sticky top-0 bg-white/5 backdrop-blur-sm border-b border-gray-200/20 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Gantt Chart</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {formatDate(timelineBounds.start)} - {formatDate(timelineBounds.end)}
                </div>
              </div>
              
              {/* Time Grid Header */}
              <div className="relative" style={{ width: timelineWidth }}>
                <div className="flex">
                  {timeGrid.map((date, index) => (
                    <div 
                      key={index}
                      className="flex-shrink-0 text-xs text-muted-foreground border-r border-gray-200/20 pr-2"
                      style={{ 
                        width: timeRange === 'week' ? dayWidth : 
                               timeRange === 'month' ? dayWidth * 7 : 
                               dayWidth * 30
                      }}
                    >
                      {timeRange === 'week' ? 
                        date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                        timeRange === 'month' ?
                        date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                        date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                      }
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tasks */}
            <div className="p-4">
              <div className="space-y-2">
                {tasks.map((task, index) => {
                  const position = getTaskPosition(task);
                  return (
                    <div key={task.id} className="relative h-12 flex items-center">
                      {/* Task Info */}
                      <div className="w-80 pr-4 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            getStatusColor(task.status)
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{task.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {task.estimatedHours}h • {task.priority}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="relative flex-1" style={{ minWidth: timelineWidth }}>
                        {/* Background grid */}
                        <div className="absolute inset-0 flex">
                          {timeGrid.map((_, index) => (
                            <div 
                              key={index}
                              className="border-r border-gray-200/10"
                              style={{ 
                                width: timeRange === 'week' ? dayWidth : 
                                       timeRange === 'month' ? dayWidth * 7 : 
                                       dayWidth * 30
                              }}
                            />
                          ))}
                        </div>

                        {/* Task Bar */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute top-1/2 -translate-y-1/2 h-6 rounded-md cursor-pointer transition-all hover:scale-105",
                                "glass-card border-l-4 hover:shadow-lg",
                                getPriorityColor(task.priority),
                                selectedTask === task.id && "ring-2 ring-blue-500"
                              )}
                              style={{
                                left: position.left,
                                width: position.width
                              }}
                              onClick={() => setSelectedTask(task.id)}
                            >
                              {/* Progress Bar */}
                              <div 
                                className="h-full bg-gradient-primary rounded-r-md opacity-60"
                                style={{ width: `${task.progressPercentage}%` }}
                              />
                              
                              {/* Task Name */}
                              <div className="absolute inset-0 flex items-center px-2">
                                <span className="text-xs font-medium text-white drop-shadow-sm truncate">
                                  {position.width > 100 ? task.name : ''}
                                </span>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="glass-card border-0">
                            <div className="p-2">
                              <p className="font-medium">{task.name}</p>
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                              <div className="mt-2 space-y-1 text-xs">
                                <p>Status: <Badge variant="secondary" className="text-xs">{task.status}</Badge></p>
                                <p>Progress: {task.progressPercentage}%</p>
                                <p>Duration: {formatDate(task.startDate)} - {formatDate(task.endDate)}</p>
                                <p>Hours: {task.actualHours}/{task.estimatedHours}</p>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Milestones */}
              {milestones.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    Milestones
                  </h4>
                  <div className="relative h-8" style={{ minWidth: timelineWidth }}>
                    {/* Background grid */}
                    <div className="absolute inset-0 flex">
                      {timeGrid.map((_, index) => (
                        <div 
                          key={index}
                          className="border-r border-gray-200/10"
                          style={{ 
                            width: timeRange === 'week' ? dayWidth : 
                                   timeRange === 'month' ? dayWidth * 7 : 
                                   dayWidth * 30
                          }}
                        />
                      ))}
                    </div>

                    {/* Milestone Markers */}
                    {milestones.map((milestone) => (
                      <Tooltip key={milestone.id}>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer"
                            style={{ left: getMilestonePosition(milestone) }}
                          >
                            <div 
                              className={cn(
                                "w-4 h-4 rotate-45 border-2 border-white shadow-md hover:scale-125 transition-transform",
                                milestone.isCritical ? "bg-red-500" : "bg-blue-500"
                              )}
                              style={{ backgroundColor: milestone.color }}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="glass-card border-0">
                          <div className="p-2">
                            <p className="font-medium">{milestone.name}</p>
                            <p className="text-sm text-muted-foreground">{milestone.description}</p>
                            <div className="mt-2 space-y-1 text-xs">
                              <p>Due: {formatDate(milestone.dueDate)}</p>
                              <p>Status: <Badge variant="secondary" className="text-xs">{milestone.status}</Badge></p>
                              {milestone.isCritical && (
                                <p className="text-red-500 font-medium">Critical Milestone</p>
                              )}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}

              {/* Today Line */}
              <div className="relative" style={{ minWidth: timelineWidth }}>
                {(() => {
                  const today = new Date();
                  const todayPosition = Math.floor((today.getTime() - timelineBounds.start.getTime()) / (24 * 60 * 60 * 1000)) * dayWidth;
                  
                  if (todayPosition >= 0 && todayPosition <= timelineWidth) {
                    return (
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                        style={{ left: todayPosition }}
                      >
                        <div className="absolute -top-2 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}