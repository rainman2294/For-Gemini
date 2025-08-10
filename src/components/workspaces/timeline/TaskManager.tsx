import React, { useState } from 'react';
import { MoreHorizontal, Edit3, Trash2, Play, Pause, CheckCircle, Clock, Flag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

interface TaskManagerProps {
  tasks: TimelineTask[];
  onTaskUpdated: () => void;
}

export default function TaskManager({ tasks, onTaskUpdated }: TaskManagerProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const filteredTasks = tasks.filter(task => {
    const statusMatch = filterStatus === 'all' || task.status === filterStatus;
    const priorityMatch = filterPriority === 'all' || task.priority === filterPriority;
    return statusMatch && priorityMatch;
  });

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
      case 'urgent': return 'border-red-500 text-red-600';
      case 'high': return 'border-orange-500 text-orange-600';
      case 'medium': return 'border-blue-500 text-blue-600';
      default: return 'border-gray-400 text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Play className="h-4 w-4" />;
      case 'on_hold': return <Pause className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // In development, just trigger update
    console.log(`Changing task ${taskId} status to ${newStatus}`);
    onTaskUpdated();
  };

  const handleEditTask = (taskId: string) => {
    console.log(`Editing task ${taskId}`);
    // TODO: Implement edit dialog
  };

  const handleDeleteTask = (taskId: string) => {
    console.log(`Deleting task ${taskId}`);
    // TODO: Implement delete confirmation
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Status:</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="glass-card border border-gray-200/20 rounded-md px-3 py-1 text-sm hover-shimmer cyrus-ui"
          >
            <option value="all">All</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Priority:</label>
          <select 
            value={filterPriority} 
            onChange={(e) => setFilterPriority(e.target.value)}
            className="glass-card border border-gray-200/20 rounded-md px-3 py-1 text-sm hover-shimmer cyrus-ui"
          >
            <option value="all">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-muted-foreground">
          {filteredTasks.length} of {tasks.length} tasks
        </div>
      </div>

      {/* Task Cards */}
      <div className="grid gap-4">
        {filteredTasks.map((task) => (
          <Card key={task.id} className="glass-card border-0 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      getStatusColor(task.status)
                    )} />
                    <h3 className="font-semibold truncate">{task.name}</h3>
                    <Badge variant="outline" className={cn("text-xs", getPriorityColor(task.priority))}>
                      <Flag className="h-3 w-3 mr-1" />
                      {task.priority}
                    </Badge>
                  </div>

                  {/* Description */}
                  {task.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-muted-foreground">{task.progressPercentage}%</span>
                    </div>
                    <Progress value={task.progressPercentage} className="h-2" />
                  </div>

                  {/* Meta Information */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Start Date</p>
                      <p className="font-medium">{formatDate(task.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">End Date</p>
                      <p className="font-medium">{formatDate(task.endDate)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Hours</p>
                      <p className="font-medium">{task.actualHours}/{task.estimatedHours}h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(task.status)}
                        <span className="font-medium capitalize">{task.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover-shimmer cyrus-ui">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="glass-card border-0">
                    <DropdownMenuItem onClick={() => handleEditTask(task.id)}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Task
                    </DropdownMenuItem>
                    
                    {task.status !== 'in_progress' && (
                      <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'in_progress')}>
                        <Play className="h-4 w-4 mr-2" />
                        Start Task
                      </DropdownMenuItem>
                    )}
                    
                    {task.status === 'in_progress' && (
                      <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'on_hold')}>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause Task
                      </DropdownMenuItem>
                    )}
                    
                    {task.status !== 'completed' && (
                      <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'completed')}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Complete
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuItem 
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <Card className="glass-card border-0">
          <CardContent className="p-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No tasks found</h3>
            <p className="text-muted-foreground">
              {tasks.length === 0 
                ? "No tasks have been created yet" 
                : "No tasks match the current filters"
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}