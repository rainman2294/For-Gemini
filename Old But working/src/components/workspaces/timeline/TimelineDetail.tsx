import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Calendar, Users, Target, Settings, Filter, Flag, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn, formatDate } from '@/lib/utils';
import { BaseWorkspace } from '@/types/workspace';
import { Project } from '@/types/project';
import { workspaceService } from '@/services/workspaceService';
import TimelineGantt from './TimelineGantt';
import TaskManager from './TaskManager';
import ResourcePlanner from './ResourcePlanner';
import TaskCreationDialog from './TaskCreationDialog';
import MilestoneManager from './MilestoneManager';
import CalendarView from './CalendarView';
import TimelineStatsOverview from './TimelineStatsOverview';

interface TimelineDetailProps {
  workspace: BaseWorkspace;
  onBack: () => void;
  className?: string;
  project?: Project; // Add project prop for real data
}

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

export default function TimelineDetail({ workspace, onBack, className, project }: TimelineDetailProps) {
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const [milestones, setMilestones] = useState<TimelineMilestone[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'gantt' | 'table' | 'calendar'>('gantt');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [selectedView, setSelectedView] = useState<'timeline' | 'tasks' | 'resources' | 'analytics'>('timeline');

  // Prevent body scrolling when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  useEffect(() => {
    loadTimelineData();
  }, [workspace.id]);

  const loadTimelineData = async () => {
    try {
      setIsLoading(true);
      
      // Try API first, fallback to mock data
      try {
        const [tasksData, milestonesData, assignmentsData, dependenciesData] = await Promise.all([
          workspaceService.getTimelineTasks(workspace.id),
          workspaceService.getTimelineMilestones(workspace.id),
          workspaceService.getTimelineAssignments(),
          workspaceService.getTimelineDependencies(workspace.id)
        ]);
        
        setTasks(tasksData);
        setMilestones(milestonesData);
        setAssignments(assignmentsData);
        setDependencies(dependenciesData);
      } catch (apiError) {
        console.warn('API not available, using mock timeline data');
        
        // Mock timeline data
        const mockTasks: TimelineTask[] = [
          {
            id: 'task-1',
            workspaceId: workspace.id,
            name: 'Project Planning & Research',
            description: 'Initial project scope definition and market research',
            startDate: new Date(Date.now() - 86400000 * 7).toISOString(),
            endDate: new Date(Date.now() - 86400000 * 3).toISOString(),
            status: 'completed',
            priority: 'high',
            progressPercentage: 100,
            estimatedHours: 32,
            actualHours: 28,
            parentTaskId: null,
            createdBy: '1',
            createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
            updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
          },
          {
            id: 'task-2',
            workspaceId: workspace.id,
            name: 'Design Concept Development',
            description: 'Create initial design concepts and mood boards',
            startDate: new Date(Date.now() - 86400000 * 2).toISOString(),
            endDate: new Date(Date.now() + 86400000 * 5).toISOString(),
            status: 'in_progress',
            priority: 'high',
            progressPercentage: 65,
            estimatedHours: 48,
            actualHours: 32,
            parentTaskId: null,
            createdBy: '2',
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
          },
          {
            id: 'task-3',
            workspaceId: workspace.id,
            name: 'Client Review & Feedback',
            description: 'Present concepts to client and incorporate feedback',
            startDate: new Date(Date.now() + 86400000 * 6).toISOString(),
            endDate: new Date(Date.now() + 86400000 * 10).toISOString(),
            status: 'not_started',
            priority: 'medium',
            progressPercentage: 0,
            estimatedHours: 16,
            actualHours: 0,
            parentTaskId: null,
            createdBy: '1',
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            updatedAt: new Date(Date.now() - 86400000 * 5).toISOString()
          },
          {
            id: 'task-4',
            workspaceId: workspace.id,
            name: 'Final Design Production',
            description: 'Complete final designs and prepare deliverables',
            startDate: new Date(Date.now() + 86400000 * 11).toISOString(),
            endDate: new Date(Date.now() + 86400000 * 18).toISOString(),
            status: 'not_started',
            priority: 'urgent',
            progressPercentage: 0,
            estimatedHours: 40,
            actualHours: 0,
            parentTaskId: null,
            createdBy: '2',
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            updatedAt: new Date(Date.now() - 86400000 * 5).toISOString()
          }
        ];

        const mockMilestones: TimelineMilestone[] = [
          {
            id: 'milestone-1',
            workspaceId: workspace.id,
            name: 'Concept Approval',
            description: 'Client approves initial design concepts',
            dueDate: new Date(Date.now() + 86400000 * 8).toISOString(),
            status: 'pending',
            color: '#3b82f6',
            isCritical: true,
            completionPercentage: 0,
            achievedAt: null,
            achievedBy: null,
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            updatedAt: new Date(Date.now() - 86400000 * 5).toISOString()
          },
          {
            id: 'milestone-2',
            workspaceId: workspace.id,
            name: 'Project Completion',
            description: 'Final deliverables completed and delivered',
            dueDate: new Date(Date.now() + 86400000 * 20).toISOString(),
            status: 'pending',
            color: '#10b981',
            isCritical: true,
            completionPercentage: 0,
            achievedAt: null,
            achievedBy: null,
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            updatedAt: new Date(Date.now() - 86400000 * 5).toISOString()
          }
        ];

        setTasks(mockTasks);
        setMilestones(mockMilestones);
        setAssignments([]);
        setDependencies([]);
      }
    } catch (error) {
      console.error('Failed to load timeline data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskCreated = (newTask: TimelineTask) => {
    setTasks(prev => [...prev, newTask]);
    setShowTaskDialog(false);
  };

  const handleMilestoneCreated = (newMilestone: TimelineMilestone) => {
    setMilestones(prev => [...prev, newMilestone]);
  };

  const handleTaskUpdated = async () => {
    await loadTimelineData();
  };

  const getTimelineStats = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
    const notStartedTasks = tasks.filter(task => task.status === 'not_started').length;
    const onHoldTasks = tasks.filter(task => task.status === 'on_hold').length;
    const cancelledTasks = tasks.filter(task => task.status === 'cancelled').length;
    const overdueTasks = tasks.filter(task => 
      new Date(task.endDate) < new Date() && task.status !== 'completed'
    ).length;
    
    // Milestone stats
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.status === 'achieved').length;
    const pendingMilestones = milestones.filter(m => m.status === 'pending').length;
    const missedMilestones = milestones.filter(m => m.status === 'missed').length;
    const criticalMilestones = milestones.filter(m => m.isCritical).length;
    
    // Time stats
    const totalEstimatedHours = tasks.reduce((sum, task) => sum + task.estimatedHours, 0);
    const totalActualHours = tasks.reduce((sum, task) => sum + task.actualHours, 0);
    
    // Priority and progress stats
    const highPriorityTasks = tasks.filter(task => task.priority === 'high' || task.priority === 'urgent').length;
    const averageProgress = totalTasks > 0 ? Math.round(tasks.reduce((sum, task) => sum + task.progressPercentage, 0) / totalTasks) : 0;
    
    // Upcoming deadlines (within 7 days)
    const upcomingDeadlines = tasks.filter(task => {
      const endDate = new Date(task.endDate);
      const today = new Date();
      const daysUntilDeadline = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDeadline >= 0 && daysUntilDeadline <= 7 && task.status !== 'completed';
    }).length;
    
    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      notStartedTasks,
      onHoldTasks,
      cancelledTasks,
      overdueTasks,
      totalMilestones,
      completedMilestones,
      pendingMilestones,
      missedMilestones,
      criticalMilestones,
      totalEstimatedHours,
      totalActualHours,
      highPriorityTasks,
      averageProgress,
      upcomingDeadlines,
      completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      milestoneProgress: totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0,
      timeEfficiency: totalEstimatedHours > 0 ? Math.round((totalEstimatedHours / totalActualHours) * 100) : 0
    };
  };

  const stats = getTimelineStats();

  if (isLoading) {
    return (
      <div className="glass-card p-6 rounded-lg shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-screen flex flex-col bg-background overflow-hidden", className)}>
      {/* Header */}
      <div className="glass-navbar p-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              className="glass-card hover:shadow-lg transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-responsive-xl">
                {workspace.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {stats.totalTasks} tasks • {stats.completionPercentage}% complete
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="glass-input w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card">
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
              </SelectContent>
            </Select>

            <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
              <SelectTrigger className="glass-input w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card">
                <SelectItem value="gantt">Gantt</SelectItem>
                <SelectItem value="table">Table</SelectItem>
                <SelectItem value="calendar">Calendar</SelectItem>
              </SelectContent>
            </Select>

            <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
              <DialogTrigger asChild>
                <Button className="btn-glass-primary touch-target">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-modal" aria-describedby="task-dialog-description">
                <div id="task-dialog-description" className="sr-only">
                  Dialog for creating a new task with name, description, timeline, priority, estimation, and team assignment
                </div>
                <TaskCreationDialog 
                  workspaceId={workspace.id}
                  onTaskCreated={handleTaskCreated}
                  project={project}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Overview - All in one line */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 xl:grid-cols-10 gap-3 p-4 flex-shrink-0">
        {/* Task Stats */}
        <Card className="glass-card border-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Total Tasks</p>
                <p className="text-sm font-semibold">{stats.totalTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold text-green-600">{stats.completedTasks}</p>
                  <p className="text-xs text-muted-foreground">({stats.completionPercentage}%)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">In Progress</p>
                <p className="text-sm font-semibold text-orange-600">{stats.inProgressTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="text-sm font-semibold text-red-600">{stats.overdueTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Milestone Stats */}
        <Card className="glass-card border-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Milestones</p>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold">{stats.totalMilestones}</p>
                  <p className="text-xs text-muted-foreground">({stats.milestoneProgress}% complete)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Efficiency */}
        <Card className="glass-card border-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Hours Spent</p>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold">{stats.totalActualHours}</p>
                  <p className="text-xs text-muted-foreground">of {stats.totalEstimatedHours}h est.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* High Priority */}
        <Card className="glass-card border-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">High Priority</p>
                <p className="text-sm font-semibold text-yellow-600">{stats.highPriorityTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critical */}
        <Card className="glass-card border-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Critical</p>
                <p className="text-sm font-semibold text-purple-600">{stats.criticalMilestones}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card className="glass-card border-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Upcoming</p>
                <p className="text-sm font-semibold text-blue-600">{stats.upcomingDeadlines}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Efficiency */}
        <Card className="glass-card border-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Efficiency</p>
                <p className="text-sm font-semibold text-green-600">{stats.timeEfficiency}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 p-4 flex-shrink-0">
        <Button
          variant={selectedView === 'timeline' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedView('timeline')}
          className="glass-card hover:shadow-lg transition-all duration-300"
        >
          Timeline
        </Button>
        <Button
          variant={selectedView === 'tasks' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedView('tasks')}
          className="glass-card hover:shadow-lg transition-all duration-300"
        >
          Task Manager
        </Button>
        <Button
          variant={selectedView === 'resources' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedView('resources')}
          className="glass-card hover:shadow-lg transition-all duration-300"
        >
          Resources
        </Button>
        <Button
          variant={selectedView === 'analytics' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedView('analytics')}
          className="glass-card hover:shadow-lg transition-all duration-300"
        >
          Analytics
        </Button>
      </div>

      {/* Main Content Area - Fixed height with proper scrolling */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Calendar/Timeline Content - Scrollable area */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedView === 'timeline' && viewMode === 'calendar' && (
            <CalendarView
              tasks={tasks}
              milestones={milestones}
              onTaskClick={(task) => {
                // Handle task click - could open task detail dialog
                console.log('Task clicked:', task);
              }}
              onMilestoneClick={(milestone) => {
                // Handle milestone click - could open milestone detail dialog
                console.log('Milestone clicked:', milestone);
              }}
              onDateClick={(date) => {
                // Handle date click - could open task creation dialog for that date
                console.log('Date clicked:', date);
              }}
            />
          )}

          {selectedView === 'timeline' && viewMode !== 'calendar' && (
            <TimelineGantt
              tasks={tasks}
              milestones={milestones}
              dependencies={dependencies}
              viewMode={viewMode}
              timeRange={timeRange}
              onTaskUpdated={handleTaskUpdated}
            />
          )}

          {selectedView === 'tasks' && (
            <TaskManager
              tasks={tasks}
              onTaskUpdated={handleTaskUpdated}
            />
          )}

          {selectedView === 'resources' && (
            <ResourcePlanner
              tasks={tasks}
              assignments={assignments}
            />
          )}

          {selectedView === 'analytics' && (
            <TimelineStatsOverview stats={stats} />
          )}
        </div>
        
        {/* Milestones Sidebar - Only this should scroll */}
        <div className="w-[450px] border-l bg-background flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            <MilestoneManager
              workspaceId={workspace.id}
              milestones={milestones}
              onUpdated={loadTimelineData}
              onMilestoneCreated={handleMilestoneCreated}
            />
          </div>
        </div>
      </div>
    </div>
  );
}