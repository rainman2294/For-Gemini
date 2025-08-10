import React, { useState } from 'react';
import { Users, Clock, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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

interface ResourcePlannerProps {
  tasks: TimelineTask[];
  assignments: any[];
}

// Mock team members data
const mockTeamMembers = [
  { 
    id: '1', 
    name: 'Alex Chen', 
    email: 'alex@example.com', 
    role: 'Project Manager',
    hourlyRate: 75,
    maxHoursPerWeek: 40
  },
  { 
    id: '2', 
    name: 'Sarah Wilson', 
    email: 'sarah@example.com', 
    role: 'Senior Designer',
    hourlyRate: 65,
    maxHoursPerWeek: 40
  },
  { 
    id: '3', 
    name: 'Mike Johnson', 
    email: 'mike@example.com', 
    role: 'Developer',
    hourlyRate: 70,
    maxHoursPerWeek: 40
  },
  { 
    id: '4', 
    name: 'Emily Davis', 
    email: 'emily@example.com', 
    role: 'UX Designer',
    hourlyRate: 60,
    maxHoursPerWeek: 35
  }
];

export default function ResourcePlanner({ tasks, assignments }: ResourcePlannerProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');

  // Calculate workload for each team member
  const calculateWorkload = () => {
    const workload = mockTeamMembers.map(member => {
      // Filter tasks assigned to this member (simulated)
      const memberTasks = tasks.filter(task => 
        task.createdBy === member.id || 
        Math.random() > 0.5 // Simulate some assignments
      );

      const totalEstimatedHours = memberTasks.reduce((sum, task) => sum + task.estimatedHours, 0);
      const totalActualHours = memberTasks.reduce((sum, task) => sum + task.actualHours, 0);
      const completedTasks = memberTasks.filter(task => task.status === 'completed').length;
      const inProgressTasks = memberTasks.filter(task => task.status === 'in_progress').length;
      
      const utilizationPercentage = member.maxHoursPerWeek > 0 
        ? Math.min(100, (totalEstimatedHours / member.maxHoursPerWeek) * 100)
        : 0;

      const efficiency = totalEstimatedHours > 0 
        ? ((totalEstimatedHours - totalActualHours) / totalEstimatedHours) * 100
        : 0;

      return {
        ...member,
        tasks: memberTasks,
        totalEstimatedHours,
        totalActualHours,
        completedTasks,
        inProgressTasks,
        utilizationPercentage,
        efficiency: Math.max(0, efficiency),
        isOverallocated: utilizationPercentage > 100
      };
    });

    return workload;
  };

  const teamWorkload = calculateWorkload();

  const getUtilizationColor = (percentage: number) => {
    if (percentage > 100) return 'bg-red-500';
    if (percentage > 80) return 'bg-yellow-500';
    if (percentage > 60) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency > 80) return 'text-green-600';
    if (efficiency > 60) return 'text-blue-600';
    if (efficiency > 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Resource Planning</h3>
          <p className="text-sm text-muted-foreground">
            Team workload and capacity management
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Period:</label>
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month')}
            className="glass-card border border-gray-200/20 rounded-md px-3 py-1 text-sm hover-shimmer cyrus-ui"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-lg font-semibold">{teamWorkload.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-lg font-semibold">
                  {teamWorkload.reduce((sum, member) => sum + member.totalEstimatedHours, 0)}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Utilization</p>
                <p className="text-lg font-semibold">
                  {Math.round(teamWorkload.reduce((sum, member) => sum + member.utilizationPercentage, 0) / teamWorkload.length)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Overallocated</p>
                <p className="text-lg font-semibold">
                  {teamWorkload.filter(member => member.isOverallocated).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Member Cards */}
      <div className="grid gap-4">
        {teamWorkload.map((member) => (
          <Card key={member.id} className="glass-card border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-medium">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-semibold">{member.name}</h4>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {member.isOverallocated && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Overallocated
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    ${member.hourlyRate}/hr
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {/* Utilization */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Utilization</span>
                  <span className="text-sm text-muted-foreground">
                    {member.totalEstimatedHours}h / {member.maxHoursPerWeek}h
                  </span>
                </div>
                <Progress 
                  value={Math.min(100, member.utilizationPercentage)} 
                  className="h-2"
                />
                <div className="flex items-center justify-between mt-1">
                  <span className={cn(
                    "text-xs font-medium",
                    member.utilizationPercentage > 100 ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {Math.round(member.utilizationPercentage)}%
                  </span>
                  {member.utilizationPercentage > 100 && (
                    <span className="text-xs text-red-600">
                      +{Math.round(member.utilizationPercentage - 100)}% over capacity
                    </span>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Tasks</p>
                  <p className="font-medium">{member.tasks.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Completed</p>
                  <p className="font-medium text-green-600">{member.completedTasks}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">In Progress</p>
                  <p className="font-medium text-blue-600">{member.inProgressTasks}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Efficiency</p>
                  <p className={cn("font-medium", getEfficiencyColor(member.efficiency))}>
                    {Math.round(member.efficiency)}%
                  </p>
                </div>
              </div>

              {/* Current Tasks */}
              {member.tasks.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium mb-2">Current Tasks</h5>
                  <div className="space-y-2">
                    {member.tasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50/50 rounded">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            task.status === 'completed' ? 'bg-green-500' :
                            task.status === 'in_progress' ? 'bg-blue-500' :
                            'bg-gray-400'
                          )} />
                          <span className="text-sm truncate">{task.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {task.estimatedHours}h
                        </span>
                      </div>
                    ))}
                    {member.tasks.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{member.tasks.length - 3} more tasks
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resource Recommendations */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Resource Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamWorkload.filter(m => m.isOverallocated).length > 0 && (
              <div className="p-3 bg-red-50/50 border border-red-200/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">Overallocation Alert</span>
                </div>
                <p className="text-sm text-red-600">
                  {teamWorkload.filter(m => m.isOverallocated).map(m => m.name).join(', ')} 
                  {teamWorkload.filter(m => m.isOverallocated).length === 1 ? ' is' : ' are'} overallocated. 
                  Consider redistributing tasks or adjusting timelines.
                </p>
              </div>
            )}

            {teamWorkload.some(m => m.utilizationPercentage < 60) && (
              <div className="p-3 bg-blue-50/50 border border-blue-200/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Capacity Available</span>
                </div>
                <p className="text-sm text-blue-600">
                  {teamWorkload.filter(m => m.utilizationPercentage < 60).map(m => m.name).join(', ')} 
                  {teamWorkload.filter(m => m.utilizationPercentage < 60).length === 1 ? ' has' : ' have'} available capacity 
                  for additional tasks.
                </p>
              </div>
            )}

            {teamWorkload.every(m => m.utilizationPercentage >= 60 && m.utilizationPercentage <= 100) && (
              <div className="p-3 bg-green-50/50 border border-green-200/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Optimal Allocation</span>
                </div>
                <p className="text-sm text-green-600">
                  Team resources are optimally allocated with good utilization rates.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}