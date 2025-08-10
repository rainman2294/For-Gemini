import React, { useState, useRef, useEffect } from 'react';
import { Plus, Upload, Link, X, Image as ImageIcon, Save, ArrowLeft, Palette, Tag, Users, Mail, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { MoodboardWorkspace } from '@/types/workspace';
import { useToast } from '@/hooks/use-toast';
import { mockApi } from '@/lib/mockApi';
import { Project } from '@/types/project';

interface MoodboardItem {
  id: string;
  type: 'image' | 'link';
  url: string;
  title?: string;
  description?: string;
  createdAt: string;
}

interface MoodboardFormProps {
  moodboard?: MoodboardWorkspace;
  onSubmit: (data: Partial<MoodboardWorkspace> & { items?: any[] }) => void; // Add items to onSubmit data
  onCancel: () => void;
  availableTags?: string[];
}

// Mock users for collaborator management
const mockUsers = [
  { id: 'user-1', name: 'John Smith', email: 'john@example.com', avatar: 'JS' },
  { id: 'user-2', name: 'Sarah Wilson', email: 'sarah@example.com', avatar: 'SW' },
  { id: 'user-3', name: 'Mike Chen', email: 'mike@example.com', avatar: 'MC' },
  { id: 'user-4', name: 'Emily Davis', email: 'emily@example.com', avatar: 'ED' },
];

export function MoodboardForm({ moodboard, onSubmit, onCancel, availableTags }: MoodboardFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Add state for projects
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Load projects when component mounts
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const projectsData = await mockApi.getProjects();
        setProjects(projectsData);
      } catch (error) {
        console.error("Failed to load projects:", error);
        toast({
          title: "Error",
          description: "Failed to load projects. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, [toast]);
  
  const [formData, setFormData] = useState({
    name: moodboard?.name || '',
    description: moodboard?.description || '',
    projectId: moodboard?.projectId || '',
    isPublic: moodboard?.settings?.isPublic || false,
    allowComments: moodboard?.settings?.allowComments || true,
    allowEditing: moodboard?.settings?.allowEditing || true,
  });
  
  const [selectedTags, setSelectedTags] = useState<string[]>(moodboard?.tags || []);
  const [collaborators, setCollaborators] = useState<string[]>(moodboard?.collaborators || ['current-user']);
  const [items, setItems] = useState<MoodboardItem[]>(() => {
    if (!moodboard) return [];
    
    const existingItems: MoodboardItem[] = [];
    
    // Add existing images
    if (moodboard.images) {
      moodboard.images.forEach(image => {
        existingItems.push({
          id: image.id,
          type: 'image',
          url: image.url,
          title: image.filename || 'Untitled Image',
          createdAt: new Date().toISOString(),
        });
      });
    }
    
    // Add existing links
    if (moodboard.links) {
      moodboard.links.forEach(link => {
        existingItems.push({
          id: link.id,
          type: 'link',
          url: link.url,
          title: link.title || link.url,
          createdAt: new Date().toISOString(),
        });
      });
    }
    
    return existingItems;
  });
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [customTag, setCustomTag] = useState('');

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags(prev => [...prev, customTag.trim()]);
      setCustomTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const handleAddCollaborator = () => {
    const existingUser = mockUsers.find(user => user.email === inviteEmail);
    
    if (existingUser && !collaborators.includes(existingUser.id)) {
      setCollaborators(prev => [...prev, existingUser.id]);
      setInviteEmail('');
      setShowInviteDialog(false);
      toast({ title: 'Collaborator Added', description: `${existingUser.name} has been added to the moodboard.` });
    } else if (!existingUser) {
      // Send invitation email (mock)
      console.log(`Sending invitation to ${inviteEmail}`);
      toast({ title: 'Invitation Sent', description: `An invitation has been sent to ${inviteEmail}.` });
      setInviteEmail('');
      setShowInviteDialog(false);
    } else {
      toast({ title: 'Already Added', description: 'This user is already a collaborator.', variant: 'destructive' });
    }
  };

  const handleRemoveCollaborator = (userId: string) => {
    if (userId === 'current-user') return; // Can't remove creator
    setCollaborators(prev => prev.filter(id => id !== userId));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newItem: MoodboardItem = {
          id: `item-${Date.now()}-${Math.random()}`,
          type: 'image',
          url: e.target?.result as string,
          title: file.name,
          createdAt: new Date().toISOString(),
        };
        setItems(prev => [...prev, newItem]);
      };
      reader.readAsDataURL(file);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddLink = () => {
    if (newLinkUrl.trim()) {
      const newItem: MoodboardItem = {
        id: `item-${Date.now()}`,
        type: 'link',
        url: newLinkUrl.trim(),
        title: newLinkTitle.trim() || newLinkUrl.trim(),
        createdAt: new Date().toISOString(),
      };
      setItems(prev => [...prev, newItem]);
      setNewLinkUrl('');
      setNewLinkTitle('');
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Please enter a moodboard name.', variant: 'destructive' });
      return;
    }

    const moodboardData = {
      ...formData,
      tags: selectedTags,
      collaborators,
      settings: {
        isPublic: formData.isPublic,
        allowComments: formData.allowComments,
        allowEditing: formData.allowEditing,
        autoSave: true
      },
      // In a real app, items would be saved separately
      items
    };

    onSubmit(moodboardData);
    toast({ 
      title: moodboard ? 'Moodboard Updated' : 'Moodboard Created', 
      description: `Your moodboard has been ${moodboard ? 'updated' : 'created'} successfully.` 
    });
  };

  const getUserById = (userId: string): { name: string; email: string; avatar: string } | undefined => {
    return mockUsers.find(user => user.id === userId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={onCancel} className="hover-shimmer cyrus-ui">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {moodboard ? 'Edit Moodboard' : 'Create New Moodboard'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {moodboard ? 'Update your moodboard details and content' : 'Set up your visual inspiration board'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel} className="hover-shimmer cyrus-ui">
                Cancel
              </Button>
              <Button type="submit" form="moodboard-form" className="button-primary-enhanced hover-shimmer cyrus-ui">
                <Save className="w-4 h-4 mr-2" />
                {moodboard ? 'Update Moodboard' : 'Create Moodboard'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-6xl mx-auto p-4">
        <form id="moodboard-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            
            {/* Left Column - Basic Info */}
            <div className="xl:col-span-4 space-y-4">
              <Card className="glass-card border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Palette className="h-5 w-5 text-primary" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">Moodboard Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Brand Identity Exploration"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="hover-shimmer cyrus-ui"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the purpose and direction of this moodboard..."
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="hover-shimmer cyrus-ui resize-none min-h-20"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project" className="text-sm font-medium">Project</Label>
                    <Select
                      value={formData.projectId}
                      onValueChange={(value) => handleInputChange('projectId', value)}
                    >
                      <SelectTrigger className="hover-shimmer cyrus-ui">
                        <SelectValue placeholder="Select a project (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {loading ? (
                          <div className="p-2 text-center text-muted-foreground">Loading projects...</div>
                        ) : projects.length > 0 ? (
                          projects.map(project => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name} - {project.client || 'No Client'}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-center text-muted-foreground">No projects available</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Settings */}
                  <div className="space-y-3 pt-2">
                    <Label className="text-sm font-medium">Settings</Label>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isPublic"
                          checked={formData.isPublic}
                          onCheckedChange={(checked) => handleInputChange('isPublic', checked as boolean)}
                        />
                        <Label htmlFor="isPublic" className="text-sm">Public moodboard</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="allowComments"
                          checked={formData.allowComments}
                          onCheckedChange={(checked) => handleInputChange('allowComments', checked as boolean)}
                        />
                        <Label htmlFor="allowComments" className="text-sm">Allow comments</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="allowEditing"
                          checked={formData.allowEditing}
                          onCheckedChange={(checked) => handleInputChange('allowEditing', checked as boolean)}
                        />
                        <Label htmlFor="allowEditing" className="text-sm">Allow collaborative editing</Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Middle Column - Tags and Content */}
            <div className="xl:col-span-5 space-y-6">
              {/* Tags */}
              <Card className="glass-card border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Tag className="w-5 h-5 text-primary" />
                    Tags & Categories
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Available Tags */}
                  {availableTags && availableTags.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Available Tags</Label>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map(tag => (
                          <Badge
                            key={tag}
                            variant={selectedTags.includes(tag) ? "default" : "outline"}
                            className="cursor-pointer hover-shimmer cyrus-ui transition-all"
                            onClick={() => handleTagToggle(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Tag Input */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Add Custom Tag</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter tag name"
                        value={customTag}
                        onChange={(e) => setCustomTag(e.target.value)}
                        className="hover-shimmer cyrus-ui"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomTag();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={handleAddCustomTag}
                        size="sm"
                        className="hover-shimmer cyrus-ui"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Selected Tags */}
                  {selectedTags.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Selected Tags</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedTags.map(tag => (
                          <Badge key={tag} variant="secondary" className="hover-shimmer cyrus-ui">
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Content Upload */}
              <Card className="glass-card border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    Content ({items.length} items)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Upload Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="hover-shimmer cyrus-ui"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Images
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (newLinkUrl.trim()) {
                          handleAddLink();
                        }
                      }}
                      className="hover-shimmer cyrus-ui"
                    >
                      <Link className="w-4 h-4 mr-2" />
                      Add Link
                    </Button>
                  </div>

                  {/* Link Input */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-2">
                      <Input
                        placeholder="Link URL..."
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        className="hover-shimmer cyrus-ui"
                      />
                      <Input
                        placeholder="Link title (optional)"
                        value={newLinkTitle}
                        onChange={(e) => setNewLinkTitle(e.target.value)}
                        className="hover-shimmer cyrus-ui"
                      />
                    </div>
                  </div>

                  {/* Content Grid */}
                  {items.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {items.map(item => (
                        <div key={item.id} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border glass-card">
                            {item.type === 'image' ? (
                              <img
                                src={item.url}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                <Link className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 p-0"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                          <p className="text-xs text-center mt-1 truncate">{item.title}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Collaborators */}
            <div className="xl:col-span-3 space-y-6">
              <Card className="glass-card border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Collaborators ({collaborators.length})
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowInviteDialog(true)}
                      className="hover-shimmer cyrus-ui"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {collaborators.map(userId => {
                    const user = getUserById(userId);
                    const isCreator = userId === 'current-user';
                    
                    return (
                      <div key={userId} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {user?.avatar || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{user?.name || 'Current User'}</p>
                            <p className="text-xs text-muted-foreground">{user?.email || 'current@example.com'}</p>
                          </div>
                        </div>
                        {!isCreator && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCollaborator(userId)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        multiple
        className="hidden"
      />

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="glass-card max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Invite Collaborator
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="hover-shimmer cyrus-ui"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowInviteDialog(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleAddCollaborator} className="hover-shimmer cyrus-ui">
                Send Invite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}