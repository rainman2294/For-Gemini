import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Plus, Upload, FolderPlus, Pin, MessageCircle, Eye, Check, X, Edit2, Trash2, Image as ImageIcon, PenTool, Calendar, User, ZoomIn, ZoomOut, RotateCcw, MoreVertical, ChevronUp, ChevronDown, Download, Move, Maximize2, ChevronRight, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, formatDate } from '@/lib/utils';
import { activityService } from '@/services/activityService';
import { useNotes } from '@/hooks/useNotes';
import { Note } from '@/types/project';
import { mockApi } from '@/lib/mockApi';
import { workspaceService } from '@/services/workspaceService';
import { BaseWorkspace } from '@/types/workspace';
import { useToast } from '@/components/ui/use-toast';

// Notes Input Form Component (replacing comments)
interface NotesInputFormProps {
  onSubmit: (noteText: string) => void;
}

const NotesInputForm: React.FC<NotesInputFormProps> = ({ onSubmit }) => {
  const [noteText, setNoteText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (noteText.trim()) {
      onSubmit(noteText);
      setNoteText('');
    }
  };

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            placeholder="Add a note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="resize-none min-h-[80px] hover-shimmer cyrus-ui"
          />
          <div className="flex justify-end">
            <Button 
              type="submit" 
              size="sm" 
              disabled={!noteText.trim()}
              className="hover-shimmer cyrus-ui"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Enhanced types for the improved whiteboard
interface Pin {
  id: string;
  x: number;
  y: number;
  note: string;
  createdBy: string;
  createdAt: string;
  isResolved: boolean;
  replies?: Comment[];
}

interface Comment {
  id: string;
  pinId?: string;
  text: string;
  createdBy: string;
  createdAt: string;
  userAvatar?: string;
  replies?: Comment[];
}

interface ImageAnnotation {
  id: string;
  url: string;
  filename: string;
  categoryId: string;
  label?: string;
  pins: Pin[];
  comments: Comment[];
  uploadedBy: string;
  uploadedAt: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  images: ImageAnnotation[];
  isMinimized: boolean;
}

// Update the WhiteboardDetailProps interface to match our new structure
interface WhiteboardDetailProps {
  whiteboard: {
    id: string;
    name: string;
    projectId: string;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    collaborators?: string[];
    categories?: Category[]; // Add categories to support our enhanced structure
    settings?: {
      isPublic?: boolean;
      allowComments?: boolean;
      allowEditing?: boolean;
    };
  };
  onBack: () => void;
  onPin?: () => void;
  isPinned?: boolean;
}

const WhiteboardDetail: React.FC<WhiteboardDetailProps> = ({ whiteboard, onBack, onPin, isPinned }) => {
  const { toast } = useToast();
  
  // Use notes system instead of comments
  const { 
    notes, 
    noteInput, 
    setNoteInput, 
    handleAddNote, 
    handleEditNote,
    handleReply,
    replyTo,
    setReplyTo,
    replyInput,
    setReplyInput,
    editingNoteId,
    setEditingNoteId,
    editInput,
    setEditInput
  } = useNotes(whiteboard.projectId);
  
  // State management
  const [categories, setCategories] = useState<Category[]>([]);
  const [projectImages, setProjectImages] = useState<any[]>([]);
  
  console.log('🖼️ WhiteboardDetail initialized with:', {
    whiteboardId: whiteboard.id,
    projectId: whiteboard.projectId,
    hasProjectId: !!whiteboard.projectId
  });
  
  // Debug window.pulse2 config
  console.log('🖼️ Window pulse2 config:', typeof window !== 'undefined' ? window.pulse2 : 'No window');
  
  // Debug localStorage
  console.log('🖼️ JWT Token present:', typeof window !== 'undefined' && localStorage.getItem('jwtToken') ? 'Yes' : 'No');
  
  // Initialize categories from whiteboard data if available
  useEffect(() => {
    if (whiteboard.categories && Array.isArray(whiteboard.categories)) {
      setCategories(whiteboard.categories);
    } else {
      // If no categories provided, create default structure (will be replaced by backend load below)
      setCategories([
        {
          id: 'cat-default',
          name: 'Images',
          color: '#3b82f6',
          isMinimized: false,
          images: []
        }
      ]);
    }
  }, [whiteboard.id, whiteboard.categories]);

  // Load persisted categories and images from backend (WordPress)
  useEffect(() => {
    let isMounted = true;
    async function loadWorkspaceMedia() {
      try {
        // Fetch categories
        let backendCategories = await workspaceService.getWorkspaceCategories(whiteboard.id);
        if (!Array.isArray(backendCategories) || backendCategories.length === 0) {
          // Create a default category in backend to mirror project behavior
          const created = await workspaceService.createWorkspaceCategory(whiteboard.id, { name: 'Images', color: '#3b82f6' });
          backendCategories = [created];
        }

        // Fetch images
        const images = await workspaceService.getWorkspaceImages(whiteboard.id);
        const imagesByCategory: Record<string, any[]> = {};
        for (const img of images) {
          const cid = img.categoryId || backendCategories[0].id;
          if (!imagesByCategory[cid]) imagesByCategory[cid] = [];
          imagesByCategory[cid].push(img);
        }

        // Build Category[] shape for UI
        const nextCategories = backendCategories.map((cat: any) => ({
          id: String(cat.id),
          name: cat.name,
          color: cat.color || '#3b82f6',
          isMinimized: false,
          images: (imagesByCategory[cat.id] || []).map((im: any) => ({
            id: String(im.id),
            url: im.url,
            filename: im.filename || 'image',
            categoryId: String(cat.id),
            label: im.filename || 'image',
            pins: im.pins || [],
            comments: im.comments || [],
            uploadedBy: String(im.uploadedBy || ''),
            uploadedAt: im.uploadedAt || new Date().toISOString(),
          }))
        }));

        if (isMounted) {
          setCategories(nextCategories);
        }
      } catch (e) {
        console.error('Failed to load workspace media:', e);
      }
    }

    // Only attempt in WordPress mode
    if (typeof window !== 'undefined' && (window as any).pulse2) {
      loadWorkspaceMedia();
    }
    return () => {
      isMounted = false;
    };
  }, [whiteboard.id]);

  // Load project images when component mounts  
  useEffect(() => {
    console.log('🖼️ useEffect for project images triggered');
    
    async function loadProjectImages() {
      console.log('🖼️ loadProjectImages function started');
      
      if (!whiteboard.projectId) {
        console.log('🖼️ No projectId, skipping project image loading. ProjectId:', whiteboard.projectId);
        return;
      }
      
      console.log('🖼️ Project ID found:', whiteboard.projectId, 'typeof:', typeof whiteboard.projectId);
      
      try {
        console.log('🖼️ Loading project images for project:', whiteboard.projectId);
        const apiConfig = typeof window !== 'undefined' && window.pulse2 ? window.pulse2 : null;
        console.log('🖼️ API Config:', apiConfig);
        
        if (!apiConfig) {
          console.log('🖼️ No API config, skipping project image loading');
          return;
        }
        
        const jwtToken = localStorage.getItem('jwtToken');
        console.log('🖼️ JWT Token for request:', jwtToken ? jwtToken.substring(0, 20) + '...' : 'No token');
        
        const requestUrl = `${apiConfig.apiUrl}/projects/${whiteboard.projectId}`;
        console.log('🖼️ Making fetch request to:', requestUrl);
        
        const response = await fetch(requestUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,
            'X-WP-Nonce': apiConfig.nonce
          }
        });
        
        console.log('🖼️ Response status:', response.status, response.statusText);
        console.log('🖼️ Response ok:', response.ok);
        
        if (response.ok) {
          const project = await response.json();
          console.log('🖼️ Project data loaded:', project);
          console.log('🖼️ Project media array:', project.media);
          console.log('🖼️ Project media length:', project.media ? project.media.length : 'No media array');
          
          // Convert project media to whiteboard images and add to first category
          const allMedia = project.media || [];
          console.log('🖼️ All media before filtering:', allMedia);
          
          const imageMedia = allMedia.filter((m: any) => {
            // Treat items with an image-like URL as images, regardless of category/type
            const isImage = typeof m.url === 'string' && /\.(png|jpe?g|gif|webp|svg)$/i.test(m.url);
            console.log('🖼️ Checking media item:', m, '→ isImage:', isImage);
            return isImage;
          });
          console.log('🖼️ Filtered image media:', imageMedia);
          
          const projectImageMedia = imageMedia.map((m: any) => {
            const converted = {
              id: `project-${m.id}`,
              url: m.url,
              filename: m.filename || 'Project Image',
              categoryId: 'project-images',
              label: m.filename || 'Project Image',
              pins: [],
              comments: [],
              uploadedBy: 'project',
              uploadedAt: new Date().toISOString(),
            };
            console.log('🖼️ Converting media item:', m, '→', converted);
            return converted;
          });
          
          console.log('🖼️ Project images converted:', projectImageMedia);
          console.log('🖼️ Project images count:', projectImageMedia.length);
          setProjectImages(projectImageMedia);
          
          // Add project images to the first category
          setCategories(prevCategories => {
            console.log('🖼️ Current categories before adding project images:', prevCategories);
            console.log('🖼️ Categories length:', prevCategories.length);
            
            if (prevCategories.length === 0) {
              console.log('🖼️ No categories available, cannot add project images');
              return prevCategories;
            }
            
            const updatedCategories = [...prevCategories];
            const firstCategory = updatedCategories[0];
            console.log('🖼️ First category before update:', firstCategory);
            console.log('🖼️ First category existing images:', firstCategory.images);
            
            updatedCategories[0] = {
              ...updatedCategories[0],
              images: [
                ...projectImageMedia,
                ...updatedCategories[0].images
              ]
            };
            
            console.log('🖼️ First category after update:', updatedCategories[0]);
            console.log('🖼️ Updated categories with project images:', updatedCategories);
            console.log('🖼️ Total images in first category:', updatedCategories[0].images.length);
            return updatedCategories;
          });
        } else {
          console.error('❌ Failed to load project:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('❌ Response body:', errorText);
        }
      } catch (error) {
        console.error('❌ Error loading project images:', error);
        console.error('❌ Error stack:', error.stack);
      }
    }
    
    console.log('🖼️ Calling loadProjectImages()');
    loadProjectImages();
  }, [whiteboard.projectId]);

  // Prevent body scrolling when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const [selectedImage, setSelectedImage] = useState<ImageAnnotation | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number | undefined, y: number | undefined }>({ x: undefined, y: undefined });
  const [dragThreshold] = useState(5); // Pixels - if mouse moves more than this, it's a drag, not a click
  const [mouseDownPosition, setMouseDownPosition] = useState({ x: 0, y: 0 });
  const [hasDraggedBeyondThreshold, setHasDraggedBeyondThreshold] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [activeTab, setActiveTab] = useState<'pins' | 'notes'>('pins');
  const [editingPin, setEditingPin] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editingPinNote, setEditingPinNote] = useState('');
  const [editingCommentText, setEditingCommentText] = useState('');
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [newPinNote, setNewPinNote] = useState('');
  const [pendingPinPosition, setPendingPinPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [isDraggingPin, setIsDraggingPin] = useState(false);
  const [pinCreationMode, setPinCreationMode] = useState(true); // Enable pin creation by default

  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Notes hook is already declared above (line 136)

  // Mock users - to be replaced with real user data from JWT token
  const getCurrentUser = () => {
    const userId = localStorage.getItem('userId') || 'current-user';
    const userDisplayName = localStorage.getItem('userDisplayName') || 'Current User';
    
    return {
      id: userId,
      name: userDisplayName,
      avatar: 'https://i.pravatar.cc/150?u=current-user' // Example avatar
    };
  };

  const getUserById = (userId: string) => {
    // First try to get from JWT token
    const currentUserId = localStorage.getItem('userId');
    const currentUserName = localStorage.getItem('userDisplayName');
    
    if (userId === currentUserId || userId === 'current-user') {
      return {
        id: currentUserId || userId,
        name: currentUserName || 'Current User',
        email: 'current@example.com'
      };
    }
    
    // Then try from mock users
  const mockUsers = [
      { id: 'user-1', name: 'John Smith', email: 'john@example.com' },
      { id: 'user-2', name: 'Sarah Wilson', email: 'sarah@example.com' },
      { id: 'user-3', name: 'Mike Chen', email: 'mike@example.com' },
      { id: 'user-4', name: 'Emily Davis', email: 'emily@example.com' },
    ];
    
    const user = mockUsers.find(user => user.id === userId);
    return user || { id: userId, name: 'Unknown User', email: '' };
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category management functions
  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory: Category = {
        id: `cat-${Date.now()}`,
        name: newCategoryName.trim(),
        color: '#8b5cf6',
        isMinimized: false,
        images: []
      };
      setCategories(prev => [...prev, newCategory]);
      setNewCategoryName('');
      setShowAddCategory(false);
      
      activityService.logActivity({
        type: 'whiteboard_updated',
        title: 'Added category',
        description: `Added new category "${newCategoryName.trim()}" to whiteboard.`,
        projectId: whiteboard.projectId,
        userId: getCurrentUser().id
      });
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category and all its images?')) {
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      
      activityService.logActivity({
        type: 'whiteboard_updated',
        title: 'Deleted category',
        description: `Deleted category with ID: ${categoryId}`,
        projectId: whiteboard.projectId,
        userId: getCurrentUser().id
      });
    }
  };

  const handleEditCategory = (categoryId: string, newName: string) => {
    if (!newName.trim()) return;
    
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId ? { ...cat, name: newName.trim() } : cat
    ));
    
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const handleToggleMinimize = (categoryId: string) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId ? { ...cat, isMinimized: !cat.isMinimized } : cat
    ));
  };

  const handleMoveCategory = (categoryId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    setCategories(prev => {
      const currentIndex = prev.findIndex(cat => cat.id === categoryId);
      if (currentIndex === -1) return prev;

      const newCategories = [...prev];
      const [movedCategory] = newCategories.splice(currentIndex, 1);

      let newIndex: number;
      switch (direction) {
        case 'up':
          newIndex = Math.max(0, currentIndex - 1);
          break;
        case 'down':
          newIndex = Math.min(newCategories.length, currentIndex + 1);
          break;
        case 'top':
          newIndex = 0;
          break;
        case 'bottom':
          newIndex = newCategories.length;
          break;
        default:
          return prev;
      }

      newCategories.splice(newIndex, 0, movedCategory);
      return newCategories;
    });
    
    const category = categories.find(c => c.id === categoryId);
    activityService.logActivity({
      type: 'whiteboard_updated',
      title: 'Category moved',
      description: `Moved category "${category?.name}" ${direction}`,
      projectId: whiteboard.projectId,
      userId: getCurrentUser().id
    });
  };

  // Image management functions
  const handleImageUpload = (categoryId: string) => {
    setCurrentCategoryId(categoryId);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !currentCategoryId) return;
    
    const currentUser = getCurrentUser();

    for (const file of Array.from(files)) {
      try {
        // In WordPress mode, upload and associate with workspace first
        const apiConfig = typeof window !== 'undefined' && 'pulse2' in window 
          ? (window as any).pulse2 
          : null;

        let workspaceImageId: string;
        let imageUrl: string;

        if (apiConfig) {
          // Ensure we use a backend category id (create/load if needed)
          let ensuredCategoryId = currentCategoryId;
          try {
            const backendCategories = await workspaceService.getWorkspaceCategories(whiteboard.id);
            const found = backendCategories.find((c: any) => String(c.id) === String(currentCategoryId));
            if (!found) {
              const created = await workspaceService.createWorkspaceCategory(whiteboard.id, { name: 'Images', color: '#3b82f6' });
              ensuredCategoryId = String(created.id);
            }
          } catch {}
          const uploaded = await workspaceService.uploadWorkspaceImage(whiteboard.id, ensuredCategoryId, file);
          // Expect response to contain workspace image id and URL
          workspaceImageId = String(uploaded.id || uploaded.imageId || uploaded.workspace_image_id);
          imageUrl = uploaded.imageUrl || uploaded.url || uploaded.source_url;
        } else {
          // Dev fallback: object URL
          workspaceImageId = `img-${Date.now()}`;
          imageUrl = URL.createObjectURL(file);
        }

        // Build image annotation for UI
        const newImage: ImageAnnotation = {
          id: workspaceImageId,
          url: imageUrl,
          filename: file.name,
          categoryId: currentCategoryId,
          label: file.name,
          pins: [],
          comments: [],
          uploadedBy: currentUser.id,
          uploadedAt: new Date().toISOString(),
        };

        // Update categories state with the new image
        setCategories(prev => prev.map(cat => (
          cat.id === currentCategoryId
            ? { ...cat, images: [...cat.images, newImage] }
            : cat
        )));

        setSelectedImage(newImage);
        setShowImageDialog(false);

        // Re-sync from backend so state persists across tabs
        if (apiConfig) {
          // Re-load categories/images from server
          try {
            // We can call the same loader via an IIFE to keep code local
            (async () => {
              const backendCategories = await workspaceService.getWorkspaceCategories(whiteboard.id);
              const images = await workspaceService.getWorkspaceImages(whiteboard.id);
              const imagesByCategory: Record<string, any[]> = {};
              for (const img of images) {
                const cid = img.categoryId || backendCategories[0].id;
                if (!imagesByCategory[cid]) imagesByCategory[cid] = [];
                imagesByCategory[cid].push(img);
              }
              const nextCategories = backendCategories.map((cat: any) => ({
                id: String(cat.id),
                name: cat.name,
                color: cat.color || '#3b82f6',
                isMinimized: false,
                images: (imagesByCategory[cat.id] || []).map((im: any) => ({
                  id: String(im.id),
                  url: im.url,
                  filename: im.filename || 'image',
                  categoryId: String(cat.id),
                  label: im.filename || 'image',
                  pins: [],
                  comments: [],
                  uploadedBy: String(im.uploadedBy || ''),
                  uploadedAt: im.uploadedAt || new Date().toISOString(),
                }))
              }));
              setCategories(nextCategories);
            })();
          } catch {}
        }
      } catch (error) {
        console.error('Failed to upload image:', error);
        const { toast } = useToast();
        toast({ title: 'Upload Failed', description: 'Could not upload image to workspace', variant: 'destructive' });
      }
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (window.confirm('Are you sure you want to delete this image? This will also remove it from the associated project.')) {
      const imageToDelete = categories
        .flatMap(cat => cat.images)
        .find(img => img.id === imageId);
      
      if (!imageToDelete) return;
      
      setCategories(prev => prev.map(cat => ({
        ...cat,
        images: cat.images.filter(img => img.id !== imageId)
      })));
      
      if (selectedImage?.id === imageId) {
        setSelectedImage(null);
      }
      
      try {
        if (whiteboard.projectId) {
          const project = await mockApi.getProject(whiteboard.projectId);
          const projectMediaToDelete = project.media?.find(media => 
            media.filename === imageToDelete.filename || 
            media.url === imageToDelete.url
          );
          
          if (projectMediaToDelete) {
            const updatedMedia = project.media?.filter(media => media.id !== projectMediaToDelete.id) || [];
            await mockApi.updateProject(whiteboard.projectId, { media: updatedMedia });
          }
        }
      } catch (error) {
        console.error('Failed to sync image deletion with project:', error);
      }
      
      activityService.logActivity({
        type: 'whiteboard_updated',
        title: 'Deleted image',
        description: `Deleted image: ${imageToDelete.filename}`,
        projectId: whiteboard.projectId,
        userId: getCurrentUser().id,
        metadata: { imageId, filename: imageToDelete.filename }
      });
    }
  };

  const handleMoveImage = (imageId: string, targetCategoryId: string) => {
    setCategories(prev => {
      const sourceCategory = prev.find(cat => cat.images.some(img => img.id === imageId));
      const image = sourceCategory?.images.find(img => img.id === imageId);
      
      if (!image || !sourceCategory) return prev;

      return prev.map(cat => {
        if (cat.id === sourceCategory.id) {
          return { ...cat, images: cat.images.filter(img => img.id !== imageId) };
        } else if (cat.id === targetCategoryId) {
          return { ...cat, images: [...cat.images, { ...image, categoryId: targetCategoryId }] };
        }
        return cat;
      });
    });
    
    activityService.logActivity({
      type: 'whiteboard_updated',
      title: 'Moved image',
      description: `Moved image with ID: ${imageId} to category with ID: ${targetCategoryId}`,
      projectId: whiteboard.projectId,
      userId: getCurrentUser().id
    });
  };

  const handleDownloadImage = (image: ImageAnnotation) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.filename;
    link.click();
    
    activityService.logActivity({
      type: 'whiteboard_updated',
      title: 'Downloaded image',
      description: `Downloaded image with ID: ${image.id}`,
      projectId: whiteboard.projectId,
      userId: getCurrentUser().id
    });
  };

  // Pin and comment functions
  const handleImageClick = (image: ImageAnnotation) => {
    setSelectedImage(image);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleImageMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    setHasDraggedBeyondThreshold(false);
  };

  const handleImagePinClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!pinCreationMode || isDraggingPin || hasDraggedBeyondThreshold) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const constrainedX = Math.max(0, Math.min(100, x));
    const constrainedY = Math.max(0, Math.min(100, y));
    
    setPendingPinPosition({ x: constrainedX, y: constrainedY });
    setShowPinDialog(true);
  };

  const handleCreatePin = async () => {
    if (!selectedImage || !pendingPinPosition || !newPinNote.trim()) return;
    
    const currentUser = getCurrentUser();
    const newPin: Pin = {
      id: `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: pendingPinPosition.x,
      y: pendingPinPosition.y,
      note: newPinNote.trim(),
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
      isResolved: false,
      replies: []
    };

    try {
      // Save pin to WordPress API
      const savedPin = await workspaceService.createImagePin(selectedImage.id, {
        x: pendingPinPosition.x,
        y: pendingPinPosition.y,
        note: newPinNote.trim(),
        workspaceId: whiteboard.id,
      });

      // Update local state with the saved pin (use the ID from the server)
      const pinWithServerId = { ...newPin, id: savedPin.id };
      
      const updatedCategories = categories.map(cat => ({
        ...cat,
        images: cat.images.map(img => 
          img.id === selectedImage.id 
            ? { ...img, pins: [...img.pins, pinWithServerId] }
            : img
        )
      }));

      setCategories(updatedCategories);
      setSelectedImage(prev => prev ? { ...prev, pins: [...prev.pins, pinWithServerId] } : null);
      setPendingPinPosition(null);
      setNewPinNote('');
      setShowPinDialog(false);

      await activityService.logActivity({
        type: 'whiteboard_pin_added',
        title: `Pin added to whiteboard`,
        description: `Added pin to image "${selectedImage.filename}" in whiteboard "${whiteboard.name}".`,
        projectId: whiteboard.projectId,
        userId: currentUser.id,
        metadata: { 
          whiteboardId: whiteboard.id,
          imageId: selectedImage.id,
          pinId: pinWithServerId.id,
          imageName: selectedImage.filename,
          pinNote: pinWithServerId.note
        }
      });
    } catch (error) {
      console.error('Failed to create pin:', error);
      // Show error to user
      alert('Failed to save pin. Please try again.');
    }
  };

  const convertToNote = (comment: Comment): Note => ({
    id: comment.id,
    projectId: whiteboard.projectId,
    authorId: comment.createdBy,
    authorName: comment.createdBy,
    content: comment.text,
    createdAt: comment.createdAt,
    updatedAt: comment.createdAt,
  });

  const handleAddComment = async (commentText: string) => {
    if (!selectedImage || !commentText.trim()) return;
    
    const currentUser = getCurrentUser();
    const newComment: Comment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: commentText.trim(),
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
      userAvatar: currentUser.avatar,
      replies: []
    };

    try {
      // Save comment to WordPress API
      const savedComment = await workspaceService.createWorkspaceComment(whiteboard.id, {
        text: commentText.trim(),
        imageId: selectedImage.id
      });

      // Update local state with the saved comment (use the ID from the server)
      const commentWithServerId = { ...newComment, id: savedComment.id };

      const updatedCategories = categories.map(cat => ({
        ...cat,
        images: cat.images.map(img => 
          img.id === selectedImage.id 
            ? { ...img, comments: [...img.comments, commentWithServerId] }
            : img
        )
      }));

      setCategories(updatedCategories);
      setSelectedImage(prev => prev ? { ...prev, comments: [...prev.comments, commentWithServerId] } : null);

      await activityService.logActivity({
        type: 'comment_added',
        title: `Comment added to whiteboard`,
        description: `Added comment to image "${selectedImage.filename}" in whiteboard "${whiteboard.name}".`,
        projectId: whiteboard.projectId,
        userId: currentUser.id,
        metadata: { 
          whiteboardId: whiteboard.id,
          imageId: selectedImage.id,
          commentId: commentWithServerId.id,
          imageName: selectedImage.filename,
          commentText: commentWithServerId.text
        }
      });
    } catch (error) {
      console.error('Failed to add comment:', error);
      // Show error to user
      alert('Failed to save comment. Please try again.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedImage || !window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      const updatedCategories = categories.map(cat => ({
        ...cat,
        images: cat.images.map(img => 
          img.id === selectedImage.id 
            ? { ...img, comments: img.comments.filter(c => c.id !== commentId) }
            : img
        )
      }));

      setCategories(updatedCategories);
      setSelectedImage(prev => prev ? { 
        ...prev, 
        comments: prev.comments.filter(c => c.id !== commentId) 
      } : null);

      try {
        await workspaceService.updateWorkspace(whiteboard.id, {
          ...whiteboard,
          categories: updatedCategories
        } as any);
      } catch (saveError) {
        console.error('Failed to delete comment from backend:', saveError);
      }

      await activityService.logActivity({
        type: 'whiteboard_updated',
        title: `Comment deleted from whiteboard`,
        description: `Deleted comment from image "${selectedImage.filename}" in whiteboard "${whiteboard.name}".`,
        projectId: whiteboard.projectId,
        userId: getCurrentUser().id,
        metadata: { 
          whiteboardId: whiteboard.id,
          imageId: selectedImage.id,
          commentId: commentId,
          imageName: selectedImage.filename
        }
      });
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleEditPin = (pinId: string, newNote: string) => {
    if (!selectedImage || !newNote.trim()) return;
    
    try {
      // Update pin in WordPress API
      workspaceService.updatePin(pinId, {
        note: newNote.trim(),
        workspaceId: whiteboard.id,
      });

      // Update local state
      const updatedCategories = categories.map(cat => ({
        ...cat,
        images: cat.images.map(img => 
          img.id === selectedImage.id 
            ? { ...img, pins: img.pins.map(pin => pin.id === pinId ? { ...pin, note: newNote.trim() } : pin) }
            : img
        )
      }));

      setCategories(updatedCategories);
      setSelectedImage(prev => prev ? {
        ...prev,
        pins: prev.pins.map(pin => pin.id === pinId ? { ...pin, note: newNote.trim() } : pin)
      } : null);
      setEditingPin(null);
      setEditingPinNote('');

      activityService.logActivity({
        type: 'whiteboard_updated',
        title: `Pin updated in whiteboard`,
        description: `Updated pin on image "${selectedImage.filename}" in whiteboard "${whiteboard.name}".`,
        projectId: whiteboard.projectId,
        userId: getCurrentUser().id,
        metadata: { 
          whiteboardId: whiteboard.id,
          imageId: selectedImage.id,
          pinId: pinId,
          imageName: selectedImage.filename,
          newNote: newNote.trim()
        }
      });
    } catch (error) {
      console.error('Failed to update pin:', error);
      alert('Failed to update pin. Please try again.');
    }
  };

  const handleDeletePin = (pinId: string) => {
    if (!selectedImage || !window.confirm('Are you sure you want to delete this pin?')) return;

    try {
      // Delete pin from WordPress API
      workspaceService.deletePin(pinId);

      // Update local state
      const updatedCategories = categories.map(cat => ({
        ...cat,
        images: cat.images.map(img => 
          img.id === selectedImage.id 
            ? { ...img, pins: img.pins.filter(pin => pin.id !== pinId) }
            : img
        )
      }));

      setCategories(updatedCategories);
      setSelectedImage(prev => prev ? {
        ...prev,
        pins: prev.pins.filter(pin => pin.id !== pinId)
      } : null);

      activityService.logActivity({
        type: 'whiteboard_updated',
        title: `Pin deleted from whiteboard`,
        description: `Deleted pin from image "${selectedImage.filename}" in whiteboard "${whiteboard.name}".`,
        projectId: whiteboard.projectId,
        userId: getCurrentUser().id,
        metadata: { 
          whiteboardId: whiteboard.id,
          imageId: selectedImage.id,
          pinId: pinId,
          imageName: selectedImage.filename
        }
      });
    } catch (error) {
      console.error('Failed to delete pin:', error);
      alert('Failed to delete pin. Please try again.');
    }
  };

  const handleResolvePin = (pinId: string) => {
    if (!selectedImage) return;
    
    const pin = selectedImage.pins.find(p => p.id === pinId);
    if (!pin) return;

    try {
      // Update pin resolution status in WordPress API
      workspaceService.updatePin(pinId, {
        isResolved: !pin.isResolved,
        workspaceId: whiteboard.id,
      });

      // Update local state
      const updatedCategories = categories.map(cat => ({
        ...cat,
        images: cat.images.map(img => 
          img.id === selectedImage.id 
            ? { ...img, pins: img.pins.map(p => p.id === pinId ? { ...p, isResolved: !p.isResolved } : p) }
            : img
        )
      }));

      setCategories(updatedCategories);
      setSelectedImage(prev => prev ? {
        ...prev,
        pins: prev.pins.map(p => p.id === pinId ? { ...p, isResolved: !p.isResolved } : p)
      } : null);

      activityService.logActivity({
        type: 'whiteboard_updated',
        title: `Pin ${!pin.isResolved ? 'resolved' : 'unresolved'} in whiteboard`,
        description: `${!pin.isResolved ? 'Resolved' : 'Unresolved'} pin on image "${selectedImage.filename}" in whiteboard "${whiteboard.name}".`,
        projectId: whiteboard.projectId,
        userId: getCurrentUser().id,
        metadata: { 
          whiteboardId: whiteboard.id,
          imageId: selectedImage.id,
          pinId: pinId,
          imageName: selectedImage.filename,
          isResolved: !pin.isResolved
        }
      });
    } catch (error) {
      console.error('Failed to update pin resolution:', error);
      alert('Failed to update pin status. Please try again.');
    }
  };

  const handleEditComment = (commentId: string, newText: string) => {
    if (!selectedImage) return;
    
    setCategories(prev => prev.map(cat => ({
      ...cat,
      images: cat.images.map(img => 
        img.id === selectedImage.id 
          ? { ...img, comments: img.comments.map(comment => comment.id === commentId ? { ...comment, text: newText } : comment) }
          : img
      )
    })));
    
    setSelectedImage(prev => prev ? {
      ...prev,
      comments: prev.comments.map(comment => comment.id === commentId ? { ...comment, text: newText } : comment)
    } : null);
    
    setEditingComment(null);
    setEditingCommentText('');
    
    activityService.logActivity({
      type: 'whiteboard_updated',
      title: `Comment updated`,
      projectId: whiteboard.projectId,
      userId: getCurrentUser().id,
      metadata: { imageId: selectedImage.id, commentId: commentId }
    });
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.2, 0.1));
  const handleResetZoom = () => {
    setZoomLevel(1);
    const constrainedPosition = constrainPanPosition(0, 0, 1, imageContainerRef);
    setPanPosition(constrainedPosition);
  };

  const constrainPanPosition = useCallback((x: number, y: number, zoom: number, containerRef?: React.RefObject<HTMLDivElement>) => {
    if (!containerRef?.current) return { x, y };
    
    const container = containerRef.current;
    const image = container.querySelector('img');
    if (!image) return { x, y };
    
    const containerRect = container.getBoundingClientRect();
    
    const scaledImageWidth = image.offsetWidth * zoom;
    const scaledImageHeight = image.offsetHeight * zoom;
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    const padding = 50;
    const maxPanX = Math.max(padding, (scaledImageWidth - containerWidth) / 2 + padding);
    const minPanX = Math.min(-padding, -(scaledImageWidth - containerWidth) / 2 - padding);
    const maxPanY = Math.max(padding, (scaledImageHeight - containerHeight) / 2 + padding);
    const minPanY = Math.min(-padding, -(scaledImageHeight - containerHeight) / 2 - padding);
    
    if (scaledImageWidth <= containerWidth) {
      x = Math.max(minPanX, Math.min(maxPanX, 0));
    } else {
      x = Math.max(minPanX, Math.min(maxPanX, x));
    }
    
    if (scaledImageHeight <= containerHeight) {
      y = Math.max(minPanY, Math.min(maxPanY, 0));
    } else {
      y = Math.max(minPanY, Math.min(maxPanY, y));
    }
    
    return { x, y };
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Remove preventDefault to avoid passive event listener error
    if (!imageContainerRef.current) return;
    
    const container = imageContainerRef.current;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoomLevel * zoomFactor));
    
    if (newZoom === zoomLevel) return;
    
    const mouseXInImageSpace = (mouseX - centerX - panPosition.x) / zoomLevel;
    const mouseYInImageSpace = (mouseY - centerY - panPosition.y) / zoomLevel;
    const newPanX = centerX + mouseXInImageSpace * newZoom - mouseX;
    const newPanY = centerY + mouseYInImageSpace * newZoom - mouseY;
    
    const constrainedPosition = constrainPanPosition(-newPanX, -newPanY, newZoom, imageContainerRef);
    
    setZoomLevel(newZoom);
    setPanPosition(constrainedPosition);
  }, [zoomLevel, panPosition, constrainPanPosition]);

  const handlePinMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingPin && selectedPinId && selectedImage && imageContainerRef.current) {
      e.preventDefault();
      e.stopPropagation();
      
      const container = imageContainerRef.current;
      const imageRect = container.querySelector('img')?.getBoundingClientRect();
      if (!imageRect) return;
      
      const relativeX = ((e.clientX - imageRect.left) / imageRect.width) * 100;
      const relativeY = ((e.clientY - imageRect.top) / imageRect.height) * 100;
      const constrainedX = Math.max(0, Math.min(100, relativeX));
      const constrainedY = Math.max(0, Math.min(100, relativeY));
      
      setCategories(prev => prev.map(cat => ({
        ...cat,
        images: cat.images.map(img => 
          img.id === selectedImage.id 
            ? { ...img, pins: img.pins.map(pin => pin.id === selectedPinId ? { ...pin, x: constrainedX, y: constrainedY } : pin) }
            : img
        )
      })));
      
      setSelectedImage(prev => prev ? {
        ...prev,
        pins: prev.pins.map(pin => pin.id === selectedPinId ? { ...pin, x: constrainedX, y: constrainedY } : pin)
      } : null);
    }
  }, [isDraggingPin, selectedPinId, selectedImage]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      e.preventDefault();
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
      setMouseDownPosition({ x: e.clientX, y: e.clientY });
      setHasDraggedBeyondThreshold(false);
    }
  }, [panPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingPin) {
      handlePinMouseMove(e);
      return;
    }
    
    if (isDragging && dragStart.x !== undefined && dragStart.y !== undefined) {
      e.preventDefault();
      const newPanX = e.clientX - dragStart.x;
      const newPanY = e.clientY - dragStart.y;
      const constrainedPosition = constrainPanPosition(newPanX, newPanY, zoomLevel, imageContainerRef);
      setPanPosition(constrainedPosition);
    } else if (!isDraggingPin && dragStart.x !== undefined && dragStart.y !== undefined) {
      const dx = e.clientX - mouseDownPosition.x;
      const dy = e.clientY - mouseDownPosition.y;
      const distanceMoved = Math.sqrt(dx * dx + dy * dy);
      
      if (distanceMoved > dragThreshold) {
        setIsDragging(true);
        setHasDraggedBeyondThreshold(true);
        e.preventDefault();
        
        const newPanX = e.clientX - dragStart.x;
        const newPanY = e.clientY - dragStart.y;
        const constrainedPosition = constrainPanPosition(newPanX, newPanY, zoomLevel, imageContainerRef);
        setPanPosition(constrainedPosition);
      }
    }
  }, [isDragging, isDraggingPin, dragStart, mouseDownPosition, dragThreshold, constrainPanPosition, zoomLevel, handlePinMouseMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setHasDraggedBeyondThreshold(false);
    setDragStart({ x: undefined, y: undefined });
  }, []);

  const handlePinMouseDown = useCallback((e: React.MouseEvent, pinId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedPinId(pinId);
    setIsDraggingPin(true);
    setDragStart({ x: undefined, y: undefined });
    setHasDraggedBeyondThreshold(false);
  }, []);

  const handlePinMouseUp = useCallback(() => {
    if (isDraggingPin && selectedPinId) {
      setIsDraggingPin(false);
      setSelectedPinId(null);
      
      activityService.logActivity({
        type: 'whiteboard_updated',
        title: 'Pin moved',
        description: `Moved pin in image`,
        projectId: whiteboard.projectId,
        userId: getCurrentUser().id
      });
    }
  }, [isDraggingPin, selectedPinId, whiteboard.projectId]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging && dragStart.x !== undefined && dragStart.y !== undefined) {
        const newPanX = e.clientX - dragStart.x;
        const newPanY = e.clientY - dragStart.y;
        const constrainedPosition = constrainPanPosition(newPanX, newPanY, zoomLevel, imageContainerRef);
        setPanPosition(constrainedPosition);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingPin && selectedPinId) {
        activityService.logActivity({
          type: 'whiteboard_updated',
          title: `Pin repositioned in ${selectedImage?.filename}`,
          projectId: whiteboard.projectId,
          userId: getCurrentUser().id,
          metadata: { imageId: selectedImage?.id, pinId: selectedPinId }
        });
      }
      
      setIsDragging(false);
      setIsDraggingPin(false);
      setSelectedPinId(null);
      setHasDraggedBeyondThreshold(false);
      setDragStart({ x: undefined, y: undefined });
    };

    if (isDragging || isDraggingPin) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, isDraggingPin, dragStart, constrainPanPosition, zoomLevel, selectedImage, selectedPinId, whiteboard.projectId]);

  // Load pins and comments when selectedImage changes
  useEffect(() => {
    if (selectedImage) {
      // Load pins for the selected image
      workspaceService.getImagePins(selectedImage.id, whiteboard.id)
        .then(pins => {
          if (pins && pins.length > 0) {
            const updatedCategories = categories.map(cat => ({
              ...cat,
              images: cat.images.map(img => 
                img.id === selectedImage.id 
                  ? { ...img, pins: pins }
                  : img
              )
            }));
            setCategories(updatedCategories);
            setSelectedImage(prev => prev ? { ...prev, pins: pins } : null);
          }
        })
        .catch(error => {
          console.error('Failed to load pins:', error);
        });

      // Load comments for the workspace
      workspaceService.getWorkspaceComments(whiteboard.id)
        .then(comments => {
          if (comments && comments.length > 0) {
            // Filter comments for this specific image
            const imageComments = comments.filter(comment => comment.imageId === selectedImage.id);
            if (imageComments.length > 0) {
              const updatedCategories = categories.map(cat => ({
                ...cat,
                images: cat.images.map(img => 
                  img.id === selectedImage.id 
                    ? { ...img, comments: imageComments }
                    : img
                )
              }));
              setCategories(updatedCategories);
              setSelectedImage(prev => prev ? { ...prev, comments: imageComments } : null);
            }
          }
        })
        .catch(error => {
          console.error('Failed to load comments:', error);
        });
    }
  }, [selectedImage?.id, whiteboard.id]);

  const renderCategoryActions = (category: Category) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="hover-shimmer cyrus-ui">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleImageUpload(category.id)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Image
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setEditingCategoryId(category.id); setEditingCategoryName(category.name); }}>
          <Edit2 className="h-4 w-4 mr-2" />
          Edit Name
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger><Move className="h-4 w-4 mr-2" />Move Category</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => handleMoveCategory(category.id, 'top')}>Move to Top</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleMoveCategory(category.id, 'up')}>Move Up</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleMoveCategory(category.id, 'down')}>Move Down</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleMoveCategory(category.id, 'bottom')}>Move to Bottom</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => handleToggleMinimize(category.id)}>
          {category.isMinimized ? <><Eye className="h-4 w-4 mr-2" />Show Images</> : <><EyeOff className="h-4 w-4 mr-2" />Hide Images</>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleDeleteCategory(category.id)} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Category
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderImageActions = (image: ImageAnnotation) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="hover-shimmer cyrus-ui"><MoreVertical className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleImageClick(image)}><Maximize2 className="h-4 w-4 mr-2" />View Full Size</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownloadImage(image)}><Download className="h-4 w-4 mr-2" />Download</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger><Move className="h-4 w-4 mr-2" />Move to Category</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {categories.filter(cat => cat.id !== image.categoryId).map(category => (
              <DropdownMenuItem key={category.id} onClick={() => handleMoveImage(image.id, category.id)}>{category.name}</DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleDeleteImage(image.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete Image</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderPinsAndComments = () => {
    if (!selectedImage) return null;
    return (
      <div className="w-full">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pins' | 'notes')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="pins" className="flex items-center gap-2"><Pin className="h-4 w-4" />Pins ({selectedImage.pins?.length || 0})</TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2"><MessageCircle className="h-4 w-4" />Notes ({notes.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pins" className="space-y-4">
            {selectedImage.pins && selectedImage.pins.length > 0 ? (
              selectedImage.pins.map(pin => (
                <Card key={pin.id} className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Pin className={cn("h-4 w-4 mt-1", pin.isResolved ? "text-green-500" : "text-blue-500")} />
                      <div className="flex-1">
                        {editingPin === pin.id ? (
                          <div className="space-y-2">
                            <Textarea value={editingPinNote} onChange={(e) => setEditingPinNote(e.target.value)} className="text-sm resize-none min-h-[60px]" />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleEditPin(pin.id, editingPinNote)} disabled={!editingPinNote.trim()}>Save</Button>
                              <Button size="sm" variant="outline" onClick={() => { setEditingPin(null); setEditingPinNote(''); }}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className={cn("text-sm", pin.isResolved && "line-through text-muted-foreground")}>{pin.note}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span>{getUserById(pin.createdBy).name}</span><span>•</span><span>{formatDate(pin.createdAt)}</span>
                              <Badge variant={pin.isResolved ? "default" : "secondary"} className="text-xs">{pin.isResolved ? "Resolved" : "Open"}</Badge>
                            </div>
                            <div className="flex gap-1 mt-3">
                              <Button size="sm" variant="outline" onClick={() => { setEditingPin(pin.id); setEditingPinNote(pin.note); }} className="hover-shimmer cyrus-ui h-7 w-7 p-0"><Edit2 className="h-3 w-3" /></Button>
                              <Button size="sm" variant={pin.isResolved ? "secondary" : "default"} onClick={() => handleResolvePin(pin.id)} className="hover-shimmer cyrus-ui h-7 w-7 p-0" title={pin.isResolved ? "Unresolve" : "Resolve"}><Check className="h-3 w-3" /></Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeletePin(pin.id)} className="hover-shimmer cyrus-ui h-7 w-7 p-0"><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Pin className="h-8 w-8 mx-auto mb-2" />
                <p>No pins yet</p>
                <p className="text-xs">{pinCreationMode ? "Click on the image to add pins (Pin mode: ON)" : "Enable pin mode using the pin button below the image"}</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="notes" className="space-y-4">
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Textarea
                    placeholder="Add a note..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="resize-none min-h-[80px] hover-shimmer cyrus-ui"
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleAddNote}
                      size="sm" 
                      disabled={!noteInput.trim()}
                      className="hover-shimmer cyrus-ui"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            {notes.length > 0 ? (
              notes.map(note => (
                <Card key={note.id} className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                        {note.authorName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1">
                        {editingNoteId === note.id ? (
                          <div className="space-y-2">
                            <Textarea value={editInput} onChange={(e) => setEditInput(e.target.value)} className="text-sm resize-none min-h-[60px]" />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleEditNote(note.id)} disabled={!editInput.trim()}>Save</Button>
                              <Button size="sm" variant="outline" onClick={() => { setEditingNoteId(null); setEditInput(''); }}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm">{note.content}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span>{note.authorName || 'User'}</span><span>•</span><span>{formatDate(note.createdAt)}</span>
                            </div>
                            <div className="flex gap-1 mt-3">
                              <Button size="sm" variant="outline" onClick={() => { setEditingNoteId(note.id); setEditInput(note.content); }} className="hover-shimmer cyrus-ui h-7 w-7 p-0"><Edit2 className="h-3 w-3" /></Button>
                              <Button size="sm" variant="outline" onClick={() => handleReply(note.id)} className="hover-shimmer cyrus-ui h-7 w-7 p-0"><MessageCircle className="h-3 w-3" /></Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2" />
                <p>No notes yet</p>
                <p className="text-xs">Add a note about this whiteboard</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center">
          <Button onClick={onBack} variant="ghost" size="sm" className="mr-2"><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            {selectedImage ? (
              <>
                <h2 className="text-xl font-bold">{selectedImage.filename}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" /><span>{formatDate(selectedImage.uploadedAt)}</span><span className="h-1 w-1 rounded-full bg-muted-foreground"></span><User className="h-3.5 w-3.5" /><span>{getUserById(selectedImage.uploadedBy).name}</span>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold">{whiteboard.name}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" /><span>{formatDate(whiteboard.updatedAt || whiteboard.createdAt)}</span><span className="h-1 w-1 rounded-full bg-muted-foreground"></span><User className="h-3.5 w-3.5" /><span>{getCurrentUser().name}</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!selectedImage && (
            <Button variant="ghost" size="sm" onClick={() => setShowAddCategory(true)} className="flex items-center gap-1"><FolderPlus className="h-4 w-4" />Add Category</Button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      {selectedImage ? (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Image Container - Fixed to remaining viewport height */}
          <div 
            className="flex-1 relative overflow-hidden bg-black/5"
            style={{ cursor: isDraggingPin ? 'default' : (isDragging ? 'grabbing' : (dragStart.x !== undefined ? 'grab' : 'default')) }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            ref={imageContainerRef}
          >
            {/* Zoom Controls - Bottom overlay */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-2 bg-background/80 backdrop-blur-sm border rounded-lg px-3 py-2">
              <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={zoomLevel <= 0.1}><ZoomOut className="h-4 w-4" /></Button>
              <span className="text-xs font-medium min-w-[3rem] text-center">{Math.round(zoomLevel * 100)}%</span>
              <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={zoomLevel >= 5}><ZoomIn className="h-4 w-4" /></Button>
              <div className="w-px h-4 bg-border mx-1" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant={pinCreationMode ? "default" : "ghost"} size="sm" onClick={() => setPinCreationMode(!pinCreationMode)} className={cn("hover-shimmer cyrus-ui", pinCreationMode && "bg-primary text-primary-foreground")}><Pin className="h-4 w-4" /></Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{pinCreationMode ? 'Disable pin creation' : 'Enable pin creation'}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="w-px h-4 bg-border mx-1" />
              <Button variant="ghost" size="sm" onClick={handleResetZoom}><RotateCcw className="h-4 w-4" /></Button>
            </div>
            
            {/* Image with zoom and pan */}
            <div className="absolute inset-0 flex items-center justify-center" style={{ transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`, transformOrigin: 'center center' }}>
              <div className="relative">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.filename}
                  className="max-w-full max-h-full object-contain"
                  style={{ pointerEvents: isDragging ? 'none' : 'auto', cursor: pinCreationMode ? 'crosshair' : 'default', width: 'auto', height: 'auto', maxWidth: '70vw', maxHeight: '60vh' }}
                  onMouseDown={handleImageMouseDown}
                  onClick={handleImagePinClick}
                  draggable={false}
                />
                
                {/* Pins */}
                {selectedImage.pins && selectedImage.pins.map((pin) => (
                  <div
                    key={pin.id}
                    className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full flex items-center justify-center transition-all duration-200 ${pin.isResolved ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} ${selectedPinId === pin.id ? 'ring-2 ring-white cursor-grabbing' : 'hover:scale-110 cursor-grab'} shadow-lg hover:shadow-xl`}
                    style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: `scale(${1 / zoomLevel})` }}
                    onMouseDown={(e) => handlePinMouseDown(e, pin.id)}
                    onClick={(e) => {
                      if (!isDraggingPin) {
                        e.stopPropagation();
                        setEditingPin(pin.id);
                        setEditingPinNote(pin.note);
                      }
                    }}
                  >
                    <span className="text-white text-xs font-bold">{(selectedImage.pins || []).findIndex((p) => p.id === pin.id) + 1}</span>
                  </div>
                ))}
                
                {/* Pending pin position */}
                {pendingPinPosition && (
                  <div className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full bg-blue-500 flex items-center justify-center animate-pulse" style={{ left: `${pendingPinPosition.x}%`, top: `${pendingPinPosition.y}%`, transform: `scale(${1 / zoomLevel})` }}>
                    <Pin className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Sidebar - Only this should scroll */}
          <div className="w-[450px] border-l bg-background flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4">
              {renderPinsAndComments()}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-4 overflow-auto">
          <div className="space-y-3">
            {categories.map(category => (
              <Card key={category.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {editingCategoryId === category.id ? (
                        <div className="flex gap-2 items-center">
                          <Input value={editingCategoryName} onChange={(e) => setEditingCategoryName(e.target.value)} className="h-6 text-sm px-2" onBlur={() => handleEditCategory(category.id, editingCategoryName)} onKeyDown={(e) => { if (e.key === 'Enter') handleEditCategory(category.id, editingCategoryName); if (e.key === 'Escape') setEditingCategoryId(null); }} autoFocus />
                        </div>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleToggleMinimize(category.id)} className="h-6 w-6 p-0">{category.isMinimized ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                          <h3 className="text-sm font-medium">{category.name}</h3>
                          <Badge variant="secondary" className="text-xs">{category.images.length}</Badge>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setCurrentCategoryId(category.id); fileInputRef.current?.click(); }} className="h-6 px-2 text-xs"><Plus className="h-3 w-3 mr-1" />Add</Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-6 px-2"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => { setEditingCategoryId(category.id); setEditingCategoryName(category.name); }}><Edit2 className="h-4 w-4 mr-2" />Rename Category</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleMinimize(category.id)}>{category.isMinimized ? <><Eye className="h-4 w-4 mr-2" />Show Images</> : <><EyeOff className="h-4 w-4 mr-2" />Hide Images</>}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger><Move className="h-4 w-4 mr-2" />Move Category</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={() => handleMoveCategory(category.id, 'top')} disabled={categories.findIndex(c => c.id === category.id) === 0}>To Top</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMoveCategory(category.id, 'up')} disabled={categories.findIndex(c => c.id === category.id) === 0}>Move Up</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMoveCategory(category.id, 'down')} disabled={categories.findIndex(c => c.id === category.id) === categories.length - 1}>Move Down</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMoveCategory(category.id, 'bottom')} disabled={categories.findIndex(c => c.id === category.id) === categories.length - 1}>To Bottom</DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteCategory(category.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete Category</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                {!category.isMinimized && (
                  <CardContent className="pt-0">
                    {category.images.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">No images in this category</div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                        {category.images.map(image => (
                          <div key={image.id} className="relative group cursor-pointer" onClick={() => handleImageClick(image)}>
                            <img src={image.url} alt={image.filename} className="w-full aspect-square object-cover rounded border hover:shadow-md transition-shadow" />
                            {image.pins.length > 0 && (
                              <div className="absolute top-1 right-1"><Badge variant="secondary" className="bg-red-500/90 text-white text-xs px-1 py-0">{image.pins.length}</Badge></div>
                            )}
                            <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="sm" variant="destructive" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); handleDeleteImage(image.id); }}><X className="h-3 w-3" /></Button>
                            </div>
                            <div className="mt-1"><p className="text-xs text-center text-muted-foreground truncate">{image.filename || `Image ${category.images.findIndex(img => img.id === image.id) + 1}`}</p></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} multiple accept="image/*" />

      {/* Dialogs */}
      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Category name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>Add Category</Button>
              <Button variant="outline" onClick={() => setShowAddCategory(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Pin</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea placeholder="Enter your note..." value={newPinNote} onChange={(e) => setNewPinNote(e.target.value)} className="resize-none min-h-[100px]" />
            <div className="flex gap-2">
              <Button onClick={handleCreatePin} disabled={!newPinNote.trim()}>Add Pin</Button>
              <Button variant="outline" onClick={() => { setShowPinDialog(false); setNewPinNote(''); setPendingPinPosition(null); }}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhiteboardDetail;