import { WorkspaceActivity, WorkspaceAction, WorkspaceType } from './workspace';

export interface User {
  id: string;
  name: string;
  avatar?: string;
}

// Enhanced Activity Types - Now includes workspace activities
export type ActivityType = 
  // Project Activities
  | 'project_created'
  | 'project_updated'
  | 'project_deleted'
  | 'project_archived'
  | 'project_member_added'
  | 'project_member_removed'
  | 'note_added'
  | 'note_edited'
  | 'note_deleted'
  | 'media_uploaded'
  | 'media_deleted'
  | 'status_changed'
  | 'deadline_extended'
  | 'deadline_shortened'
  | 'priority_changed'
  | 'external_link_added'
  | 'external_link_removed'
  | 'brief_updated'
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  | 'project_manager_changed'
  | 'client_changed'
  | 'artists_updated'
  | 'video_url_added'
  | 'video_url_removed'
  
  // Workspace Activities
  | 'workspace_created'
  | 'workspace_updated'
  | 'workspace_deleted'
  | 'workspace_member_added'
  | 'workspace_member_removed'
  
  // Moodboard Activities
  | 'moodboard_created'
  | 'moodboard_updated'
  | 'moodboard_deleted'
  | 'moodboard_element_added'
  | 'moodboard_element_removed'
  | 'moodboard_element_updated'
  
  // Whiteboard Activities
  | 'whiteboard_created'
  | 'whiteboard_updated'
  | 'whiteboard_deleted'
  | 'whiteboard_pin_added'
  | 'whiteboard_pin_updated'
  | 'whiteboard_pin_resolved'
  | 'whiteboard_pin_unresolved'
  | 'whiteboard_pin_deleted'
  | 'whiteboard_comment_added'
  | 'whiteboard_comment_updated'
  | 'whiteboard_comment_deleted'
  | 'whiteboard_image_uploaded'
  | 'whiteboard_image_deleted'
  | 'whiteboard_category_created'
  | 'whiteboard_category_updated'
  | 'whiteboard_category_deleted'
  
  // Workflow Activities
  | 'workflow_created'
  | 'workflow_updated'
  | 'workflow_deleted'
  | 'workflow_stage_created'
  | 'workflow_stage_updated'
  | 'workflow_stage_completed'
  | 'workflow_stage_skipped'
  | 'workflow_task_created'
  | 'workflow_task_updated'
  | 'workflow_task_completed'
  | 'workflow_task_assigned'
  | 'workflow_approval_requested'
  | 'workflow_approval_approved'
  | 'workflow_approval_rejected'
  | 'workflow_approval_delegated'
  
  // Timeline Activities
  | 'timeline_created'
  | 'timeline_updated'
  | 'timeline_deleted'
  | 'timeline_task_created'
  | 'timeline_task_updated'
  | 'timeline_task_completed'
  | 'timeline_task_assigned'
  | 'timeline_milestone_created'
  | 'timeline_milestone_achieved'
  | 'timeline_milestone_missed'
  | 'timeline_milestone_reached'
  | 'timeline_task_overdue'
  | 'timeline_assignment_added'
  | 'timeline_dependency_created'
  | 'timeline_progress_updated'
  
  // Collaboration Activities
  | 'comment_added'
  | 'comment_updated'
  | 'comment_deleted'
  | 'file_uploaded'
  | 'file_downloaded'
  | 'file_deleted'
  
  // System Activities
  | 'user_joined'
  | 'user_left'
  | 'permission_changed'
  | 'notification_sent';

export interface Activity {
  id: string;
  type: ActivityType;
  projectId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: string;
  details: ActivityDetails;
  workspaceId?: string;
  relatedUsers?: string[];
}

// Legacy compatibility - keeping both types
export type BaseActivity = Activity;
export interface EnrichedActivity extends Activity {
  project?: {
    id: string;
    name: string;
    client?: string;
  };
  workspace?: {
    id: string;
    name: string;
    type: string;
  };
  isRead?: boolean;
  projectName?: string;
  createdAt?: string;
}

// Activity Grouping for better UX
export interface ActivityGroup {
  date: string; // YYYY-MM-DD
  activities: EnrichedActivity[];
}

// Activity Filters
export interface ActivityFilters {
  types: ActivityType[];
  projectIds: string[];
  workspaceTypes: WorkspaceType[];
  userIds: string[];
  dateRange: {
    start: string;
    end: string;
  };
  isRead?: boolean;
}

// Activity Statistics
export interface ActivityStats {
  totalCount: number;
  unreadCount: number;
  todayCount: number;
  weekCount: number;
  byType: Record<ActivityType, number>;
  byUser: Record<string, number>;
  byProject: Record<string, number>;
  byWorkspaceType: Record<WorkspaceType, number>;
}

// Notification Integration
export interface NotificationSettings {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  activityTypes: {
    [K in ActivityType]: boolean;
  };
  workspaceTypes: {
    [K in WorkspaceType]: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string;   // HH:MM
  };
}

// Activity Context for creating activities
export interface CreateActivityContext {
  type: ActivityType;
  projectId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  details: Partial<ActivityDetails>;
  relatedUsers?: string[];
  workspaceId?: string;
}

// Activity Feed Configuration
export interface ActivityFeedConfig {
  itemsPerPage: number;
  groupByDate: boolean;
  showAvatars: boolean;
  showTimestamps: boolean;
  showWorkspaceContext: boolean;
  enableRealTimeUpdates: boolean;
  maxItemsToKeep: number; // For performance
} 

// Enhanced Activity Details - Now supports workspace contexts
export interface ActivityDetails {
  // Project-related details
  projectName?: string;
  client?: string;
  oldValue?: string | number | boolean;
  newValue?: string | number | boolean;
  fileName?: string;
  fileUrl?: string;
  noteContent?: string;
  artistName?: string;
  noteId?: string;
  noteContentPreview?: string;
  isReply?: boolean;
  parentNoteId?: string;
  oldContent?: string;
  mediaIds?: string[];
  mediaCount?: number;
  categories?: string[];
  statusFrom?: string;
  statusTo?: string;
  reason?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
  priorityFrom?: string;
  priorityTo?: string;
  linkId?: string;
  linkName?: string;
  linkType?: string;
  linkUrl?: string;
  briefPreview?: string;
  oldBriefPreview?: string;
  memberId?: string;
  memberName?: string;
  memberRole?: string;
  roleFrom?: string;
  roleTo?: string;
  managerFrom?: string;
  managerTo?: string;
  clientFrom?: string;
  clientTo?: string;
  artistsAdded?: string[];
  artistsRemoved?: string[];
  totalArtists?: number;
  videoUrl?: string;
  videoPlatform?: string;
  
  // Workspace-related details
  workspaceId?: string;
  workspaceName?: string;
  workspaceType?: WorkspaceType;
  elementType?: string;
  elementName?: string;
  annotationContent?: string;
  stageId?: string;
  stageName?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  taskId?: string;
  taskName?: string;
  collaboratorId?: string;
  collaboratorName?: string;
  
  // Whiteboard specific
  whiteboardId?: string;
  whiteboardName?: string;
  imageId?: string;
  imageName?: string;
  pinPosition?: { x: number; y: number };
  notePreview?: string;
  categoryName?: string;
  commentText?: string;
  
  // Generic details for extensibility
  metadata?: Record<string, unknown>;
} 