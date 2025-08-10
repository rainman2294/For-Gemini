import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, MessageCircle, Plus, Edit, Trash2, User, Calendar, Tag, Filter, Search, Send, AtSign, Paperclip, Link, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { activityService } from '@/services/activityService';
import { useActivities } from '@/hooks/useActivities';

// Keep local interface for compatibility with the actual data structure
interface FeedActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  userId: string;
  userName: string;
  projectId: string;
  projectName: string;
  relatedId: string;
  createdAt: string;
}

interface ActivityFeedProps {
  projectId?: string;
  limit?: number;
  onActivityClick?: (activity: FeedActivity) => void;
  showFilters?: boolean;
  userId?: string; // Add userId for Profile tab filtering
  isMainActivityTab?: boolean; // To enable auto-refresh for main activity tab
  showRefreshButton?: boolean; // Show manual refresh button
  hideAllUsersFilter?: boolean; // Hide "All Users" filter in profile mode
}

export function ActivityFeed({ projectId, limit = 20, onActivityClick, showFilters = false, userId, isMainActivityTab = false, showRefreshButton = false, hideAllUsersFilter = false }: ActivityFeedProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  
  // Debounced search term to avoid too many API calls
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  
  const apiConfig = typeof window !== 'undefined' && window.pulse2 ? window.pulse2 : null;
  const jwtToken = typeof window !== 'undefined' ? localStorage.getItem('jwtToken') || '' : '';

  // Memoize fetchWithAuth to prevent it from changing on every render
  const fetchWithAuth = useCallback((url: string, options: RequestInit = {}) => {
    const headers = { ...(options.headers || {}) } as Record<string, string>;
    if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`;
    if ((apiConfig as any)?.nonce) headers['X-WP-Nonce'] = (apiConfig as any).nonce as string;
    return fetch(url, { ...options, headers });
  }, [jwtToken, apiConfig]);

  // Fetch settings
  useEffect(() => {
    if (apiConfig) {
      fetchWithAuth(`${apiConfig.apiUrl}/settings`)
        .then(res => res.json())
        .then(data => setSettings(data))
        .catch(() => setSettings({}));
    }
  }, [apiConfig, fetchWithAuth]);

  // Build query key based on filters
  const queryKey = useMemo(() => [
    'activities',
    projectId,
    userId,
    limit,
    debouncedSearchTerm,
    filterType
  ], [projectId, userId, limit, debouncedSearchTerm, filterType]);

  // Server-source activities via React Query when in WordPress mode
  const { data: serverActivities = [], isLoading: rqLoading, error: rqError } = useActivities({
    projectId,
    userId,
    search: debouncedSearchTerm,
    type: filterType,
    limit,
  });

  useEffect(() => {
    if (rqError) {
      console.error('Activities fetch error:', rqError);
    }
  }, [rqError]);

  // Local fallback (dev mode). In WP mode, prefer server data below.
  const [activities, setActivities] = useState<FeedActivity[]>([]);

  useEffect(() => {
    if (apiConfig) return; // skip local subscription in WP mode
    const unsubscribe = activityService.subscribe((newActivities) => {
      let filtered = newActivities;
      if (userId) {
        filtered = filtered.filter(act => act.userId === userId);
      }
      const convertedActivities: FeedActivity[] = filtered.map(activity => ({
        id: activity.id,
        type: activity.type,
        title: (activity as any).title || activity.type,
        description: (activity as any).title || activity.type,
        userId: activity.userId,
        userName: activity.userName,
        projectId: activity.projectId || '',
        projectName: (activity as any).metadata?.projectName || '',
        relatedId: (activity as any).metadata?.imageId || (activity as any).metadata?.commentId || (activity as any).metadata?.pinId || '',
        createdAt: (activity as any).timestamp
      }));
      setActivities(convertedActivities);
    });

    const initialActivities: FeedActivity[] = activityService.getActivities().map(activity => ({
      id: activity.id,
      type: activity.type,
      title: (activity as any).title || activity.type,
      description: (activity as any).title || activity.type,
      userId: activity.userId,
      userName: activity.userName,
      projectId: activity.projectId || '',
      projectName: (activity as any).metadata?.projectName || '',
      relatedId: (activity as any).metadata?.imageId || (activity as any).metadata?.commentId || (activity as any).metadata?.pinId || '',
      createdAt: (activity as any).timestamp
    }));
    setActivities(initialActivities);

    return unsubscribe;
  }, [userId, apiConfig]);

  const listToRender: FeedActivity[] = apiConfig
    ? (serverActivities as any[]).map((a: any) => ({
        id: a.id || a.post_id || a.uuid || `${a.type}-${a.date}`,
        type: a.type,
        title: a.title || a.type,
        description: a.description || a.title || a.type,
        userId: `${a.user_id || ''}`,
        userName: a.user_name || '',
        projectId: a.project_id || '',
        projectName: a.project_name || '',
        relatedId: a.related_id || '',
        createdAt: a.date || a.created_at || a.timestamp,
      }))
    : activities;

  const isLoading = apiConfig ? rqLoading : false;
  const error = apiConfig ? (rqError as any) : null;

  const refetch = useCallback(() => {
    if (apiConfig) {
      // Trigger server reload by toggling dependencies; simplest is to call the effect by updating searchTerm silently
      // For now, just re-run the effect by setting state no-op
      setDebouncedSearchTerm(prev => prev);
      return;
    }
    const refreshedActivities = activityService.getActivities().map(activity => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      description: activity.title,
      userId: activity.userId,
      userName: activity.userName,
      projectId: activity.projectId || '',
      projectName: activity.metadata?.projectName || '',
      relatedId: activity.metadata?.imageId || activity.metadata?.commentId || activity.metadata?.pinId || '',
      createdAt: activity.timestamp
    }));
    setActivities(refreshedActivities);
  }, [apiConfig]);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Update hasMore based on activities length
  useEffect(() => {
    setHasMore(listToRender.length === limit);
  }, [listToRender, limit]);

  const loadMoreActivities = async () => {
    if (!apiConfig || !hasMore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      let url = `${apiConfig.apiUrl}/activities?limit=${limit}&page=${nextPage}`;
      if (projectId) {
        url += `&project_id=${projectId}`;
      }
      if (userId) {
        url += `&user_id=${userId}`;
      }
      if (debouncedSearchTerm.trim()) {
        url += `&search=${encodeURIComponent(debouncedSearchTerm.trim())}`;
      }
      if (filterType !== 'all') {
        url += `&type=${encodeURIComponent(filterType)}`;
      }
      
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        throw new Error('Failed to fetch more activities');
      }
      
      const moreActivities = await response.json();
      // Note: This would need a more sophisticated approach to merge with React Query cache
      // For now, we'll keep this simple implementation
      setHasMore(moreActivities.length === limit);
      setPage(nextPage);
    } catch (error) {
      console.error('Error loading more activities:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Activities are now filtered server-side, so we just use them directly
  // Keep client-side user filter for backward compatibility
  const filteredActivities = listToRender.filter((activity: FeedActivity) => {
    // User filter (only client-side filter remaining)
    if (filterUser !== 'all') {
      const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      if (filterUser === 'me' && activity.userId !== currentUserId) {
        return false;
      }
      if (filterUser === 'others' && activity.userId === currentUserId) {
        return false;
      }
    }
    
    return true;
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'note_added':
      case 'note_edited':
      case 'note_deleted':
        return <MessageCircle className="h-4 w-4" />;
      case 'project_created':
        return <Plus className="h-4 w-4" />;
      case 'status_changed':
        return <Tag className="h-4 w-4" />;
      case 'member_added':
      case 'member_removed':
        return <User className="h-4 w-4" />;
      case 'deadline_extended':
      case 'deadline_shortened':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Edit className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'project_created':
        return 'bg-green-100 text-green-800';
      case 'note_added':
        return 'bg-blue-100 text-blue-800';
      case 'note_edited':
        return 'bg-yellow-100 text-yellow-800';
      case 'note_deleted':
        return 'bg-red-100 text-red-800';
      case 'status_changed':
        return 'bg-purple-100 text-purple-800';
      case 'member_added':
        return 'bg-indigo-100 text-indigo-800';
      case 'member_removed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatActivityDescription = (description: string, activity: FeedActivity) => {
    try {
      const details = JSON.parse(description);
      let desc = '';
      
      if (details.noteContentPreview) {
        desc = details.noteContentPreview;
      } else if (details.projectName) {
        desc = `Project: ${details.projectName}`;
      } else if (details.statusFrom && details.statusTo) {
        desc = `Status changed from ${details.statusFrom} to ${details.statusTo}`;
      } else {
        desc = description;
      }
      
      // Add project context if available
      if (activity.projectName && !desc.includes('Project:')) {
        desc += ` • Project: ${activity.projectName}`;
      }
      
      return desc;
    } catch {
      let desc = description;
      if (activity.projectName && !desc.includes('Project:')) {
        desc += ` • Project: ${activity.projectName}`;
      }
      return desc;
    }
  };

  const handleAddNote = async () => {
    if (!noteInput.trim() || !apiConfig) return;
    
    setIsAddingNote(true);
    try {
      // Upload images first if any
      const imageIds: string[] = [];
      
      if (selectedImages.length > 0) {
        const currentUser = localStorage.getItem('userName') || 'unknown';
        const userId = localStorage.getItem('userId') || 'unknown';
        
        for (const image of selectedImages) {
          const formData = new FormData();
          // Rename file with user info for identification
          const timestamp = Date.now();
          const fileExtension = image.name.split('.').pop();
          const newFileName = `${currentUser}_${userId}_${timestamp}.${fileExtension}`;
          formData.append('file', new File([image], newFileName, { type: image.type }));
          formData.append('title', `Idea by ${currentUser}`);
          formData.append('alt_text', `Image shared by ${currentUser}`);
          
          const uploadResponse = await fetchWithAuth(`${apiConfig.mediaUrl || '/wp-json/wp/v2/media'}`, {
            method: 'POST',
            body: formData,
          });
          
          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            imageIds.push(uploadData.id.toString());
          }
        }
      }
      
      const response = await fetchWithAuth(`${apiConfig.apiUrl}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: noteInput,
          project_id: projectId || 'general', // Use 'general' for general ideas
          is_team_note: true,
          type: projectId ? 'project_note' : 'general_idea',
          media_ids: imageIds
        }),
      });
      
      if (response.ok) {
        setNoteInput('');
        setSelectedImages([]);
        setShowNoteInput(false);
        refetch(); // Refresh activities
      } else {
        console.error('Failed to add note:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setIsAddingNote(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4 border rounded-lg animate-pulse">
                <div className="h-8 w-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Failed to load activities</p>
            <Button onClick={() => refetch()} variant="outline" className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Activity Feed</span>
          <div className="flex items-center gap-2">
            {showRefreshButton && (
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
            <Button 
              onClick={() => setShowNoteInput(!showNoteInput)} 
              variant="outline" 
              size="sm"
              className="rounded-full px-3"
            >
              <Plus className="h-4 w-4 mr-2" /> {projectId ? 'Add Note' : 'Share Idea'}
            </Button>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
        
        {/* Team Note Input - Moved to top */}
        {showNoteInput && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 p-2 rounded-full bg-primary/10">
                <MessageCircle className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder={projectId ? "Add a project note... Use @ to mention people, add links, or attach images" : "Share a general idea with the team... Use @ to mention people, add links, or attach images"}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="min-h-[80px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleAddNote();
                    }
                  }}
                />
                
                {/* Image Selection */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files) {
                        setSelectedImages(Array.from(e.target.files));
                      }
                    }}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attach Images
                  </Button>
                  {selectedImages.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {selectedImages.length} image(s) selected
                    </span>
                  )}
                </div>
                
                {/* Selected Images Preview */}
                {selectedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedImages.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Selected ${index + 1}`}
                          className="w-16 h-16 object-cover rounded border"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={() => {
                            setSelectedImages(prev => prev.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Press Cmd/Ctrl + Enter to send</span>
                    <span>•</span>
                    <span>Use @ to mention people</span>
                    <span>•</span>
                    <span>Paste links to attach</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setShowNoteInput(false)} 
                      variant="outline" 
                      size="sm"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddNote} 
                      disabled={!noteInput.trim() || isAddingNote}
                      size="sm"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isAddingNote ? 'Sending...' : (projectId ? 'Send Note' : 'Share Idea')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Inline Filters with Buttons */}
        {showFilters && (
          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="project_created">Project Created</SelectItem>
                <SelectItem value="note_added">Note Added</SelectItem>
                <SelectItem value="note_edited">Note Edited</SelectItem>
                <SelectItem value="note_deleted">Note Deleted</SelectItem>
                <SelectItem value="status_changed">Status Changed</SelectItem>
                <SelectItem value="member_added">Member Added</SelectItem>
                <SelectItem value="member_removed">Member Removed</SelectItem>
              </SelectContent>
            </Select>
            {!hideAllUsersFilter && (
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="me">My Activities</SelectItem>
                  <SelectItem value="others">Others' Activities</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activities found</p>
            </div>
                      ) : (
              filteredActivities.map((activity: FeedActivity) => (
               <div 
                 key={activity.id} 
                 className={`flex items-start gap-3 p-4 border rounded-lg transition-colors ${
                   onActivityClick ? 'hover:bg-muted/50 cursor-pointer' : 'hover:bg-muted/50'
                 }`}
                 onClick={() => {
                   if (onActivityClick) {
                     onActivityClick(activity);
                   } else if (settings?.app_url && activity.projectId) {
                     // Navigate to project using app URL from settings
                     window.location.href = `${settings.app_url}#project-${activity.projectId}`;
                   }
                 }}
               >
                <div className="flex-shrink-0 p-2 rounded-full bg-muted">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{activity.userName}</span>
                    <Badge className={getActivityColor(activity.type)}>
                      {activity.title}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                                     <p className="text-sm text-muted-foreground">
                     {formatActivityDescription(activity.description, activity)}
                   </p>
                  {activity.projectName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Project: {activity.projectName}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
          {hasMore && (
            <Button onClick={loadMoreActivities} disabled={isLoadingMore} className="w-full mt-4">
              {isLoadingMore ? 'Loading...' : 'Load More'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ActivityFeed;