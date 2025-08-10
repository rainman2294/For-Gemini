import React from 'react';
import { Activity, ActivityDetails as ActivityDetailsType } from '@/types/activity';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Palette, 
  PenTool, 
  GitBranch, 
  Clock, 
  MessageCircle, 
  Pin, 
  User, 
  Circle,
  Flag,
  FileText,
  CheckCircle,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityDetailsProps {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToItem?: () => void;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'project_created':
    case 'project_updated':
      return <Calendar className="h-4 w-4" />;
    case 'moodboard_created':
    case 'moodboard_updated':
    case 'moodboard_deleted':
    case 'moodboard_element_added':
      return <Palette className="h-4 w-4" />;
    case 'whiteboard_created':
    case 'whiteboard_updated':
    case 'whiteboard_deleted':
      return <PenTool className="h-4 w-4" />;
    case 'workflow_created':
    case 'workflow_updated':
    case 'workflow_deleted':
    case 'workflow_stage_completed':
      return <GitBranch className="h-4 w-4" />;
    case 'timeline_created':
    case 'timeline_updated':
    case 'timeline_deleted':
    case 'timeline_milestone_reached':
      return <Clock className="h-4 w-4" />;
    case 'comment_added':
      return <MessageCircle className="h-4 w-4" />;
    case 'whiteboard_pin_added':
    case 'whiteboard_pin_resolved':
      return <Pin className="h-4 w-4" />;
    case 'timeline_milestone_created':
    case 'timeline_milestone_achieved':
      return <Flag className="h-4 w-4" />;
    default:
      return <Circle className="h-4 w-4" />;
  }
};

const getActivityColor = (type: string) => {
  if (type.includes('project')) return 'bg-blue-500';
  if (type.includes('moodboard')) return 'bg-purple-500';
  if (type.includes('whiteboard')) return 'bg-green-500';
  if (type.includes('workflow')) return 'bg-orange-500';
  if (type.includes('timeline')) return 'bg-indigo-500';
  if (type.includes('comment')) return 'bg-yellow-500';
  if (type.includes('pin')) return 'bg-red-500';
  return 'bg-gray-500';
};

const getActivityLabel = (type: string) => {
  const parts = type.split('_');
  const action = parts.pop() || '';
  const subject = parts.join(' ');
  
  return `${subject.charAt(0).toUpperCase() + subject.slice(1)} ${action}`;
};

export function ActivityDetails({ activity, open, onOpenChange, onNavigateToItem }: ActivityDetailsProps) {
  if (!activity) return null;
  
  const timeAgo = activity.timestamp ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }) : 'Unknown time';
  const projectName = activity.details?.projectName;
  const workspaceName = activity.details?.workspaceName;
  const description = activity.details?.reason;
  const noteContent = activity.details?.noteContent;
  const commentText = activity.details?.commentText;
  const notePreview = activity.details?.notePreview;
  const stageName = activity.details?.stageName;
  const milestoneName = activity.details?.taskName; // Using taskName as a fallback for milestone
  const oldValue = activity.details?.oldValue;
  const newValue = activity.details?.newValue;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full text-white ${getActivityColor(activity.type)}`}>
              {getActivityIcon(activity.type)}
            </div>
            <DialogTitle>{workspaceName || projectName || "Activity Details"}</DialogTitle>
          </div>
          <DialogDescription asChild>
            <div className="flex items-center justify-between">
              <Badge variant="outline">{getActivityLabel(activity.type)}</Badge>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Activity Description */}
          <div className="text-sm">
            {description || noteContent || commentText || notePreview || 'No additional details available.'}
          </div>
          
          {/* Metadata */}
          <div className="space-y-2 text-sm">
            {projectName && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Project: {projectName}</span>
              </div>
            )}
            
            {workspaceName && (
              <div className="flex items-center gap-2">
                {activity.type.includes('moodboard') && <Palette className="h-4 w-4 text-muted-foreground" />}
                {activity.type.includes('whiteboard') && <PenTool className="h-4 w-4 text-muted-foreground" />}
                {activity.type.includes('workflow') && <GitBranch className="h-4 w-4 text-muted-foreground" />}
                {activity.type.includes('timeline') && <Clock className="h-4 w-4 text-muted-foreground" />}
                <span>
                  {activity.type.includes('moodboard') && 'Moodboard: '}
                  {activity.type.includes('whiteboard') && 'Whiteboard: '}
                  {activity.type.includes('workflow') && 'Workflow: '}
                  {activity.type.includes('timeline') && 'Timeline: '}
                  {workspaceName}
                </span>
              </div>
            )}
            
            {stageName && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <span>Stage: {stageName}</span>
              </div>
            )}
            
            {milestoneName && (
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-muted-foreground" />
                <span>Milestone: {milestoneName}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>By: {activity.userName}</span>
            </div>
          </div>
          
          {/* Changes if available */}
          {(oldValue && newValue) && (
            <div className="space-y-2 border-t pt-2">
              <p className="text-xs font-medium">Changes:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded">
                  <p className="font-medium mb-1">Previous</p>
                  <p>{String(oldValue)}</p>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded">
                  <p className="font-medium mb-1">New</p>
                  <p>{String(newValue)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          {onNavigateToItem && (
            <Button onClick={onNavigateToItem} className="button-primary-enhanced hover-shimmer cyrus-ui">
              View Details
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 