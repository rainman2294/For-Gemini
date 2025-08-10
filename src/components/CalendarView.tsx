import React, { useState, useEffect, useMemo } from 'react';
import { Project, ProjectStatus } from '@/types/project';
import { ChevronLeft, ChevronRight, Calendar, Plus, Palette, PenTool, GitBranch, Clock, MessageCircle, Pin, User, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { projectStatuses, getStatusColorClass } from '@/lib/statuses';
import { activityService } from '@/services/activityService';
import { Activity, ActivityType } from '@/types/activity';

interface CalendarViewProps {
  projects: Project[];
  onDateSelect?: (date: string) => void;
  selectedDate?: string | null;
  onProjectEdit?: (project: Project) => void;
  isLoggedIn?: boolean;
  onProjectClick?: (projectId: string) => void;
  onActivityClick?: (activity: Activity) => void;
}

const activityTypeConfig = {
  project_created: { icon: Calendar, color: 'bg-blue-500', label: 'Project' },
  project_updated: { icon: Calendar, color: 'bg-blue-400', label: 'Project Update' },
  moodboard_created: { icon: Palette, color: 'bg-purple-500', label: 'Moodboard' },
  moodboard_updated: { icon: Palette, color: 'bg-purple-400', label: 'Moodboard Update' },
  whiteboard_created: { icon: PenTool, color: 'bg-green-500', label: 'Whiteboard' },
  whiteboard_updated: { icon: PenTool, color: 'bg-green-400', label: 'Whiteboard Update' },
  workflow_created: { icon: GitBranch, color: 'bg-orange-500', label: 'Workflow' },
  workflow_updated: { icon: GitBranch, color: 'bg-orange-400', label: 'Workflow Update' },
  comment_added: { icon: MessageCircle, color: 'bg-yellow-500', label: 'Comment' },
  pin_added: { icon: Pin, color: 'bg-red-500', label: 'Pin' },
  timeline_updated: { icon: Clock, color: 'bg-indigo-500', label: 'Timeline' },
  whiteboard_pin_added: { icon: Pin, color: 'bg-red-500', label: 'Pin Added' },
  whiteboard_pin_resolved: { icon: Pin, color: 'bg-green-500', label: 'Pin Resolved' },
  workflow_stage_completed: { icon: GitBranch, color: 'bg-orange-300', label: 'Stage Completed' },
  timeline_milestone_reached: { icon: Clock, color: 'bg-indigo-300', label: 'Milestone Reached' },
};

export function CalendarView({ 
  projects = [], 
  selectedDate, 
  onDateSelect, 
  onProjectEdit, 
  isLoggedIn = true,
  onProjectClick,
  onActivityClick
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDayActivities, setSelectedDayActivities] = useState<Activity[]>([]);
  const [selectedDayProjects, setSelectedDayProjects] = useState<(Project & { _displayType: 'start' | 'end' })[]>([]);

  // Group projects by date (start date and end date)
  const projectsByDate = useMemo(() => {
    const grouped: Record<string, (Project & { _displayType: 'start' | 'end' })[]> = {};
    
    projects.forEach(project => {
      // Add project to start date
      if (project.startDate) {
        const startDateKey = project.startDate.split('T')[0];
        if (!grouped[startDateKey]) {
          grouped[startDateKey] = [];
        }
        grouped[startDateKey].push({ ...project, _displayType: 'start' });
      }
      
      // Add project to end date if different from start date
      if (project.endDate && project.endDate !== project.startDate) {
        const endDateKey = project.endDate.split('T')[0];
        if (!grouped[endDateKey]) {
          grouped[endDateKey] = [];
        }
        grouped[endDateKey].push({ ...project, _displayType: 'end' });
      }
    });
    
    return grouped;
  }, [projects]);

  // Subscribe to activity updates
  useEffect(() => {
    const unsubscribe = activityService.subscribe((newActivities) => {
      if (selectedDay) {
        const dayActivities = newActivities.filter(activity => {
          if (!activity.timestamp) return false;
          const activityDate = new Date(activity.timestamp);
          return activityDate.toISOString().split('T')[0] === selectedDay;
        });
        setSelectedDayActivities(dayActivities);
      }
    });

    // Initial load if a day is selected
    if (selectedDay) {
      const activities = activityService.getActivities();
      const dayActivities = activities.filter(activity => {
        if (!activity.timestamp) return false;
        const activityDate = new Date(activity.timestamp);
        return activityDate.toISOString().split('T')[0] === selectedDay;
      });
      setSelectedDayActivities(dayActivities);
      
      // Update selected day projects
      const dayProjects = projectsByDate[selectedDay] || [];
      setSelectedDayProjects(dayProjects);
    }

    return unsubscribe;
  }, [selectedDay, projectsByDate]);
  
  // Navigate to previous month
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  // Format date as YYYY-MM-DD
  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Group activities by date
  const activitiesByDate = useMemo(() => {
    const grouped: Record<string, Activity[]> = {};
    
    activityService.getActivities().forEach(activity => {
      if (!activity.timestamp) return; // Skip activities without timestamp
      const dateKey = activity.timestamp.split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(activity);
    });
    
    return grouped;
  }, []);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = formatDateKey(date);
      const activities = activitiesByDate[dateKey] || [];
      const dayProjects = projectsByDate[dateKey] || [];
      const isToday = formatDateKey(new Date()) === dateKey;
      const isSelected = selectedDay === dateKey;
      
      days.push({
        day,
        date,
        dateKey,
        activities,
        projects: dayProjects,
        isToday,
        isSelected,
        activityCount: activities.length,
        projectCount: dayProjects.length
      });
    }
    
    return days;
  }, [currentDate, activitiesByDate, selectedDay]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getActivityIcon = (type: string) => {
    const config = activityTypeConfig[type as keyof typeof activityTypeConfig];
    if (!config) return <Circle className="h-4 w-4" />;
    const IconComponent = config.icon;
    return <IconComponent className="h-4 w-4" />;
  };

  const getActivityColor = (type: string) => {
    const config = activityTypeConfig[type as keyof typeof activityTypeConfig];
    return config?.color || 'bg-gray-500';
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Activity Calendar
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={prevMonth} className="hover-shimmer cyrus-ui">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-lg font-semibold min-w-[160px] text-center">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </span>
                  <Button variant="outline" size="sm" onClick={nextMonth} className="hover-shimmer cyrus-ui">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {dayNames.map(day => (
                  <div key={day} className="h-10 flex items-center justify-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-20 border border-border/20 p-1 cursor-pointer transition-all hover:bg-muted/50 relative",
                      day?.isToday && "bg-primary/10 border-primary/30",
                      day?.isSelected && "bg-primary/20 border-primary",
                      !day && "cursor-default"
                    )}
                    onClick={() => day && setSelectedDay(day.dateKey)}
                  >
                    {day && (
                      <>
                        <div className="text-sm font-medium">
                          {day.day}
                        </div>
                        
                        {/* Project indicators */}
                        {day.projectCount > 0 && (
                          <div className="absolute top-6 left-1 right-1">
                            {day.projects.slice(0, 2).map((project, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "text-xs px-1 py-0.5 rounded mb-1 truncate",
                                  getStatusColorClass(project.status)
                                )}
                                title={`${project.name} (${project._displayType === 'start' ? 'Start' : 'End'})`}
                              >
                                {project._displayType === 'start' ? '▶' : '◀'} {project.name.slice(0, 8)}
                              </div>
                            ))}
                            {day.projectCount > 2 && (
                              <div className="text-xs text-primary font-medium">
                                +{day.projectCount - 2} more
                              </div>
                            )}
                          </div>
                        )}

                        {/* Activity indicators */}
                        {day.activityCount > 0 && (
                          <div className="absolute bottom-1 left-1 right-1">
                            {day.activityCount <= 3 ? (
                              <div className="flex gap-1">
                                {day.activities.slice(0, 3).map((activity, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      "w-2 h-2 rounded-full flex-shrink-0",
                                      getActivityColor(activity.type)
                                    )}
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <div className="flex gap-1">
                                  {day.activities.slice(0, 2).map((activity, i) => (
                                    <div
                                      key={i}
                                      className={cn(
                                        "w-2 h-2 rounded-full flex-shrink-0",
                                        getActivityColor(activity.type)
                                      )}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs font-medium text-primary">
                                  +{day.activityCount - 2}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Panel */}
        <div className="lg:col-span-1">
          <Card className="glass-card h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Circle className="h-5 w-5" />
                {selectedDay ? `Activities for ${new Date(selectedDay).toLocaleDateString()}` : 'Select a Date'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(selectedDayProjects.length > 0 || selectedDayActivities.length > 0) ? (
                <div className="space-y-4 max-h-[calc(100vh-350px)] overflow-y-auto pr-1">
                  {/* Projects Section */}
                  {selectedDayProjects.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium mb-2 text-primary">Projects</h5>
                      <div className="space-y-2">
                        {selectedDayProjects.map((project, index) => (
                          <div 
                            key={`${project.id}-${index}`} 
                            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => onProjectClick?.(project.id)}
                          >
                            <div className={cn("p-2 rounded-full text-white", getStatusColorClass(project.status))}>
                              {project._displayType === 'start' ? '▶' : '◀'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm truncate">{project.name}</h4>
                                <Badge variant="secondary" className="text-xs">
                                  {project._displayType === 'start' ? 'Start' : 'End'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Client: {project.client}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{project._displayType === 'start' ? 'Starts' : 'Ends'} today</span>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs">
                                  {project.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activities Section */}
                  {selectedDayActivities.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium mb-2 text-primary">Activities</h5>
                      <div className="space-y-2">
                        {selectedDayActivities.map((activity) => (
                          <div 
                            key={activity.id} 
                            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => onActivityClick?.(activity)}
                          >
                            <div className={cn("p-2 rounded-full text-white", getActivityColor(activity.type))}>
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm truncate">
                                  {activity.details.projectName || activity.details.workspaceName || "Activity"}
                                </h4>
                                <Badge variant="secondary" className="text-xs">
                                  {activityTypeConfig[activity.type as keyof typeof activityTypeConfig]?.label || activity.type}
                                </Badge>
                              </div>
                              {activity.projectId && (
                                <p className="text-xs text-muted-foreground mb-1">
                                  Project: {activity.details.projectName || activity.projectId}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>{activity.userName}</span>
                                <span>•</span>
                                <span>{activity.timestamp ? new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown time'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : selectedDay ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Circle className="h-8 w-8 mx-auto mb-2" />
                  <p>No projects or activities on this date</p>
                  <p className="text-xs mt-1">Projects and activities will appear here</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2" />
                  <p>Select a date to view projects and activities</p>
                  <p className="text-xs mt-1">Click on any day in the calendar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity Legend */}
      <Card className="glass-card mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Activity Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(activityTypeConfig).map(([type, config]) => (
              <div key={type} className="flex items-center gap-2">
                <div className={cn("p-1 rounded-full text-white", config.color)}>
                  <config.icon className="h-3 w-3" />
                </div>
                <span className="text-sm">{config.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}