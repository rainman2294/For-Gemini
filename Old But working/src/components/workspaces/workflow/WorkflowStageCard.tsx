import React from 'react';
import { CheckCircle, Clock, Users, Play, MoreVertical, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn, formatDate } from '@/lib/utils';
import { WorkflowStage } from '@/types/workspace';

interface WorkflowStageCardProps {
  stage: WorkflowStage;
  isSelected?: boolean;
  onClick: () => void;
  onCompleted: () => void;
  onStarted?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export default function WorkflowStageCard({
  stage,
  isSelected = false,
  onClick,
  onCompleted,
  onEdit,
  onDelete,
  onStarted,
  className
}: WorkflowStageCardProps) {
  const getStatusConfig = (status: string) => {
    const configs = {
      not_started: {
        color: 'bg-slate-500',
        textColor: 'text-slate-700',
        icon: Clock,
        text: 'Pending'
      },
      in_progress: {
        color: 'bg-blue-500',
        textColor: 'text-blue-700',
        icon: Play,
        text: 'In Progress'
      },
      completed: {
        color: 'bg-green-500',
        textColor: 'text-green-700',
        icon: CheckCircle,
        text: 'Completed'
      },
      skipped: {
        color: 'bg-gray-500',
        textColor: 'text-gray-700',
        icon: AlertTriangle,
        text: 'Skipped'
      }
    };
    
    return configs[status as keyof typeof configs] || configs.not_started;
  };

  const statusConfig = getStatusConfig(stage.status);
  const StatusIcon = statusConfig.icon;
  
  const isOverdue = stage.dueDate && new Date(stage.dueDate) < new Date() && stage.status !== 'completed';
  const canComplete = stage.status === 'in_progress' || stage.status === 'not_started';

  return (
    <Card 
      className={cn(
        "glass-card hover:shadow-lg transition-all duration-300 cursor-pointer group border-0",
        isSelected && "ring-2 ring-primary shadow-xl",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            {/* Status Indicator */}
            <div className={cn(
              "w-8 h-8 rounded-full glass-card flex items-center justify-center text-white shadow-sm flex-shrink-0",
              stage.status === 'completed' && "bg-gradient-to-br from-green-500 to-emerald-600",
              stage.status === 'in_progress' && "bg-gradient-to-br from-blue-500 to-indigo-600",
              stage.status === 'not_started' && "bg-gradient-to-br from-slate-500 to-gray-600"
            )}>
              <StatusIcon className="h-4 w-4" />
            </div>
            
            {/* Stage Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg truncate text-foreground">
                  {stage.name}
                </h3>
                
                {stage.isRequired && (
                  <Badge variant="secondary" className="text-xs glass-card">
                    Required
                  </Badge>
                )}
                
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    Overdue
                  </Badge>
                )}
              </div>
              
              {stage.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {stage.description}
                </p>
              )}
              
              {/* Stage Metrics */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{stage.assignedTo.length} assigned</span>
                </div>
                
                {stage.estimatedHours > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{stage.estimatedHours}h estimated</span>
                  </div>
                )}
                
                {stage.dueDate && (
                  <div className={cn(
                    "flex items-center gap-1",
                    isOverdue && "text-destructive"
                  )}>
                    <Clock className="h-3 w-3" />
                    <span>Due {formatDate(stage.dueDate)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 ml-2" onClick={(e) => e.stopPropagation()}>
            {/* Status Badge */}
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs border-0 shadow-sm glass-card",
                stage.status === 'completed' && "bg-green-500/20 text-green-700",
                stage.status === 'in_progress' && "bg-blue-500/20 text-blue-700",
                stage.status === 'not_started' && "bg-slate-500/20 text-slate-700"
              )}
            >
              {stage.status === 'completed' && 'Completed'}
              {stage.status === 'in_progress' && 'In Progress'}
              {stage.status === 'not_started' && 'Pending'}
            </Badge>
            
            {/* Complete Button */}
            {stage.status === 'in_progress' && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onCompleted();
                }}
                className="glass-card hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}
            
            {/* Start Button */}
            {stage.status === 'not_started' && onStarted && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onStarted();
                }}
                className="glass-card hover:shadow-lg transition-all duration-300"
              >
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
            )}
            
            {/* More Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="glass-card hover:shadow-lg transition-all duration-300 opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-card border-0">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    Edit Stage
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Assign Users
                </DropdownMenuItem>
                {stage.status === 'not_started' && onStarted && (
                  <DropdownMenuItem onClick={onStarted}>
                    Start Stage
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={onDelete}
                  >
                    Delete Stage
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Progress Indicator */}
        {stage.status === 'in_progress' && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>75%</span> {/* This would be calculated from checklist completion */}
            </div>
            <div className="w-full bg-muted/20 rounded-full h-1.5">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: '75%' }}
              />
            </div>
          </div>
        )}
        
        {/* Time Tracking */}
        {stage.actualHours > 0 && (
          <div className="mt-3 flex justify-between text-xs">
            <span className="text-muted-foreground">Time Spent:</span>
            <span className={cn(
              "font-medium",
              stage.actualHours > stage.estimatedHours ? "text-destructive" : "text-foreground"
            )}>
              {stage.actualHours}h 
              {stage.estimatedHours > 0 && ` / ${stage.estimatedHours}h`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}