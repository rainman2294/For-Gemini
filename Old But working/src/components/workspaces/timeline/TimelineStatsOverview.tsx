import React from 'react';
import { Calendar, Clock, Target, Flag, TrendingUp, AlertTriangle, Users, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface TimelineStatsOverviewProps {
  stats: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    notStartedTasks: number;
    onHoldTasks: number;
    cancelledTasks: number;
    overdueTasks: number;
    totalMilestones: number;
    completedMilestones: number;
    pendingMilestones: number;
    missedMilestones: number;
    criticalMilestones: number;
    totalEstimatedHours: number;
    totalActualHours: number;
    highPriorityTasks: number;
    averageProgress: number;
    upcomingDeadlines: number;
    completionPercentage: number;
    milestoneProgress: number;
    timeEfficiency: number;
  };
}

export default function TimelineStatsOverview({ stats }: TimelineStatsOverviewProps) {
  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency <= 80) return 'text-red-600';
    if (efficiency <= 100) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getEfficiencyBadgeVariant = (efficiency: number) => {
    if (efficiency <= 80) return 'destructive';
    if (efficiency <= 100) return 'default';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      {/* Project Health Summary */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Project Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">{stats.completionPercentage}%</span>
            </div>
            <Progress value={stats.completionPercentage} className="h-2" />
          </div>

          {/* Milestone Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Milestone Progress</span>
              <span className="text-sm text-muted-foreground">{stats.milestoneProgress}%</span>
            </div>
            <Progress value={stats.milestoneProgress} className="h-2" />
          </div>

          {/* Time Efficiency */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Time Efficiency</span>
              <Badge variant={getEfficiencyBadgeVariant(stats.timeEfficiency)}>
                {stats.timeEfficiency > 0 ? `${stats.timeEfficiency}%` : 'N/A'}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {stats.totalActualHours}h actual vs {stats.totalEstimatedHours}h estimated
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Task Distribution */}
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Tasks</span>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <div className="text-xs text-muted-foreground">
                {stats.completedTasks} completed, {stats.inProgressTasks} active
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Milestones */}
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Flag className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Milestones</span>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">{stats.totalMilestones}</div>
              <div className="text-xs text-muted-foreground">
                {stats.completedMilestones} achieved
                {stats.criticalMilestones > 0 && `, ${stats.criticalMilestones} critical`}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Tracking */}
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Time Spent</span>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">{stats.totalActualHours}h</div>
              <div className="text-xs text-muted-foreground">
                of {stats.totalEstimatedHours}h estimated
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Urgent Items */}
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Urgent</span>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-red-600">
                {stats.overdueTasks + stats.upcomingDeadlines}
              </div>
              <div className="text-xs text-muted-foreground">
                {stats.overdueTasks} overdue, {stats.upcomingDeadlines} due soon
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Task Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950">
              <div className="text-2xl font-bold text-green-600">{stats.completedTasks}</div>
              <div className="text-sm text-green-700 dark:text-green-300">Completed</div>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
              <div className="text-2xl font-bold text-blue-600">{stats.inProgressTasks}</div>
              <div className="text-sm text-blue-700 dark:text-blue-300">In Progress</div>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-950">
              <div className="text-2xl font-bold text-gray-600">{stats.notStartedTasks}</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Not Started</div>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950">
              <div className="text-2xl font-bold text-yellow-600">{stats.onHoldTasks}</div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300">On Hold</div>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950">
              <div className="text-2xl font-bold text-red-600">{stats.overdueTasks}</div>
              <div className="text-sm text-red-700 dark:text-red-300">Overdue</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Priority & Risk Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Priority Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">High Priority Tasks</span>
              <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                {stats.highPriorityTasks}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Average Progress</span>
              <Badge variant="outline">
                {stats.averageProgress}%
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Critical Milestones</span>
              <Badge variant={stats.criticalMilestones > 0 ? "destructive" : "secondary"}>
                {stats.criticalMilestones}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Risk Indicators */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Risk Indicators
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Overdue Tasks</span>
              <Badge variant={stats.overdueTasks > 0 ? "destructive" : "secondary"}>
                {stats.overdueTasks}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Due Next 7 Days</span>
              <Badge variant={stats.upcomingDeadlines > 0 ? "default" : "secondary"}>
                {stats.upcomingDeadlines}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Missed Milestones</span>
              <Badge variant={stats.missedMilestones > 0 ? "destructive" : "secondary"}>
                {stats.missedMilestones}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Time Efficiency</span>
              <Badge variant={getEfficiencyBadgeVariant(stats.timeEfficiency)}>
                {stats.timeEfficiency > 0 ? `${stats.timeEfficiency}%` : 'N/A'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}