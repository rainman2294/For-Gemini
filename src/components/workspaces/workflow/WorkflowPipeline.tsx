import React from 'react';
import { ChevronRight, CheckCircle, Clock, Play, AlertTriangle, Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate } from '@/lib/utils';
import { WorkflowStage } from '@/types/workspace';

interface WorkflowPipelineProps {
  stages: WorkflowStage[];
  selectedStage: WorkflowStage | null;
  onStageSelect: (stage: WorkflowStage) => void;
  onStageCompleted: (stageId: string) => void;
  onStageStarted: (stageId: string) => void;
  className?: string;
}

export default function WorkflowPipeline({
  stages,
  selectedStage,
  onStageSelect,
  onStageCompleted,
  onStageStarted,
  className
}: WorkflowPipelineProps) {
  const getStageStatusConfig = (status: string, name: string) => {
    // Custom colors based on stage names and status
    const stageColorMap = {
      'initial review': {
        pending: { primary: 'from-purple-500 to-indigo-600', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
        in_progress: { primary: 'from-purple-600 to-indigo-700', bg: 'bg-purple-100 border-purple-300', text: 'text-purple-800' },
        completed: { primary: 'from-purple-400 to-indigo-500', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-600' }
      },
      'design development': {
        pending: { primary: 'from-orange-500 to-red-600', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
        in_progress: { primary: 'from-orange-600 to-red-700', bg: 'bg-orange-100 border-orange-300', text: 'text-orange-800' },
        completed: { primary: 'from-orange-400 to-red-500', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-600' }
      },
      'client review': {
        pending: { primary: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
        in_progress: { primary: 'from-emerald-600 to-teal-700', bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-800' },
        completed: { primary: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600' }
      },
      'final delivery': {
        pending: { primary: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
        in_progress: { primary: 'from-blue-600 to-cyan-700', bg: 'bg-blue-100 border-blue-300', text: 'text-blue-800' },
        completed: { primary: 'from-blue-400 to-cyan-500', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-600' }
      }
    };

    const stageName = name.toLowerCase();
    const stageKey = Object.keys(stageColorMap).find(key => stageName.includes(key)) || 'design development';
    const colorConfig = stageColorMap[stageKey as keyof typeof stageColorMap];

    const statusConfig = {
      pending: {
        ...colorConfig.pending,
        icon: Clock,
        text: 'Pending',
        opacity: 'opacity-70'
      },
      in_progress: {
        ...colorConfig.in_progress,
        icon: Play,
        text: 'In Progress',
        opacity: 'opacity-100'
      },
      completed: {
        ...colorConfig.completed,
        icon: CheckCircle,
        text: 'Completed',
        opacity: 'opacity-90'
      },
      skipped: {
        primary: 'from-gray-400 to-gray-500',
        bg: 'bg-gray-50 border-gray-200',
        text: 'text-gray-600',
        icon: AlertTriangle,
        label: 'Skipped',
        opacity: 'opacity-60'
      }
    };

    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  const mockUsers = [
    { id: '1', name: 'Alex Chen', avatar: 'AC' },
    { id: '2', name: 'Sarah Wilson', avatar: 'SW' },
    { id: '3', name: 'Mike Johnson', avatar: 'MJ' }
  ];

  if (stages.length === 0) {
    return (
      <div className="glass-card p-12 rounded-lg text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
          <Clock className="w-8 h-8 text-purple-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Workflow Stages</h3>
        <p className="text-muted-foreground mb-6">
          Create your first workflow stage to start the approval process
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Horizontal Pipeline */}
      <div className="glass-card p-6 rounded-lg overflow-x-auto border-0">
        <div className="flex items-center space-x-4 min-w-max">
          {stages.map((stage, index) => {
            const config = getStageStatusConfig(stage.status, stage.name);
            const isSelected = selectedStage?.id === stage.id;
            const isLast = index === stages.length - 1;
            const IconComponent = config.icon;

            return (
              <div key={stage.id} className="flex items-center">
                {/* Stage Card */}
                <div
                  className={cn(
                    "relative cursor-pointer transition-all duration-300 hover:scale-105",
                    isSelected && "scale-105 ring-2 ring-primary"
                  )}
                  onClick={() => onStageSelect(stage)}
                >
                  <div className={cn(
                    "glass-card p-4 rounded-xl min-w-[280px] border-0",
                    isSelected && "shadow-xl"
                  )}>
                    {/* Stage Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-full glass-card flex items-center justify-center text-white shadow-sm border-0",
                          stage.status === 'completed' && "bg-gradient-to-br from-green-500 to-emerald-600",
                          stage.status === 'in_progress' && "bg-gradient-to-br from-blue-500 to-indigo-600",
                          stage.status === 'not_started' && "bg-gradient-to-br from-slate-500 to-gray-600"
                        )}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-foreground">
                            {stage.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Stage {index + 1}
                          </p>
                        </div>
                      </div>
                      
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
                    </div>

                    {/* Stage Details */}
                    <div className="space-y-2">
                      {stage.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {stage.description}
                        </p>
                      )}
                      
                      {/* Progress and Time */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {stage.estimatedHours}h est.
                        </div>
                        {stage.actualHours > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {stage.actualHours}h actual
                          </div>
                        )}
                      </div>

                      {/* Assigned Users */}
                      {stage.assignedTo && stage.assignedTo.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1">
                            {stage.assignedTo.slice(0, 3).map((userId, i) => {
                              const user = mockUsers.find(u => u.id === userId);
                              return (
                                <div
                                  key={userId}
                                  className="w-6 h-6 rounded-full glass-card flex items-center justify-center text-white text-xs font-medium border-2 border-background shadow-sm"
                                  title={user?.name}
                                >
                                  {user?.avatar || userId.charAt(0).toUpperCase()}
                                </div>
                              );
                            })}
                            {stage.assignedTo.length > 3 && (
                              <div className="w-6 h-6 rounded-full glass-card flex items-center justify-center text-white text-xs font-medium border-2 border-background">
                                +{stage.assignedTo.length - 3}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {stage.assignedTo.length} assigned
                          </span>
                        </div>
                      )}

                      {/* Due Date */}
                      {stage.dueDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Due {formatDate(stage.dueDate)}
                        </div>
                      )}
                    </div>

                    {/* Stage Actions */}
                    <div className="mt-3 pt-3 border-t border-border/20">
                      {stage.status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStageCompleted(stage.id);
                          }}
                          className="w-full text-xs glass-card hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Mark Complete
                        </Button>
                      )}
                      {stage.status === 'not_started' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStageStarted(stage.id);
                          }}
                          className="w-full text-xs glass-card hover:shadow-lg transition-all duration-300 border-0"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Start Stage
                        </Button>
                      )}
                      {stage.status === 'completed' && (
                        <div className="flex items-center justify-center text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed {stage.completedAt && formatDate(stage.completedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Connector Arrow */}
                {!isLast && (
                  <div className="flex items-center mx-2">
                    <div className={cn(
                      "w-8 h-0.5 transition-all duration-300",
                      stage.status === 'completed' 
                        ? "bg-gradient-to-r from-green-400 to-blue-500" 
                        : "bg-gradient-to-r from-border/30 to-border/30"
                    )}>
                    </div>
                    <ChevronRight className={cn(
                      "h-5 w-5 transition-colors duration-300",
                      stage.status === 'completed' 
                        ? "text-green-500" 
                        : "text-muted-foreground/50"
                    )} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}