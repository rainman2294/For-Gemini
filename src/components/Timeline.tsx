import React from 'react';
import { format, differenceInDays, isToday } from 'date-fns';
import { Project, ProjectStatus } from '@/types/project';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDate } from '../lib/utils';
import { getStatusColorClass } from '../lib/statuses';

interface TimelineProps {
  project: Project;
  isCompact: boolean;
}

const getStatusColor = (status: ProjectStatus) => {
  switch (status) {
    case 'delivered': return 'bg-green-600';
    case 'preview-approved': return 'bg-teal-500';
    case 'render-approved': return 'bg-green-500';
    case 'waiting-preview-reply': return 'bg-yellow-500';
    case 'waiting-render-reply': return 'bg-yellow-500';
    case 'preview': return 'bg-blue-500';
    case 'rendering': return 'bg-pink-600';
    case 'preview-feedback': return 'bg-orange-500';
    default: return 'bg-gray-500';
  }
};

export function Timeline({ project, isCompact }: TimelineProps) {
  const safeParseISO = (dateStr: string): Date | null => {
    try {
      return new Date(dateStr);
    } catch {
      return null;
    }
  };

  const startDate = safeParseISO(project.startDate) || new Date();
  const endDate = safeParseISO(project.endDate) || new Date();
  const today = new Date();
  
  const totalDays = Math.max(1, differenceInDays(endDate, startDate));
  const daysPassed = Math.max(0, differenceInDays(today, startDate));
  const progress = Math.min(100, (daysPassed / totalDays) * 100);
  
  const isOverdue = today > endDate && project.status !== 'delivered';
  const isTodayInRange = isToday(today);

  // Calculate positions for status history pins
  const statusPins = (project.statusHistory || []).map(entry => {
    const entryDate = safeParseISO(entry.date) || startDate;
    const daysFromStart = differenceInDays(entryDate, startDate);
    const position = Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));
    return { ...entry, position };
  });

  // Calculate today marker position
  const todayPosition = Math.max(0, Math.min(100, (daysPassed / totalDays) * 100));

  // Generate week markers
  const weekMarkers = [];
  const totalWeeks = Math.ceil(totalDays / 7);
  for (let week = 1; week <= Math.min(totalWeeks, 8); week++) {
    const position = (week * 7 / totalDays) * 100;
    if (position <= 100) {
      weekMarkers.push({ week, position });
    }
  }

  const formatStatusDate = (dateString: string) => {
    const date = safeParseISO(dateString);
    return date ? format(date, 'MMM d, yyyy (EEEE)') : 'Invalid Date';
  };

  return (
    <div className="space-y-3 mt-8">
      <div className="relative">
        {/* Progress bar background */}
        <div className="progress-bar">
          <div 
            className={`progress-fill ${isOverdue ? 'bg-destructive' : ''}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Week markers */}
        {!isCompact && weekMarkers.map(marker => (
          <div
            key={marker.week}
            className="absolute top-0 h-2 w-px bg-muted-foreground/30 mb-2.5"
            style={{ left: `${marker.position}%` }}
          >
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
              W{marker.week}
            </span>
          </div>
        ))}
        
        {/* Today marker */}
        {daysPassed >= 0 && daysPassed <= totalDays && (
          <div
            className="absolute -top-1 -bottom-1 w-0.5 bg-primary-glow"
            style={{ left: `${todayPosition}%` }}
          >
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary-glow rounded-full" />
            {!isCompact && (
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-medium text-primary whitespace-nowrap">
                Today
              </span>
            )}
          </div>
        )}
        
        {/* Status history pins */}
        <TooltipProvider>
          {statusPins.map(pin => (
            <Tooltip key={pin.id}>
              <TooltipTrigger asChild>
                <div
                  className="absolute -top-2 -bottom-2 w-1 cursor-pointer"
                  style={{ left: `${pin.position}%` }}
                >
                  <div className={`w-3 h-3 rounded-full border-2 border-background absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform ${getStatusColor(pin.status)}`} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-medium capitalize">{pin.status.replace('-', ' ')}</p>
                  <p className="text-xs text-muted-foreground">{formatStatusDate(pin.date)}</p>
                  {pin.note && <p className="text-xs mt-1">{pin.note}</p>}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
      
      <div className="flex justify-between text-sm text-muted-foreground mt-2">
        <span>{formatDate(project.startDate)}</span>
        <span className={isOverdue && project.status !== 'delivered' ? 'text-destructive font-medium' : ''}>
          {formatDate(project.endDate)}
          {isOverdue && project.status !== 'delivered' && ' (Overdue)'}
        </span>
      </div>

      {!isCompact && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{Math.round(progress)}% Passed</span>
          <span>
            {Math.max(0, totalDays - daysPassed)} days remaining
          </span>
        </div>
      )}
    </div>
  );
}