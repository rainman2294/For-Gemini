import { useCallback } from 'react';
import { Activity, ActivityDetails } from '@/types/activity';

interface UseActivityLoggerReturn {
  logActivity: (activity: Omit<Activity, 'id' | 'timestamp' | 'userId' | 'userName' | 'userAvatar' | 'metadata'>) => Promise<void>;
  logProjectCreated: (projectId: string, projectName: string, client: string) => Promise<void>;
  logNoteAdded: (projectId: string, noteId: string, noteContent: string, isReply?: boolean, parentNoteId?: string) => Promise<void>;
  logNoteEdited: (projectId: string, noteId: string, noteContent: string, oldContent: string) => Promise<void>;
  logNoteDeleted: (projectId: string, noteId: string, noteContent: string) => Promise<void>;
  logMediaUploaded: (projectId: string, mediaIds: string[], categories: string[]) => Promise<void>;
  logMediaDeleted: (projectId: string, mediaIds: string[]) => Promise<void>;
  logStatusChanged: (projectId: string, statusFrom: string, statusTo: string, reason?: string) => Promise<void>;
  logDeadlineChanged: (projectId: string, deadlineFrom: string, deadlineTo: string, isExtended: boolean, reason?: string) => Promise<void>;
  logPriorityChanged: (projectId: string, priorityFrom: string, priorityTo: string) => Promise<void>;
  logExternalLinkAdded: (projectId: string, linkId: string, linkName: string, linkType: string, linkUrl: string) => Promise<void>;
  logExternalLinkRemoved: (projectId: string, linkId: string, linkName: string, linkType: string) => Promise<void>;
  logBriefUpdated: (projectId: string, briefPreview: string, oldBriefPreview: string) => Promise<void>;
  logMemberAdded: (projectId: string, memberId: string, memberName: string, memberRole: string) => Promise<void>;
  logMemberRemoved: (projectId: string, memberId: string, memberName: string, memberRole: string) => Promise<void>;
  logMemberRoleChanged: (projectId: string, memberId: string, memberName: string, roleFrom: string, roleTo: string) => Promise<void>;
  logProjectManagerChanged: (projectId: string, managerFrom: string, managerTo: string) => Promise<void>;
  logClientChanged: (projectId: string, clientFrom: string, clientTo: string) => Promise<void>;
  logArtistsUpdated: (projectId: string, artistsAdded: string[], artistsRemoved: string[], totalArtists: number) => Promise<void>;
  logVideoUrlAdded: (projectId: string, videoUrl: string, videoPlatform: string) => Promise<void>;
  logVideoUrlRemoved: (projectId: string, videoUrl: string, videoPlatform: string) => Promise<void>;
}

// Properly type the activity data
interface ActivityData {
  type: string;
  title: string;
  description: string;
  project_id?: string;
  project_name?: string;
  related_id?: string;
}

// Type for API config
interface ApiConfig {
  apiUrl: string;
  nonce?: string;
}

export function useActivityLogger(): UseActivityLoggerReturn {
  const apiConfig = typeof window !== 'undefined' && window.pulse2 ? window.pulse2 as ApiConfig : null;
  const jwtToken = typeof window !== 'undefined' ? localStorage.getItem('jwtToken') || '' : '';
  
  const fetchWithAuth = (url: string, options: RequestInit = {}) => {
    const headers = { ...(options.headers || {}) } as Record<string, string>;
    // Prefer WordPress nonce; JWT optional if backend supports it
    if (apiConfig?.nonce) headers['X-WP-Nonce'] = apiConfig.nonce;
    if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`;
    return fetch(url, { ...options, headers });
  };

  // Get current user info
  const getCurrentUser = useCallback(() => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || 'demo-user' : 'demo-user';
    const userName = typeof window !== 'undefined' ? localStorage.getItem('userDisplayName') || 'Demo User' : 'Demo User';
    const userAvatar = typeof window !== 'undefined' ? localStorage.getItem('userAvatar') : undefined;
    
    return { userId, userName, userAvatar };
  }, []);

  // Get metadata for activity logging
  const getMetadata = useCallback(() => {
    if (typeof window === 'undefined') return {};
    
    return {
      userAgent: navigator.userAgent,
      ipAddress: undefined, // Will be set by server
      location: undefined, // Will be set by server
    };
  }, []);

  // Generic activity logging function
  const logActivity = useCallback(async (activity: Omit<Activity, 'id' | 'timestamp' | 'userId' | 'userName' | 'userAvatar' | 'metadata'>) => {
    try {
      const { userId, userName, userAvatar } = getCurrentUser();
      const metadata = getMetadata();
      
      const activityData = {
        ...activity,
        userId,
        userName,
        userAvatar,
        timestamp: new Date(),
        metadata,
      };

      // For now, we'll use the existing API structure
      const apiConfig = typeof window !== 'undefined' && window.pulse2 ? window.pulse2 as ApiConfig : null;
      const jwtToken = typeof window !== 'undefined' ? localStorage.getItem('jwtToken') || '' : '';
      
      if (apiConfig) {
        // Transform data to match WordPress API expectations
        const details = activityData.details || {};
        const wpActivityData: ActivityData = {
          type: activityData.type,
          title: activityData.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: JSON.stringify(details),
          project_id: activityData.projectId,
          project_name: 'projectName' in details ? details.projectName as string : undefined,
          // Type the details more specifically based on the activity type
          related_id: 'noteId' in details 
            ? details.noteId as string 
            : 'projectId' in details 
              ? details.projectId as string 
              : activityData.projectId,
        };

        const response = await fetch(`${apiConfig.apiUrl}/activities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`,
            'X-WP-Nonce': apiConfig.nonce,
          },
          body: JSON.stringify(wpActivityData),
        });

        if (!response.ok) {
          console.error('Failed to log activity:', response.statusText);
        }
      } else {
        // Mock API fallback - store in localStorage for demo
        const activities = JSON.parse(localStorage.getItem('activities') || '[]');
        activities.unshift({
          ...activityData,
          id: `activity-${Date.now()}-${Math.random()}`,
        });
        localStorage.setItem('activities', JSON.stringify(activities.slice(0, 1000))); // Keep last 1000 activities
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }, [getCurrentUser, getMetadata]);

  // Specific logging functions for different activity types
  const logProjectCreated = useCallback(async (projectId: string, projectName: string, client: string) => {
    await logActivity({
      type: 'project_created',
      projectId,
      details: { projectName, client },
    });
  }, [logActivity]);

  const logNoteAdded = useCallback(async (projectId: string, noteId: string, noteContent: string, isReply = false, parentNoteId?: string) => {
    // Get project name from API
    let projectName = 'Unknown Project';
    
    try {
      const apiConfig = typeof window !== 'undefined' && window.pulse2 ? window.pulse2 as ApiConfig : null;
      if (apiConfig && projectId && projectId !== 'general') {
        const response = await fetchWithAuth(`${apiConfig.apiUrl}/projects/${projectId}`);
        if (response.ok) {
          const project = await response.json();
          projectName = project.name || 'Unknown Project';
        }
      }
    } catch (error) {
      console.error('Failed to fetch project name:', error);
    }
    
    await logActivity({
      type: 'note_added',
      projectId,
      details: {
        projectName,
        noteId,
        noteContentPreview: noteContent.length > 100 ? noteContent.substring(0, 100) + '...' : noteContent,
        isReply,
        parentNoteId,
      },
    });
  }, [logActivity]);

  const logNoteEdited = useCallback(async (projectId: string, noteId: string, noteContent: string, oldContent: string) => {
    await logActivity({
      type: 'note_edited',
      projectId,
      details: {
        noteId,
        noteContentPreview: noteContent.length > 100 ? noteContent.substring(0, 100) + '...' : noteContent,
        oldContent: oldContent.length > 100 ? oldContent.substring(0, 100) + '...' : oldContent,
      },
    });
  }, [logActivity]);

  const logNoteDeleted = useCallback(async (projectId: string, noteId: string, noteContent: string) => {
    await logActivity({
      type: 'note_deleted',
      projectId,
      details: {
        noteId,
        noteContentPreview: noteContent.length > 100 ? noteContent.substring(0, 100) + '...' : noteContent,
      },
    });
  }, [logActivity]);

  const logMediaUploaded = useCallback(async (projectId: string, mediaIds: string[], categories: string[]) => {
    await logActivity({
      type: 'media_uploaded',
      projectId,
      details: {
        mediaIds,
        mediaCount: mediaIds.length,
        categories,
      },
    });
  }, [logActivity]);

  const logMediaDeleted = useCallback(async (projectId: string, mediaIds: string[]) => {
    await logActivity({
      type: 'media_deleted',
      projectId,
      details: {
        mediaIds,
        mediaCount: mediaIds.length,
      },
    });
  }, [logActivity]);

  const logStatusChanged = useCallback(async (projectId: string, statusFrom: string, statusTo: string, reason?: string) => {
    // Get project name from API
    let projectName = 'Unknown Project';
    
    try {
      if (apiConfig && projectId && projectId !== 'general') {
        const response = await fetchWithAuth(`${apiConfig.apiUrl}/projects/${projectId}`);
        if (response.ok) {
          const project = await response.json();
          projectName = project.name || 'Unknown Project';
        }
      }
    } catch (error) {
      console.error('Failed to fetch project name:', error);
    }
    
    await logActivity({
      type: 'status_changed',
      projectId,
      details: {
        projectName,
        statusFrom,
        statusTo,
        reason,
      },
    });
  }, [logActivity, apiConfig, fetchWithAuth]);

  const logDeadlineChanged = useCallback(async (projectId: string, deadlineFrom: string, deadlineTo: string, isExtended: boolean, reason?: string) => {
    const type = isExtended ? 'deadline_extended' : 'deadline_shortened';
    await logActivity({
      type,
      projectId,
      details: {
        deadlineFrom,
        deadlineTo,
        reason,
      },
    });
  }, [logActivity]);

  const logPriorityChanged = useCallback(async (projectId: string, priorityFrom: string, priorityTo: string) => {
    await logActivity({
      type: 'priority_changed',
      projectId,
      details: {
        priorityFrom,
        priorityTo,
      },
    });
  }, [logActivity]);

  const logExternalLinkAdded = useCallback(async (projectId: string, linkId: string, linkName: string, linkType: string, linkUrl: string) => {
    await logActivity({
      type: 'external_link_added',
      projectId,
      details: {
        linkId,
        linkName,
        linkType,
        linkUrl,
      },
    });
  }, [logActivity]);

  const logExternalLinkRemoved = useCallback(async (projectId: string, linkId: string, linkName: string, linkType: string) => {
    await logActivity({
      type: 'external_link_removed',
      projectId,
      details: {
        linkId,
        linkName,
        linkType,
      },
    });
  }, [logActivity]);

  const logBriefUpdated = useCallback(async (projectId: string, briefPreview: string, oldBriefPreview: string) => {
    await logActivity({
      type: 'brief_updated',
      projectId,
      details: {
        briefPreview: briefPreview.length > 100 ? briefPreview.substring(0, 100) + '...' : briefPreview,
        oldBriefPreview: oldBriefPreview.length > 100 ? oldBriefPreview.substring(0, 100) + '...' : oldBriefPreview,
      },
    });
  }, [logActivity]);

  const logMemberAdded = useCallback(async (projectId: string, memberId: string, memberName: string, memberRole: string) => {
    await logActivity({
      type: 'member_added',
      projectId,
      details: {
        memberId,
        memberName,
        memberRole,
      },
    });
  }, [logActivity]);

  const logMemberRemoved = useCallback(async (projectId: string, memberId: string, memberName: string, memberRole: string) => {
    await logActivity({
      type: 'member_removed',
      projectId,
      details: {
        memberId,
        memberName,
        memberRole,
      },
    });
  }, [logActivity]);

  const logMemberRoleChanged = useCallback(async (projectId: string, memberId: string, memberName: string, roleFrom: string, roleTo: string) => {
    await logActivity({
      type: 'member_role_changed',
      projectId,
      details: {
        memberId,
        memberName,
        roleFrom,
        roleTo,
      },
    });
  }, [logActivity]);

  const logProjectManagerChanged = useCallback(async (projectId: string, managerFrom: string, managerTo: string) => {
    await logActivity({
      type: 'project_manager_changed',
      projectId,
      details: {
        managerFrom,
        managerTo,
      },
    });
  }, [logActivity]);

  const logClientChanged = useCallback(async (projectId: string, clientFrom: string, clientTo: string) => {
    await logActivity({
      type: 'client_changed',
      projectId,
      details: {
        clientFrom,
        clientTo,
      },
    });
  }, [logActivity]);

  const logArtistsUpdated = useCallback(async (projectId: string, artistsAdded: string[], artistsRemoved: string[], totalArtists: number) => {
    await logActivity({
      type: 'artists_updated',
      projectId,
      details: {
        artistsAdded,
        artistsRemoved,
        totalArtists,
      },
    });
  }, [logActivity]);

  const logVideoUrlAdded = useCallback(async (projectId: string, videoUrl: string, videoPlatform: string) => {
    await logActivity({
      type: 'video_url_added',
      projectId,
      details: {
        videoUrl,
        videoPlatform,
      },
    });
  }, [logActivity]);

  const logVideoUrlRemoved = useCallback(async (projectId: string, videoUrl: string, videoPlatform: string) => {
    await logActivity({
      type: 'video_url_removed',
      projectId,
      details: {
        videoUrl,
        videoPlatform,
      },
    });
  }, [logActivity]);

  return {
    logActivity,
    logProjectCreated,
    logNoteAdded,
    logNoteEdited,
    logNoteDeleted,
    logMediaUploaded,
    logMediaDeleted,
    logStatusChanged,
    logDeadlineChanged,
    logPriorityChanged,
    logExternalLinkAdded,
    logExternalLinkRemoved,
    logBriefUpdated,
    logMemberAdded,
    logMemberRemoved,
    logMemberRoleChanged,
    logProjectManagerChanged,
    logClientChanged,
    logArtistsUpdated,
    logVideoUrlAdded,
    logVideoUrlRemoved,
  };
} 