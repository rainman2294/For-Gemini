import React, { useState, useRef, useMemo } from 'react';
import { ArrowLeft, Pin, Edit2, Palette, Calendar, User, Link as LinkIcon, Image as ImageIcon, Plus, MessageCircle, Trash2, Download, X, ChevronLeft, ChevronRight, Copy, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import { MoodboardWorkspace, Image, Link, Comment } from '@/types/workspace';
import { LightboxModal } from '../LightboxModal';
import { useToast } from '@/hooks/use-toast';

interface MoodboardDetailProps {
  moodboard: MoodboardWorkspace;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  getUserById: (userId: string) => { id: string; name: string; email?: string; avatar: string };
  onMoodboardUpdate: (moodboard: MoodboardWorkspace) => void;
}

export function MoodboardDetail({ moodboard, onBack, onEdit, onDelete, getUserById, onMoodboardUpdate }: MoodboardDetailProps) {
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [showAddImage, setShowAddImage] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const creator = getUserById(moodboard.createdBy);
  
  // Computed values
  const imageCount = moodboard.images?.length || 0;
  const linkCount = moodboard.links?.length || 0;
  const commentCount = moodboard.comments?.length || 0;

  const handleAddLink = () => {
    if (!newLink.url) {
      toast({
        title: "Missing URL",
        description: "Please enter a URL for the link",
        variant: "destructive",
      });
      return;
    }

    const link: Link = {
      id: `link-${Date.now()}`,
      type: 'link',
      url: newLink.url,
      title: newLink.title || newLink.url,
    };

    const updatedMoodboard = {
      ...moodboard,
      links: [...(moodboard.links || []), link]
    };

    onMoodboardUpdate(updatedMoodboard);
    setNewLink({ title: '', url: '' });
    setShowAddLink(false);
    
    toast({
      description: "Link added successfully",
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let imageUrl: string;
      let imageId: string;

      // Check if we're in WordPress environment
      const apiConfig = typeof window !== 'undefined' && 'pulse2' in window 
        ? window.pulse2 
        : null;

      if (apiConfig) {
        // Use WordPress media upload with proper error handling
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(apiConfig.mediaUrl, {
          method: 'POST',
          headers: { 'X-WP-Nonce': apiConfig.nonce },
          body: formData,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Upload response:', errorText);
          throw new Error(`Failed to upload media: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        imageUrl = data.source_url;
        imageId = data.id.toString();
      } else {
        // For development, create object URL
        imageUrl = URL.createObjectURL(file);
        imageId = `image-${Date.now()}`;
      }

      const newImage: Image = {
        id: imageId,
        type: 'image',
        url: imageUrl,
        filename: file.name,
      };

      const updatedMoodboard = {
        ...moodboard,
        images: [...(moodboard.images || []), newImage]
      };

      // Save to backend first
      try {
        if (apiConfig) {
          const saveResponse = await fetch(`${apiConfig.apiUrl}/workspaces/${moodboard.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-WP-Nonce': apiConfig.nonce,
            },
            body: JSON.stringify(updatedMoodboard),
          });

          if (!saveResponse.ok) {
            throw new Error('Failed to save moodboard');
          }
        }
      } catch (saveError) {
        console.error('Failed to save to backend:', saveError);
        // Continue with local update even if backend save fails
      }

      // Update local state
      onMoodboardUpdate(updatedMoodboard);
      setShowAddImage(false);
      
      toast({
        description: "Image added successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageClick = (image: Image, index: number) => {
    setSelectedImage(image);
    setSelectedImageIndex(index);
    setShowLightbox(true);
  };

  const handlePreviousImage = () => {
    if (!moodboard.images || moodboard.images.length === 0) return;
    const newIndex = selectedImageIndex > 0 ? selectedImageIndex - 1 : moodboard.images.length - 1;
    setSelectedImageIndex(newIndex);
    setSelectedImage(moodboard.images[newIndex]);
  };

  const handleNextImage = () => {
    if (!moodboard.images || moodboard.images.length === 0) return;
    const newIndex = selectedImageIndex < moodboard.images.length - 1 ? selectedImageIndex + 1 : 0;
    setSelectedImageIndex(newIndex);
    setSelectedImage(moodboard.images[newIndex]);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const currentUser = getUserById('current-user');
    const userId = localStorage.getItem('userId') || currentUser.id;
    
    const comment: Comment = {
      id: `comment-${Date.now()}`,
      text: newComment,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };

    const updatedMoodboard = {
      ...moodboard,
      comments: [...(moodboard.comments || []), comment]
    };

    onMoodboardUpdate(updatedMoodboard);
    setNewComment('');
    
    toast({
      description: "Comment added successfully",
    });
  };

  const handleDeleteImage = (imageId: string) => {
    const updatedMoodboard = {
      ...moodboard,
      images: (moodboard.images || []).filter(img => img.id !== imageId)
    };

    onMoodboardUpdate(updatedMoodboard);
    
    toast({
      description: "Image removed successfully",
    });
  };

  const handleDeleteLink = (linkId: string) => {
    const updatedMoodboard = {
      ...moodboard,
      links: (moodboard.links || []).filter(link => link.id !== linkId)
    };

    onMoodboardUpdate(updatedMoodboard);
    
    toast({
      description: "Link removed successfully",
    });
  };

  const handleEditComment = (commentId: string, newText: string) => {
    const updatedMoodboard = {
      ...moodboard,
      comments: (moodboard.comments || []).map(comment => 
        comment.id === commentId ? { ...comment, text: newText, updatedAt: new Date().toISOString() } : comment
      )
    };

    onMoodboardUpdate(updatedMoodboard);
    setEditingComment(null);
    setEditingCommentText('');
    
    toast({
      description: "Comment updated successfully",
    });
  };

  const handleDeleteComment = (commentId: string) => {
    const updatedMoodboard = {
      ...moodboard,
      comments: (moodboard.comments || []).filter(comment => comment.id !== commentId)
    };

    onMoodboardUpdate(updatedMoodboard);
    
    toast({
      description: "Comment deleted successfully",
    });
  };

  const handleDownloadImage = (image: Image) => {
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.filename || 'image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Type guard function to differentiate between Image and Link
  function isImage(item: Image | Link): item is Image {
    return (item as Image).type === 'image';
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{moodboard.name}</h1>
              {moodboard.tags && moodboard.tags.length > 0 && (
                <div className="flex gap-1">
                  {moodboard.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                <span>{creator.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" />
                <span>{imageCount} {imageCount === 1 ? 'image' : 'images'}</span>
              </div>
              <div className="flex items-center gap-1">
                <LinkIcon className="h-3.5 w-3.5" />
                <span>{linkCount} {linkCount === 1 ? 'link' : 'links'}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{commentCount} {commentCount === 1 ? 'comment' : 'comments'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(moodboard.createdAt, 'MMMM d, yyyy')}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Moodboard
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setShowAddImage(true)}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Add Image
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddLink(true)}
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            Add Link
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main content in two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Images and Links */}
        <div className="lg:col-span-2">
          {/* Images Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">Images ({imageCount})</h2>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
            
            {moodboard.images && moodboard.images.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {moodboard.images.map((image, index) => (
                  <Card key={image.id} className="overflow-hidden group relative">
                    <div 
                      className="aspect-video cursor-pointer overflow-hidden"
                      onClick={() => handleImageClick(image, index)}
                    >
                      <img 
                        src={image.url} 
                        alt={`Image ${index + 1}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-1">
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadImage(image);
                          }}
                        >
                          <Download className="h-4 w-4 text-white" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="destructive" 
                          className="h-8 w-8 rounded-full bg-black/50 hover:bg-destructive/90"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteImage(image.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Images Yet</h3>
                <p className="text-gray-500 mb-4">
                  Upload images to start building your moodboard
                </p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Images
                </Button>
              </div>
            )}
          </div>

          {/* Links Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">Links ({linkCount})</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAddLink(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </div>
            
            {moodboard.links && moodboard.links.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {moodboard.links.map((link) => (
                  <Card key={link.id} className="group relative">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-muted rounded-md p-2">
                          <LinkIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium mb-1 truncate">{link.title}</h3>
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline truncate block"
                          >
                            {link.url}
                          </a>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          size="icon" 
                          variant="destructive" 
                          className="h-8 w-8 rounded-full"
                          onClick={() => handleDeleteLink(link.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                <LinkIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Links Yet</h3>
                <p className="text-muted-foreground mb-4">Add links to resources and inspiration</p>
                <Button 
                  variant="outline"
                  onClick={() => setShowAddLink(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Link
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right column - Comments */}
        <div className="lg:col-span-1">
          {moodboard.settings?.allowComments !== false && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Comments ({commentCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add new comment */}
                <div className="space-y-3">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-20"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    size="sm"
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Add Comment
                  </Button>
                </div>

                {/* Comments list */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {moodboard.comments && moodboard.comments.length > 0 ? (
                    moodboard.comments.map((comment) => (
                      <div key={comment.id} className="p-3 bg-muted/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                              {getUserById(comment.createdBy).name.charAt(0)}
                            </div>
                            <span className="text-sm font-medium">{getUserById(comment.createdBy).name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm">{comment.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No comments yet. Be the first to comment!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Custom Image Viewer with Navigation */}
      {showLightbox && selectedImage && moodboard.images && moodboard.images.length > 0 && (
        <Dialog open={showLightbox} onOpenChange={setShowLightbox}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="relative flex items-center justify-center min-h-[70vh] bg-background/95">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 z-10 bg-background/80 hover:bg-background"
                onClick={e => { e.stopPropagation(); setShowLightbox(false); }}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Navigation Buttons */}
              {moodboard.images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background"
                    onClick={e => { e.stopPropagation(); handlePreviousImage(); }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background"
                    onClick={e => { e.stopPropagation(); handleNextImage(); }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}

              {/* Main Image */}
              <div className="flex items-center justify-center w-full h-full p-8">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.filename || `Image ${selectedImageIndex + 1}`}
                  className="max-w-full max-h-[85vh] object-contain"
                />
              </div>

              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-4 flex justify-between items-center">
                <div className="flex gap-2 items-center">
                  <Badge variant="outline" className="bg-background/50">
                    {selectedImageIndex + 1} / {moodboard.images.length}
                  </Badge>
                  {moodboard.tags && moodboard.tags.length > 0 && (
                    <div className="flex gap-1">
                      {moodboard.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {selectedImage.filename && (
                    <Badge variant="outline" className="text-xs">
                      {selectedImage.filename}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedImage.url);
                      toast({
                        title: "Link copied!",
                        description: "The image URL has been copied to your clipboard.",
                      });
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy URL
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadImage(selectedImage)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      handleDeleteImage(selectedImage.id);
                      if (moodboard.images && moodboard.images.length === 1) {
                        setShowLightbox(false);
                      } else if (moodboard.images && moodboard.images.length > 1) {
                        // Adjust index if needed
                        const newIndex = selectedImageIndex >= moodboard.images.length - 1 ? 0 : selectedImageIndex;
                        setSelectedImageIndex(newIndex);
                        setSelectedImage(moodboard.images[newIndex]);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Link Dialog */}
      <Dialog open={showAddLink} onOpenChange={setShowAddLink}>
        <DialogContent>
          <DialogTitle>Add Link</DialogTitle>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label htmlFor="linkTitle" className="text-sm font-medium">Title</label>
              <Input
                id="linkTitle"
                placeholder="Enter link title"
                value={newLink.title}
                onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="linkUrl" className="text-sm font-medium">URL</label>
              <Input
                id="linkUrl"
                placeholder="https://"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddLink(false);
                  setNewLink({ title: '', url: '' });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddLink}>
                Add Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Add Image Dialog */}
      <Dialog open={showAddImage} onOpenChange={setShowAddImage}>
        <DialogContent>
          <DialogTitle>Add Image</DialogTitle>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload Image</label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                  id="image-upload-dialog"
                />
                <label 
                  htmlFor="image-upload-dialog"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="font-medium mb-1">Click to upload</p>
                  <p className="text-sm text-muted-foreground">
                    SVG, PNG, JPG or GIF (max 10MB)
                  </p>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddImage(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}