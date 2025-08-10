import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, Flag, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

interface CalendarViewProps {
  tasks: TimelineTask[];
  milestones: TimelineMilestone[];
  onTaskClick?: (task: TimelineTask) => void;
  onMilestoneClick?: (milestone: TimelineMilestone) => void;
  onDateClick?: (date: Date) => void;
}

export default function CalendarView({ 
  tasks, 
  milestones, 
  onTaskClick, 
  onMilestoneClick, 
  onDateClick 
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get calendar data for current month
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of month and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get first day of calendar (may be from previous month)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Get last day of calendar (may be from next month)
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    // Generate array of days
    const days = [];
    const currentDay = new Date(startDate);
    
    while (currentDay <= endDate) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  // Get tasks and milestones for a specific date
  const getItemsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    const dayTasks = tasks.filter(task => {
      const startDate = new Date(task.startDate).toISOString().split('T')[0];
      const endDate = new Date(task.endDate).toISOString().split('T')[0];
      return dateStr >= startDate && dateStr <= endDate;
    });
    
    const dayMilestones = milestones.filter(milestone => {
      const dueDate = new Date(milestone.dueDate).toISOString().split('T')[0];
      return dateStr === dueDate;
    });
    
    return { tasks: dayTasks, milestones: dayMilestones };
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'not_started': return 'bg-gray-500';
      case 'on_hold': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      case 'achieved': return 'bg-green-500';
      case 'pending': return 'bg-blue-500';
      case 'missed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-500';
      case 'high': return 'border-orange-500';
      case 'medium': return 'border-yellow-500';
      case 'low': return 'border-gray-500';
      default: return 'border-gray-500';
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between flex-shrink-0 p-4">
        <h3 className="text-lg font-semibold">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
            className="hover-shimmer cyrus-ui"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="hover-shimmer cyrus-ui"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
            className="hover-shimmer cyrus-ui"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid - Fixed height */}
      <div className="flex-1 overflow-hidden">
        <Card className="glass-card border-0 h-full">
          <CardContent className="p-0 h-full flex flex-col">
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-border/20 flex-shrink-0">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days - Scrollable if needed */}
            <div className="grid grid-cols-7 flex-1 overflow-auto">
              {calendarData.map((date, index) => {
                const items = getItemsForDate(date);
                const hasItems = items.tasks.length > 0 || items.milestones.length > 0;
                
                return (
                  <div
                    key={index}
                    className={cn(
                      "min-h-[120px] p-2 border-r border-b border-border/10 cursor-pointer transition-colors hover:bg-muted/30",
                      !isCurrentMonth(date) && "text-muted-foreground bg-muted/20",
                      isToday(date) && "bg-primary/10 ring-1 ring-primary/30",
                      selectedDate?.toDateString() === date.toDateString() && "bg-accent"
                    )}
                    onClick={() => {
                      setSelectedDate(date);
                      onDateClick?.(date);
                    }}
                  >
                    {/* Date Number */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "text-sm font-medium",
                        isToday(date) && "text-primary font-bold"
                      )}>
                        {date.getDate()}
                      </span>
                      {hasItems && (
                        <div className="w-2 h-2 rounded-full bg-indicator" />
                      )}
                    </div>

                    {/* Tasks and Milestones */}
                    <div className="space-y-1">
                      {/* Milestones */}
                      {items.milestones.slice(0, 2).map(milestone => (
                        <div
                          key={milestone.id}
                          className={cn(
                            "text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity",
                            getStatusColor(milestone.status),
                            "text-white"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onMilestoneClick?.(milestone);
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <Flag className="h-3 w-3" />
                            <span className="truncate">{milestone.name}</span>
                          </div>
                        </div>
                      ))}

                      {/* Tasks */}
                      {items.tasks.slice(0, 2).map(task => (
                        <div
                          key={task.id}
                          className={cn(
                            "text-xs p-1 rounded border-l-2 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors",
                            getPriorityColor(task.priority)
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskClick?.(task);
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              getStatusColor(task.status)
                            )} />
                            <span className="truncate">{task.name}</span>
                          </div>
                        </div>
                      ))}

                      {/* Show more indicator */}
                      {(items.tasks.length + items.milestones.length) > 4 && (
                        <div className="text-xs text-muted-foreground p-1">
                          +{(items.tasks.length + items.milestones.length) - 4} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Date Details - Fixed height */}
      {selectedDate && (
        <div className="flex-shrink-0 p-4">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-64 overflow-y-auto">
              {(() => {
                const items = getItemsForDate(selectedDate);
                
                if (items.tasks.length === 0 && items.milestones.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No tasks or milestones on this date</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 hover-shimmer cyrus-ui"
                        onClick={() => onDateClick?.(selectedDate)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {/* Milestones */}
                    {items.milestones.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Flag className="h-4 w-4" />
                          Milestones ({items.milestones.length})
                        </h4>
                        <div className="space-y-2">
                          {items.milestones.map(milestone => (
                            <div
                              key={milestone.id}
                              className="flex items-center gap-3 p-3 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                              onClick={() => onMilestoneClick?.(milestone)}
                            >
                              <div className={cn(
                                "w-3 h-3 rounded-full",
                                getStatusColor(milestone.status)
                              )} />
                              <div className="flex-1">
                                <p className="font-medium">{milestone.name}</p>
                                <p className="text-sm text-muted-foreground">{milestone.description}</p>
                              </div>
                              <Badge variant="secondary" className={cn(
                                "text-white text-xs",
                                getStatusColor(milestone.status)
                              )}>
                                {milestone.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tasks */}
                    {items.tasks.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Tasks ({items.tasks.length})
                        </h4>
                        <div className="space-y-2">
                          {items.tasks.map(task => (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 p-3 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                              onClick={() => onTaskClick?.(task)}
                            >
                              <div className={cn(
                                "w-3 h-3 rounded-full",
                                getStatusColor(task.status)
                              )} />
                              <div className="flex-1">
                                <p className="font-medium">{task.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {task.estimatedHours}h estimated • {task.priority} priority
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline" className={cn(
                                  "text-xs border-2",
                                  getPriorityColor(task.priority)
                                )}>
                                  {task.priority}
                                </Badge>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {task.progressPercentage}% complete
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}