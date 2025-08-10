import { Activity, ActivityType } from '@/types/activity';

// WordPress API configuration
const getApiConfig = () => {
  if (typeof window !== 'undefined' && window.pulse2) {
    return window.pulse2;
  }
  // Fallback for development
  return {
    apiUrl: '/wp-json/pulse2/v1',
    mediaUrl: '/wp-json/wp/v2/media',
    nonce: ''
  };
};

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const config = getApiConfig();
  const url = `${config.apiUrl}${endpoint}`;
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add JWT authorization if available
  const jwtToken = typeof window !== 'undefined' ? localStorage.getItem('jwtToken') : null;
  if (jwtToken) {
    defaultHeaders['Authorization'] = `Bearer ${jwtToken}`;
  }
  
  if (config.nonce) {
    defaultHeaders['X-WP-Nonce'] = config.nonce;
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  projectId?: string;
  projectName?: string;
  userId: string;
  userName?: string;
  date: string;
  metadata?: {
    itemId?: string;
    oldValue?: any;
    newValue?: any;
    [key: string]: any;
  };
}

interface LogActivityParams {
  type: ActivityType;
  title: string;
  description?: string;
  projectId?: string;
  userId: string;
  metadata?: ActivityItem['metadata'];
}

class ActivityService {
  private activities: Activity[] = [];
  private listeners: ((activities: Activity[]) => void)[] = [];

  // Mock user data
  private users = new Map([
    ['current-user', { id: 'current-user', name: 'Current User', avatar: 'CU' }],
    ['user-1', { id: 'user-1', name: 'John Doe', avatar: 'JD' }],
    ['user-2', { id: 'user-2', name: 'Sarah Chen', avatar: 'SC' }],
    ['user-3', { id: 'user-3', name: 'Mike Johnson', avatar: 'MJ' }],
    ['user-4', { id: 'user-4', name: 'Emma Wilson', avatar: 'EW' }],
    ['user-5', { id: 'user-5', name: 'Alex Turner', avatar: 'AT' }],
  ]);

  // Mock project data
  private projects = new Map([
    ['project-1', { id: 'project-1', name: 'Nike Campaign 2024' }],
    ['project-2', { id: 'project-2', name: 'Apple Store Redesign' }],
    ['project-3', { id: 'project-3', name: 'Tesla Model S Campaign' }],
  ]);

  constructor() {
    // Initialize with some mock activities
    this.seedMockActivities();
  }

  private seedMockActivities() {
    const mockActivities: Activity[] = [
      {
        id: '1',
        type: 'project_created',
        projectId: 'project-1',
        userId: 'user-1',
        userName: 'Sarah Chen',
        timestamp: '2024-01-15T10:30:00Z',
        details: {
          projectName: 'Nike Campaign 2024'
        }
      },
      {
        id: '2',
        type: 'moodboard_created',
        projectId: 'project-1',
        userId: 'user-2',
        userName: 'Mike Johnson',
        timestamp: '2024-01-16T14:20:00Z',
        details: {
          projectName: 'Nike Campaign 2024',
          workspaceName: 'Brand Exploration'
        }
      },
      {
        id: '3',
        type: 'whiteboard_created',
        projectId: 'project-1',
        userId: 'user-3',
        userName: 'Emma Wilson',
        timestamp: '2024-01-17T09:15:00Z',
        details: {
          projectName: 'Nike Campaign 2024',
          workspaceName: 'Homepage Review'
        }
      },
      {
        id: '4',
        type: 'comment_added',
        projectId: 'project-1',
        userId: 'user-4',
        userName: 'Alex Turner',
        timestamp: '2024-01-17T16:45:00Z',
        details: {
          projectName: 'Nike Campaign 2024',
          commentText: 'Feedback on color palette'
        }
      },
      {
        id: '5',
        type: 'whiteboard_pin_added',
        projectId: 'project-1',
        userId: 'user-1',
        userName: 'Sarah Chen',
        timestamp: '2024-01-18T11:30:00Z',
        details: {
          projectName: 'Nike Campaign 2024',
          notePreview: 'Navigation issue noted'
        }
      },
      {
        id: '6',
        type: 'workflow_created',
        projectId: 'project-1',
        userId: 'user-2',
        userName: 'Mike Johnson',
        timestamp: '2024-01-19T13:20:00Z',
        details: {
          projectName: 'Nike Campaign 2024',
          workspaceName: 'Campaign Launch Process'
        }
      },
      {
        id: '7',
        type: 'timeline_updated',
        projectId: 'project-1',
        userId: 'user-3',
        userName: 'Emma Wilson',
        timestamp: '2024-01-20T15:10:00Z',
        details: {
          projectName: 'Nike Campaign 2024',
          reason: 'Updated delivery milestones'
        }
      },
    ];

    this.activities = mockActivities;
  }

  public logActivity(params: LogActivityParams): Activity {
    // Get current user name from localStorage if possible
    let userName = 'Unknown User';
    if (params.userId === 'current-user' || params.userId === localStorage.getItem('userId')) {
      const displayName = localStorage.getItem('userDisplayName');
      if (displayName) {
        userName = displayName;
      } else if (this.users.has(params.userId)) {
        const user = this.users.get(params.userId);
        userName = user?.name || 'Unknown User';
      }
    } else if (this.users.has(params.userId)) {
    const user = this.users.get(params.userId);
      userName = user?.name || 'Unknown User';
    }

    // Get project name if possible
    let projectName = '';
    if (params.projectId && this.projects.has(params.projectId)) {
      const project = this.projects.get(params.projectId);
      projectName = project?.name || '';
    }

    // Create activity object
    const activity: Activity = {
      id: Math.random().toString(36).substring(2, 15),
      type: params.type,
      projectId: params.projectId || '',
      userId: params.userId,
      userName,
      timestamp: new Date().toISOString(),
      details: {
        projectName: projectName,
        ...params.metadata
      }
    };

    if (params.title) {
      if (params.type.includes('moodboard') || params.type.includes('whiteboard') || 
          params.type.includes('workflow') || params.type.includes('timeline')) {
        activity.details.workspaceName = params.title;
      } else {
        activity.details.reason = params.title;
      }
    }

    if (params.description) {
      activity.details.noteContent = params.description;
    }

    // Add to activities array
    this.activities.unshift(activity);
    // Only keep the last 100 activities
    this.activities = this.activities.slice(0, 100);
    // Notify listeners
    this.notifyListeners();

    // Return the created activity
    return activity;
  }

  public getActivities(): Activity[] {
    return [...this.activities];
  }

  public getActivitiesForDate(date: string): Activity[] {
    const targetDate = date.split('T')[0]; // Get YYYY-MM-DD part
    return this.activities.filter(activity => {
      if (!activity.timestamp) return false;
      const activityDate = activity.timestamp.split('T')[0];
      return activityDate === targetDate;
    });
  }

  public getActivitiesForProject(projectId: string): Activity[] {
    return this.activities.filter(activity => activity.projectId === projectId);
  }

  public getActivitiesByType(type: Activity['type']): Activity[] {
    return this.activities.filter(activity => activity.type === type);
  }

  public getActivitiesInDateRange(startDate: string, endDate: string): Activity[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return this.activities.filter(activity => {
      if (!activity.timestamp) return false;
      const activityDate = new Date(activity.timestamp);
      return activityDate >= start && activityDate <= end;
    });
  }

  public getActivityStats() {
    const total = this.activities.length;
    const today = new Date().toISOString().split('T')[0];
    const todayCount = this.getActivitiesForDate(today).length;
    
    const typeStats = this.activities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      today: todayCount,
      byType: typeStats,
      mostActiveProject: this.getMostActiveProject(),
      mostActiveUser: this.getMostActiveUser()
    };
  }

  private getMostActiveProject(): { id: string; name: string; count: number } | null {
    const projectCounts = this.activities.reduce((acc, activity) => {
      if (activity.projectId) {
        acc[activity.projectId] = (acc[activity.projectId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topProjectId = Object.keys(projectCounts).reduce((a, b) => 
      projectCounts[a] > projectCounts[b] ? a : b
    );

    if (!topProjectId) return null;

    const project = this.projects.get(topProjectId);
    return project ? {
      id: topProjectId,
      name: project.name,
      count: projectCounts[topProjectId]
    } : null;
  }

  private getMostActiveUser(): { id: string; name: string; count: number } | null {
    const userCounts = this.activities.reduce((acc, activity) => {
      acc[activity.userId] = (acc[activity.userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topUserId = Object.keys(userCounts).reduce((a, b) => 
      userCounts[a] > userCounts[b] ? a : b
    );

    if (!topUserId) return null;

    const user = this.users.get(topUserId);
    return user ? {
      id: topUserId,
      name: user.name,
      count: userCounts[topUserId]
    } : null;
  }

  public subscribe(listener: (activities: Activity[]) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.activities]));
  }

  // Utility methods for specific activity types
  public logProjectCreated(projectId: string, projectName: string, userId: string) {
    return this.logActivity({
      type: 'project_created',
      title: projectName,
      projectId,
      userId,
      metadata: { projectId }
    });
  }

  public logMoodboardCreated(moodboardId: string, moodboardName: string, projectId: string, userId: string) {
    return this.logActivity({
      type: 'moodboard_created',
      title: moodboardName,
      projectId,
      userId,
      metadata: { moodboardId }
    });
  }

  public logWhiteboardCreated(whiteboardId: string, whiteboardName: string, projectId: string, userId: string) {
    return this.logActivity({
      type: 'whiteboard_created',
      title: whiteboardName,
      projectId,
      userId,
      metadata: { whiteboardId }
    });
  }

  public logCommentAdded(content: string, targetType: string, targetId: string, projectId: string, userId: string) {
    return this.logActivity({
      type: 'comment_added',
      title: `Comment on ${targetType}`,
      description: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      projectId,
      userId,
      metadata: { targetType, targetId, content }
    });
  }

  public logPinAdded(pinNote: string, imageId: string, projectId: string, userId: string) {
    return this.logActivity({
      type: 'whiteboard_pin_added',
      title: 'Pin added to image',
      description: pinNote.substring(0, 100) + (pinNote.length > 100 ? '...' : ''),
      projectId,
      userId,
      metadata: { imageId, pinNote }
    });
  }

  public logStatusChanged(itemType: string, itemId: string, oldStatus: string, newStatus: string, projectId: string, userId: string) {
    return this.logActivity({
      type: 'status_changed',
      title: `${itemType} status changed`,
      description: `Changed from ${oldStatus} to ${newStatus}`,
      projectId,
      userId,
      metadata: { itemType, itemId, oldStatus, newStatus }
    });
  }

  // Additional methods for workspace activities
  
  // Whiteboard Activities
  public logWhiteboardUpdated(whiteboardId: string, whiteboardName: string, projectId: string, userId: string, changes?: string) {
    return this.logActivity({
      type: 'whiteboard_updated',
      title: `Whiteboard "${whiteboardName}" updated`,
      description: changes ? `Changes: ${changes}` : undefined,
      projectId,
      userId,
      metadata: {
        whiteboardId,
        whiteboardName
      }
    });
  }

  public logWhiteboardDeleted(whiteboardId: string, whiteboardName: string, projectId: string, userId: string) {
    return this.logActivity({
      type: 'whiteboard_deleted',
      title: `Whiteboard "${whiteboardName}" deleted`,
      projectId,
      userId,
      metadata: {
        whiteboardId,
        whiteboardName
      }
    });
  }

  public logWhiteboardPinAdded(whiteboardId: string, whiteboardName: string, pinContent: string, projectId: string, userId: string) {
    return this.logActivity({
      type: 'whiteboard_pin_added',
      title: `Pin added to whiteboard "${whiteboardName}"`,
      description: pinContent.length > 50 ? `${pinContent.substring(0, 50)}...` : pinContent,
      projectId,
      userId,
      metadata: {
        whiteboardId,
        whiteboardName,
        pinContent
      }
    });
  }

  public logWhiteboardPinResolved(whiteboardId: string, whiteboardName: string, pinId: string, projectId: string, userId: string) {
    return this.logActivity({
      type: 'whiteboard_pin_resolved',
      title: `Pin resolved on whiteboard "${whiteboardName}"`,
      projectId,
      userId,
      metadata: {
        whiteboardId,
        whiteboardName,
        pinId
      }
    });
  }

  // Moodboard Activities
  public logMoodboardUpdated(moodboardId: string, moodboardName: string, projectId: string, userId: string, changes?: string) {
    return this.logActivity({
      type: 'moodboard_updated',
      title: `Moodboard "${moodboardName}" updated`,
      description: changes ? `Changes: ${changes}` : undefined,
      projectId,
      userId,
      metadata: {
        moodboardId,
        moodboardName
      }
    });
  }

  public logMoodboardDeleted(moodboardId: string, moodboardName: string, projectId: string, userId: string) {
    return this.logActivity({
      type: 'moodboard_deleted',
      title: `Moodboard "${moodboardName}" deleted`,
      projectId,
      userId,
      metadata: {
        moodboardId,
        moodboardName
      }
    });
  }

  public logMoodboardElementAdded(moodboardId: string, moodboardName: string, elementType: string, projectId: string, userId: string) {
    return this.logActivity({
      type: 'moodboard_element_added',
      title: `${elementType} added to moodboard "${moodboardName}"`,
      projectId,
      userId,
      metadata: {
        moodboardId,
        moodboardName,
        elementType
      }
    });
  }

  // Workflow Activities
  public logWorkflowUpdated(workflowId: string, workflowName: string, projectId: string, userId: string, changes?: string) {
    return this.logActivity({
      type: 'workflow_updated',
      title: `Workflow "${workflowName}" updated`,
      description: changes ? `Changes: ${changes}` : undefined,
      projectId,
      userId,
      metadata: {
        workflowId,
        workflowName
      }
    });
  }

  public logWorkflowDeleted(workflowId: string, workflowName: string, projectId: string, userId: string) {
    return this.logActivity({
      type: 'workflow_deleted',
      title: `Workflow "${workflowName}" deleted`,
      projectId,
      userId,
      metadata: {
        workflowId,
        workflowName
      }
    });
  }

  public logWorkflowStageCompleted(workflowId: string, workflowName: string, stageId: string, stageName: string, projectId: string, userId: string) {
    return this.logActivity({
      type: 'workflow_stage_completed',
      title: `Stage "${stageName}" completed in workflow "${workflowName}"`,
      projectId,
      userId,
      metadata: {
        workflowId,
        workflowName,
        stageId,
        stageName
      }
    });
  }

  // Timeline Activities
  public logTimelineUpdated(timelineId: string, timelineName: string, projectId: string, userId: string, changes?: string) {
    return this.logActivity({
      type: 'timeline_updated',
      title: `Timeline "${timelineName}" updated`,
      description: changes ? `Changes: ${changes}` : undefined,
      projectId,
      userId,
      metadata: {
        timelineId,
        timelineName
      }
    });
  }

  public logTimelineDeleted(timelineId: string, timelineName: string, projectId: string, userId: string) {
    return this.logActivity({
      type: 'timeline_deleted',
      title: `Timeline "${timelineName}" deleted`,
      projectId,
      userId,
      metadata: {
        timelineId,
        timelineName
      }
    });
  }

  public logTimelineMilestoneReached(timelineId: string, timelineName: string, milestoneId: string, milestoneName: string, projectId: string, userId: string) {
    return this.logActivity({
      type: 'timeline_milestone_reached',
      title: `Milestone "${milestoneName}" reached in timeline "${timelineName}"`,
      projectId,
      userId,
      metadata: {
        timelineId,
        timelineName,
        milestoneId,
        milestoneName
      }
    });
  }

  // Clear all activities (for testing)
  public clearActivities() {
    this.activities = [];
    this.notifyListeners();
  }

  // Import/export for persistence
  public exportActivities(): string {
    return JSON.stringify(this.activities, null, 2);
  }

  public importActivities(data: string): void {
    try {
      const imported = JSON.parse(data) as Activity[];
      this.activities = imported;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to import activities:', error);
    }
  }

  // New method for user-specific activities
  public getActivitiesByUser(userId: string): Activity[] {
    return this.activities.filter(activity => activity.userId === userId);
  }
}

// Create singleton instance
export const activityService = new ActivityService();

// Export types for use in components
export type { ActivityItem, LogActivityParams };