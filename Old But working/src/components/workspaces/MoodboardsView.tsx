import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Palette, Users, Calendar, Search, Filter, Trash2, MoreVertical, Tag, MessageCircle, Download, X, Mail, ArrowLeft, User, ImageIcon, Eye } from 'lucide-react';
import { Link as LinkIcon } from 'lucide-react'; // Import Link as LinkIcon to avoid conflict
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { cn, formatDate } from '@/lib/utils';
import { MoodboardWorkspace, Image, Link, Comment, MoodboardItem } from '@/types/workspace';
import { Project } from '@/types/project';
import { MoodboardForm } from './MoodboardForm';
import { MoodboardDetail } from './MoodboardDetail';
import { workspaceService } from '@/services/workspaceService';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { mockApi } from '@/lib/mockApi';

// Define the interface for form item data
interface FormItem {
  url: string;
  title?: string;
  type: 'image' | 'link';
}

// Define the interface for form data
interface MoodboardFormData {
  name: string;
  description?: string;
  tags?: string[];
  projectId?: string;
  isPublic?: boolean;
  items?: FormItem[];
}

interface MoodboardsViewProps {
  className?: string;
  projects?: Project[];
  onEnterFocusMode?: () => void;
  onExitFocusMode?: () => void;
}

// Mock users for collaborator management
const mockUsers = [
  { id: 'user-1', name: 'John Smith', email: 'john@example.com', avatar: 'JS' },
  { id: 'user-2', name: 'Sarah Wilson', email: 'sarah@example.com', avatar: 'SW' },
  { id: 'user-3', name: 'Mike Chen', email: 'mike@example.com', avatar: 'MC' },
  { id: 'user-4', name: 'Emily Davis', email: 'emily@example.com', avatar: 'ED' },
];

// Available tags for moodboards
const availableTags = [
  'Brand Identity', 'Color Palette', 'Typography', 'Photography', 'Illustration',
  'UI/UX', 'Product Design', 'Marketing', 'Campaign', 'Concept', 'Inspiration'
];

export function MoodboardsView({ className, projects = [], onEnterFocusMode, onExitFocusMode }: MoodboardsViewProps) {
  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'create' | 'edit' | 'create-project-based'>('list');
  const [moodboards, setMoodboards] = useState<MoodboardWorkspace[]>([]);
  const [selectedMoodboard, setSelectedMoodboard] = useState<MoodboardWorkspace | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const { toast } = useToast();
  const { workspaces, isLoading: wsLoading, error: wsError, createWorkspaceForProject, invalidate } = useWorkspaces();

  useEffect(() => {
    if (wsError) {
      console.error('Failed to load workspaces:', wsError);
      toast({ title: 'Error', description: 'Failed to load moodboards', variant: 'destructive' });
    }
  }, [wsError, toast]);

  useEffect(() => {
    const moodboardData = (workspaces || []).filter(ws => ws.type === 'moodboard') as MoodboardWorkspace[];
    setMoodboards(moodboardData);
  }, [workspaces]);

  // Filter moodboards based on search query and filter
  const filteredMoodboards = useMemo(() => {
    return moodboards
      .filter(moodboard => {
        // Search filter
        const matchesSearch = moodboard.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          moodboard.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          moodboard.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        
        // Status filter
        if (selectedFilter === 'archived') return moodboard.isArchived && matchesSearch;
        if (selectedFilter === 'active') return !moodboard.isArchived && matchesSearch;
        
        // All
        return matchesSearch;
      });
  }, [moodboards, searchQuery, selectedFilter]);

  const handleUpdateMoodboard = (updatedMoodboard: MoodboardWorkspace) => {
    setMoodboards(prev => 
      prev.map(m => m.id === updatedMoodboard.id ? updatedMoodboard : m)
    );
    setSelectedMoodboard(updatedMoodboard);
    setCurrentView('detail');
    onEnterFocusMode?.();
  };

  const getUserById = (userId: string) => {
    // First try to get from JWT token
    const currentUserId = localStorage.getItem('userId');
    const currentUserName = localStorage.getItem('userDisplayName');
    
    if (userId === currentUserId || userId === 'current-user') {
      return {
        id: currentUserId || userId,
        name: currentUserName || 'Current User',
        email: 'current@example.com',
        avatar: currentUserName?.charAt(0) || 'CU'
      };
    }
    
    // Then try from mock users
    const user = mockUsers.find(user => user.id === userId);
    return user || { id: userId, name: 'Unknown User', email: '', avatar: 'UN' };
  };

  const handleCreateMoodboard = () => {
    setSelectedMoodboard(null);
    setCurrentView('create');
  };

  const handleEditMoodboard = (moodboard: MoodboardWorkspace) => {
    setSelectedMoodboard(moodboard);
    setCurrentView('edit');
  };

  const handleViewMoodboard = (moodboard: MoodboardWorkspace) => {
    setSelectedMoodboard(moodboard);
    setCurrentView('detail');
    // Enter focus mode when viewing moodboard details
    onEnterFocusMode?.();
  };

  const handleDeleteMoodboard = async (moodboardId: string) => {
    try {
      await workspaceService.deleteWorkspace(moodboardId);
      await invalidate();
      toast({ description: 'Moodboard deleted successfully' });
      setCurrentView('list');
      onExitFocusMode?.();
    } catch (error) {
      console.error('Failed to delete moodboard:', error);
      toast({ title: 'Error', description: 'Failed to delete moodboard', variant: 'destructive' });
    }
  };

  const handleRemoveCollaborator = (moodboardId: string, userId: string) => {
    const updatedMoodboards = moodboards.map(moodboard => {
      if (moodboard.id === moodboardId) {
        return {
          ...moodboard,
          collaborators: moodboard.collaborators.filter(id => id !== userId)
        };
      }
      return moodboard;
    });
    setMoodboards(updatedMoodboards);
  };

  const handleInviteCollaborator = (moodboardId: string) => {
    // Implementation would go here
    toast({
      title: "Invitation sent",
      description: "Collaborator will be notified by email",
    });
  };

  const handleBackToList = () => {
    setSelectedMoodboard(null);
    setCurrentView('list');
    // Exit focus mode when returning to list
    onExitFocusMode?.();
  };

  const handleProjectSelect = async (project: Project) => {
    try {
      setLoading(true);
      const result = await createWorkspaceForProject({ projectId: project.id, type: 'moodboard' });
      toast({ title: result.isNew ? 'Moodboard created' : 'Existing moodboard found', description: result.message });
      await invalidate();
      handleViewMoodboard(result.workspace as MoodboardWorkspace);
    } catch (error) {
      console.error('Failed to create moodboard:', error);
      toast({ title: 'Error', description: 'Failed to create moodboard', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleMoodboardSubmit = (data: MoodboardFormData) => {
    // Get current user info
    const userId = localStorage.getItem('userId') || 'current-user';
    const userDisplayName = localStorage.getItem('userDisplayName') || 'Current User';
    
    if (currentView === 'edit' && selectedMoodboard) {
      // Extract images and links from items
      const images: Image[] = [];
      const links: Link[] = [];
      
      if (data.items) {
        data.items.forEach(item => {
          if (item.type === 'image') {
            images.push({
              id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'image',
              url: item.url,
              filename: item.url.split('/').pop() || 'image'
            });
          } else {
            links.push({
              id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'link',
              url: item.url,
              title: item.title || item.url
            });
          }
        });
      }

      // Update moodboard
      const updatedMoodboard: MoodboardWorkspace = {
        ...selectedMoodboard,
        name: data.name,
        description: data.description || selectedMoodboard.description,
        projectId: data.projectId || selectedMoodboard.projectId,
        tags: data.tags || selectedMoodboard.tags,
        updatedAt: new Date().toISOString(),
        settings: {
          ...selectedMoodboard.settings,
          isPublic: data.isPublic !== undefined ? data.isPublic : selectedMoodboard.settings.isPublic
        },
        images: [...(selectedMoodboard.images || []), ...images],
        links: [...(selectedMoodboard.links || []), ...links]
      };

      handleUpdateMoodboard(updatedMoodboard);
      toast({
        description: "Moodboard updated successfully",
      });
    } else {
      // Extract images and links from items
      const images: Image[] = [];
      const links: Link[] = [];
      
      if (data.items) {
        data.items.forEach(item => {
          if (item.type === 'image') {
            images.push({
              id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'image',
              url: item.url,
              filename: item.url.split('/').pop() || 'image'
            });
          } else {
            links.push({
              id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'link',
              url: item.url,
              title: item.title || item.url
            });
          }
        });
      }

      // Create new moodboard
      const newMoodboard: MoodboardWorkspace = {
        id: `moodboard-${Date.now()}`,
        projectId: data.projectId || '',
        name: data.name,
        type: 'moodboard',
        description: data.description || '',
        tags: data.tags || [],
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isArchived: false,
        collaborators: [userId],
        settings: {
          isPublic: data.isPublic || false,
          allowComments: true,
          allowEditing: true,
          autoSave: true
        },
        images,
        links,
        comments: []
      };

      setMoodboards(prev => [...prev, newMoodboard]);
      workspaceService.workspaces.push(newMoodboard);
      
      setSelectedMoodboard(newMoodboard);
      setCurrentView('detail');
      onEnterFocusMode?.();
      
      toast({
        description: "New moodboard created successfully",
      });
    }
  };

  // Different views based on current state
  if (currentView === 'detail' && selectedMoodboard) {
    return (
      <MoodboardDetail 
        moodboard={selectedMoodboard}
        onBack={handleBackToList}
        onEdit={() => handleEditMoodboard(selectedMoodboard)}
        onDelete={() => handleDeleteMoodboard(selectedMoodboard.id)}
        getUserById={getUserById}
        onMoodboardUpdate={handleUpdateMoodboard}
      />
    );
  }

  if (currentView === 'create') {
    return (
      <div className={cn("p-6", className)}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentView('list')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Create Moodboard</h2>
              <p className="text-muted-foreground">
                Choose how you want to create your moodboard
              </p>
            </div>
          </div>

          {/* Creation Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {/* Standalone Moodboard */}
            <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] border-l-4 border-l-purple-500">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-purple-100 rounded-full">
                    <Palette className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                <CardTitle className="text-xl">Standalone Moodboard</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Create a new moodboard from scratch without linking to a specific project
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground">Features:</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Custom name and description</li>
                      <li>• Add images and links manually</li>
                      <li>• Collaborative editing</li>
                      <li>• Share with team members</li>
                    </ul>
                  </div>
                  <Button 
                    className="w-full button-primary-enhanced hover-shimmer cyrus-ui" 
                    onClick={() => {
                      // Create standalone moodboard
                      const userId = localStorage.getItem('userId') || 'current-user';
                      const userDisplayName = localStorage.getItem('userDisplayName') || 'Current User';
                      
                      const newMoodboard: MoodboardWorkspace = {
                        id: `moodboard-${Date.now()}`,
                        projectId: '', // No project association
                        name: 'New Moodboard',
                        type: 'moodboard',
                        description: '',
                        tags: [],
                        createdBy: userId,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        isArchived: false,
                        collaborators: [userId],
                        settings: {
                          isPublic: false,
                          allowComments: true,
                          allowEditing: true,
                          autoSave: true
                        },
                        images: [],
                        links: [],
                        comments: []
                      };

                      setMoodboards(prev => [...prev, newMoodboard]);
                      workspaceService.workspaces.push(newMoodboard);
                      
                      setSelectedMoodboard(newMoodboard);
                      setCurrentView('edit'); // Go directly to edit mode
                      
                      toast({
                        description: "New moodboard created successfully",
                      });
                    }}
                  >
                    Create Standalone
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Project-Based Moodboard */}
            <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] border-l-4 border-l-blue-500">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-blue-100 rounded-full">
                    <Plus className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <CardTitle className="text-xl">Project-Based Moodboard</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Create a moodboard linked to an existing project with its media and links
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground">Features:</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Auto-populated with project media</li>
                      <li>• Synced with project updates</li>
                      <li>• Project team collaboration</li>
                      <li>• Client presentation ready</li>
                    </ul>
                  </div>
                  <Button 
                    className="w-full button-primary-enhanced hover-shimmer cyrus-ui"
                    onClick={() => setCurrentView('create-project-based')}
                  >
                    Select Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'create-project-based') {
    return (
      <div className={cn("p-6", className)}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentView('create')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Select Project</h2>
              <p className="text-muted-foreground">
                Choose a project to create a moodboard from
              </p>
            </div>
          </div>

          {/* Project Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card 
                key={project.id}
                className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] border-l-4"
                style={{ borderLeftColor: project.status === 'delivered' ? '#10b981' : '#3b82f6' }}
                onClick={() => handleProjectSelect(project)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{project.client}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="outline">{project.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Created</span>
                      <span>{formatDate(project.createdAt)}</span>
                    </div>
                    <div className="pt-2">
                      <Button className="w-full button-primary-enhanced hover-shimmer cyrus-ui" size="sm">
                        Create Moodboard
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {projects.length === 0 && !loading && (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-gray-400 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Available</h3>
              <p className="text-gray-500">
                Create a project first to set up a moodboard
              </p>
            </div>
          )}
          
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentView === 'edit' && selectedMoodboard) {
    return (
      <MoodboardForm
        moodboard={selectedMoodboard}
        onSubmit={handleMoodboardSubmit}
        onCancel={handleBackToList}
        availableTags={availableTags}
      />
    );
  }

  // List view - default
  return (
    <div className={cn("p-6", className)}>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Moodboards</h2>
          <p className="text-muted-foreground">
            Create and organize visual inspiration for your projects
          </p>
        </div>
        <Button onClick={handleCreateMoodboard} className="button-primary-enhanced hover-shimmer cyrus-ui">
          <Plus className="h-4 w-4 mr-2" />
          New Moodboard
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search moodboards..."
            className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        <div className="md:col-span-1">
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Moodboards</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {wsLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading moodboards...</p>
        </div>
      ) : (
        <>
          {/* Moodboards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMoodboards.map((moodboard) => {
              // Find associated project
              const project = projects.find(p => p.id === moodboard.projectId);
              const projectName = project ? project.name : "Unknown Project";
              const projectClient = project ? project.client : "";
              
              // Get user info for the creator
          const creator = getUserById(moodboard.createdBy);
              
              // Count images and links
              const imageCount = moodboard.images?.length || 0;
              const linkCount = moodboard.links?.length || 0;
              const commentCount = moodboard.comments?.length || 0;
              
              return (
                <Card 
                  key={moodboard.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] overflow-hidden" 
                  onClick={() => handleViewMoodboard(moodboard)}
                >
                  {/* Preview Images */}
                  <div className="h-48 grid grid-cols-2 gap-1 bg-gray-100 overflow-hidden">
                    {/* Image gallery layout */}
                    {renderImageLayout()}
                  </div>
                  
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{moodboard.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            <span>{creator.name}</span>
                  </div>
                          <span>•</span>
                          <span>{formatDate(moodboard.createdAt, 'MMM d, yyyy')}</span>
                          {project && (
                            <>
                              <span>•</span>
                              <span>{project.name}</span>
                            </>
                          )}
                  </div>
                </div>
                      <Palette className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <ImageIcon className="h-3.5 w-3.5" />
                          <span>{imageCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <LinkIcon className="h-3.5 w-3.5" />
                          <span>{linkCount}</span>
                </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>{commentCount}</span>
                </div>
                      </div>
                    </div>
                    
                    {/* Tags */}
                    {moodboard.tags && moodboard.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                        {moodboard.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {moodboard.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{moodboard.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                
                    {/* Action Button */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewMoodboard(moodboard);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Moodboard
                    </Button>
                  </CardContent>
                  
                  <CardFooter className="pt-0">
                    <div className="flex justify-between w-full items-center">
                    {/* Stats */}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Palette className="h-3.5 w-3.5" />
                          <span>{imageCount}</span>
                        </div>
                      <div className="flex items-center gap-1">
                          <LinkIcon className="h-3.5 w-3.5" />
                          <span>{linkCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(moodboard.updatedAt)}</span>
                        </div>
                      </div>
                      
                      {/* Creator */}
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            {creator.avatar}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              );
              
              function renderImageLayout() {
                // Display images if available
                if (moodboard.images && moodboard.images.length > 0) {
                  if (moodboard.images.length === 1) {
                    // Single image takes full width
                    return (
                      <div className="col-span-2 h-full">
                        <img 
                          src={moodboard.images[0].url} 
                          alt="Moodboard preview" 
                          className="h-full w-full object-cover"
                        />
                      </div>
                    );
                  } else if (moodboard.images.length === 2) {
                    // Two images side by side
                    return (
                      <>
                        <div className="h-full">
                          <img 
                            src={moodboard.images[0].url} 
                            alt="Moodboard preview" 
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="h-full">
                          <img 
                            src={moodboard.images[1].url} 
                            alt="Moodboard preview" 
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </>
                    );
                  } else {
                    // Grid layout for 3+ images
                    return (
                      <>
                        <div className="h-full col-span-1">
                          <img 
                            src={moodboard.images[0].url} 
                            alt="Moodboard preview" 
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="grid grid-rows-2 gap-1 h-full col-span-1">
                          <div>
                            <img 
                              src={moodboard.images[1].url} 
                              alt="Moodboard preview" 
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="relative">
                            <img 
                              src={moodboard.images[2].url} 
                              alt="Moodboard preview" 
                              className="h-full w-full object-cover"
                            />
                            {moodboard.images.length > 3 && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-medium">
                                +{moodboard.images.length - 3}
                              </div>
                            )}
                  </div>
                </div>
                      </>
                    );
                  }
                } else {
                  // Placeholder when no images
                  return (
                    <div className="col-span-2 h-full flex items-center justify-center bg-gray-100">
                      <Palette className="h-12 w-12 text-gray-300" />
                    </div>
                  );
                }
              }
        })}
      </div>

          {/* Empty State */}
          {filteredMoodboards.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <Palette className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Moodboards Found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery 
                  ? "No moodboards match your search. Try different keywords."
                  : "Create your first moodboard to start organizing visual inspiration."}
              </p>
              <Button onClick={handleCreateMoodboard}>
                <Plus className="h-4 w-4 mr-2" />
                Create Moodboard
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
