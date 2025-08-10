import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, 
  MessageCircle, 
  Download, 
  Share2, 
  Users, 
  Settings,
  Plus,
  Image as ImageIcon,
  Type,
  Palette as PaletteIcon,
  Link,
  MoreHorizontal,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from '@/lib/utils';
import { 
  MoodboardWorkspace as MoodboardWorkspaceType, 
  MoodboardElement, 
  Annotation, 
  Position, 
  Size 
} from '@/types/workspace';
import { workspaceService } from '@/services/workspaceService';
import { MediaLibraryModal } from '@/components/MediaLibraryModal';

interface MoodboardWorkspaceProps {
  workspace: MoodboardWorkspaceType;
  projectId: string;
  userId: string;
  userName: string;
  onUpdate?: (workspace: MoodboardWorkspace) => void;
  className?: string;
}

interface DragState {
  isDragging: boolean;
  dragElement: MoodboardElement | null;
  offset: Position;
}

interface AnnotationState {
  activeElement: string | null;
  showingAnnotations: Set<string>;
  newAnnotation: {
    elementId: string;
    position: Position;
    content: string;
  } | null;
}

export function MoodboardWorkspace({ 
  workspace, 
  projectId, 
  userId, 
  userName, 
  onUpdate,
  className 
}: MoodboardWorkspaceProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragElement: null,
    offset: { x: 0, y: 0, z: 0 }
  });
  
  const [annotationState, setAnnotationState] = useState<AnnotationState>({
    activeElement: null,
    showingAnnotations: new Set(),
    newAnnotation: null
  });

  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set());
  const [canvasScale, setCanvasScale] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);

  // Canvas interaction handlers
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedElements(new Set());
      setAnnotationState(prev => ({ ...prev, activeElement: null }));
    }
  }, []);

  const handleElementClick = useCallback((elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (e.ctrlKey || e.metaKey) {
      setSelectedElements(prev => {
        const newSet = new Set(prev);
        if (newSet.has(elementId)) {
          newSet.delete(elementId);
        } else {
          newSet.add(elementId);
        }
        return newSet;
      });
    } else {
      setSelectedElements(new Set([elementId]));
    }
    
    setAnnotationState(prev => ({ ...prev, activeElement: elementId }));
  }, []);

  const handleElementDoubleClick = useCallback(async (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    
    if (!canvasRect) return;
    
    const position: Position = {
      x: e.clientX - canvasRect.left,
      y: e.clientY - canvasRect.top,
      z: 0
    };
    
    setAnnotationState(prev => ({
      ...prev,
      newAnnotation: {
        elementId,
        position,
        content: ''
      }
    }));
  }, []);

  // Drag and drop handlers
  const handleMouseDown = useCallback((element: MoodboardElement, e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    
    const rect = e.currentTarget.getBoundingClientRect();
    const offset: Position = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      z: 0
    };
    
    setDragState({
      isDragging: true,
      dragElement: element,
      offset
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.dragElement || !canvasRef.current) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newPosition: Position = {
      x: Math.max(0, Math.min(
        workspace.canvas.width - dragState.dragElement.size.width,
        e.clientX - canvasRect.left - dragState.offset.x
      )),
      y: Math.max(0, Math.min(
        workspace.canvas.height - dragState.dragElement.size.height,
        e.clientY - canvasRect.top - dragState.offset.y
      )),
      z: dragState.dragElement.position.z
    };
    
    // Update element position optimistically
    const updatedElements = workspace.canvas.elements.map(el =>
      el.id === dragState.dragElement!.id 
        ? { ...el, position: newPosition }
        : el
    );
    
    const updatedWorkspace: MoodboardWorkspace = {
      ...workspace,
      canvas: {
        ...workspace.canvas,
        elements: updatedElements
      }
    };
    
    onUpdate?.(updatedWorkspace);
  }, [dragState, workspace, onUpdate]);

  // Ensure latest workspace settings (canvas) are loaded from backend
  useEffect(() => {
    let isMounted = true;
    async function loadWorkspace() {
      try {
        if (typeof window !== 'undefined' && (window as any).pulse2) {
          const latest = await workspaceService.getWorkspace(workspace.id);
          const normalized = (latest as any);
          if (isMounted && normalized && normalized.settings && normalized.settings.canvas) {
            onUpdate?.({ ...(workspace as any), canvas: normalized.settings.canvas } as any);
          }
        }
      } catch (e) {
        console.warn('Failed to reload workspace settings:', e);
      }
    }
    loadWorkspace();
    return () => { isMounted = false; };
  }, [workspace.id]);

  // helper to persist canvas into workspace settings
  const persistCanvas = useCallback(async (canvas: any) => {
    try {
      await workspaceService.updateWorkspace(workspace.id, {
        settings: { ...(workspace as any).settings, canvas }
      } as any);
      // Re-fetch the workspace so UI state matches backend (prevents disappear on tab switch)
      if (typeof window !== 'undefined' && (window as any).pulse2) {
        const latest = await workspaceService.getWorkspace(workspace.id);
        const normalized = (latest as any);
        if (normalized && normalized.settings && normalized.settings.canvas) {
          onUpdate?.({ ...(workspace as any), canvas: normalized.settings.canvas } as any);
        }
      }
    } catch (e) {
      console.error('Failed to persist moodboard canvas:', e);
    }
  }, [workspace.id, onUpdate]);

  const handleMouseUp = useCallback(async () => {
    if (dragState.isDragging && dragState.dragElement && workspace.canvas) {
      const newElements = workspace.canvas.elements.map(el => el.id === dragState.dragElement!.id ? { ...el, position: dragState.dragElement!.position } : el);
      const newCanvas = { ...workspace.canvas, elements: newElements };
      onUpdate?.({ ...(workspace as any), canvas: newCanvas } as any);
      await persistCanvas(newCanvas);
    }
    setDragState({ isDragging: false, dragElement: null, offset: { x: 0, y: 0, z: 0 } });
  }, [dragState, workspace, onUpdate, persistCanvas]);

  // File upload handlers
  const handleFileUpload = useCallback(async (files: FileList) => {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string;
        
        // Create image element to get dimensions
        const img = new Image();
        img.onload = async () => {
          const maxSize = 200;
          const aspectRatio = img.width / img.height;
          const size: Size = aspectRatio > 1 
            ? { width: maxSize, height: maxSize / aspectRatio }
            : { width: maxSize * aspectRatio, height: maxSize };
          
          const newElement: Omit<MoodboardElement, 'id' | 'createdAt' | 'createdBy'> = {
            type: 'image',
            position: { x: 50, y: 50, z: workspace.canvas.elements.length },
            size,
            content: {
              url: imageUrl,
              filename: file.name,
              originalWidth: img.width,
              originalHeight: img.height
            },
            annotations: []
          };
          
          try {
            await workspaceService.addMoodboardElement(
              workspace.id,
              newElement,
              userId,
              userName,
              projectId
            );
          } catch (error) {
            console.error('Failed to add image element:', error);
          }
        };
        img.src = imageUrl;
      };
      reader.readAsDataURL(file);
    }
  }, [workspace.id, workspace.canvas.elements.length, userId, userName, projectId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Annotation handlers
  const handleAddAnnotation = useCallback(async (content: string) => {
    if (!annotationState.newAnnotation) return;
    
    const annotation: Omit<Annotation, 'id' | 'createdAt' | 'replies'> = {
      position: annotationState.newAnnotation.position,
      content,
      authorId: userId,
      authorName: userName,
      resolved: false
    };
    
    try {
      await workspaceService.addAnnotation(
        workspace.id,
        annotationState.newAnnotation.elementId,
        annotation,
        userId,
        userName,
        projectId
      );
      
      setAnnotationState(prev => ({ ...prev, newAnnotation: null }));
    } catch (error) {
      console.error('Failed to add annotation:', error);
    }
  }, [annotationState.newAnnotation, workspace.id, userId, userName, projectId]);

  // Add element handlers
  const addTextElement = useCallback(async () => {
    const newElement: Omit<MoodboardElement, 'id' | 'createdAt' | 'createdBy'> = {
      type: 'text',
      position: { x: 100, y: 100, z: workspace.canvas.elements.length },
      size: { width: 200, height: 50 },
      content: {
        text: 'Double-click to edit',
        fontSize: 16,
        fontFamily: 'Inter',
        color: '#000000'
      },
      annotations: []
    };
    
    try {
      await workspaceService.addMoodboardElement(
        workspace.id,
        newElement,
        userId,
        userName,
        projectId
      );
    } catch (error) {
      console.error('Failed to add text element:', error);
    }
  }, [workspace.id, workspace.canvas.elements.length, userId, userName, projectId]);

  const addColorSwatch = useCallback(async (color: string) => {
    const newElement: Omit<MoodboardElement, 'id' | 'createdAt' | 'createdBy'> = {
      type: 'color-swatch',
      position: { x: 150, y: 150, z: workspace.canvas.elements.length },
      size: { width: 80, height: 80 },
      content: {
        color,
        name: color
      },
      annotations: []
    };
    
    try {
      await workspaceService.addMoodboardElement(
        workspace.id,
        newElement,
        userId,
        userName,
        projectId
      );
    } catch (error) {
      console.error('Failed to add color swatch:', error);
    }
  }, [workspace.id, workspace.canvas.elements.length, userId, userName, projectId]);

  // Event listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleMouseMove(e as React.MouseEvent<HTMLDivElement>);
    };
    
    const handleGlobalMouseUp = () => {
      handleMouseUp();
    };
    
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className={cn("flex flex-col h-full bg-gray-50 dark:bg-gray-900", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b">
        <div className="flex items-center gap-2">
          <PaletteIcon className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold">{workspace.name}</h2>
          <Badge variant="secondary" className="ml-2">
            {workspace.canvas.elements.length} elements
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Add Element Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Element
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className="w-4 h-4 mr-2" />
                Upload Image
              </DropdownMenuItem>
              <DropdownMenuItem onClick={addTextElement}>
                <Type className="w-4 h-4 mr-2" />
                Add Text
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addColorSwatch('#ff6b6b')}>
                <PaletteIcon className="w-4 h-4 mr-2" />
                Color Swatch
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link className="w-4 h-4 mr-2" />
                Add Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Tools */}
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Users className="w-4 h-4 mr-2" />
            {workspace.collaborators.length}
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-auto">
        <div
          ref={canvasRef}
          className={cn(
            "relative min-h-full cursor-crosshair",
            showGrid && "bg-grid-pattern"
          )}
          style={{
            width: workspace.canvas.width * canvasScale,
            height: workspace.canvas.height * canvasScale,
            backgroundColor: workspace.canvas.background
          }}
          onClick={handleCanvasClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {/* Canvas Elements */}
          {workspace.canvas.elements.map((element) => (
            <MoodboardElementComponent
              key={element.id}
              element={element}
              isSelected={selectedElements.has(element.id)}
              isActive={annotationState.activeElement === element.id}
              scale={canvasScale}
              onMouseDown={(e) => handleMouseDown(element, e)}
              onClick={(e) => handleElementClick(element.id, e)}
              onDoubleClick={(e) => handleElementDoubleClick(element.id, e)}
              showAnnotations={annotationState.showingAnnotations.has(element.id)}
              onToggleAnnotations={(show) => {
                setAnnotationState(prev => {
                  const newSet = new Set(prev.showingAnnotations);
                  if (show) {
                    newSet.add(element.id);
                  } else {
                    newSet.delete(element.id);
                  }
                  return { ...prev, showingAnnotations: newSet };
                });
              }}
            />
          ))}
          
          {/* New Annotation Input */}
          {annotationState.newAnnotation && (
            <div
              className="absolute z-50"
              style={{
                left: annotationState.newAnnotation.position.x,
                top: annotationState.newAnnotation.position.y
              }}
            >
              <NewAnnotationInput
                onSave={handleAddAnnotation}
                onCancel={() => setAnnotationState(prev => ({ ...prev, newAnnotation: null }))}
              />
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
      />

      {/* Media Library Modal */}
      <MediaLibraryModal isOpen={isMediaLibraryOpen} onClose={() => setIsMediaLibraryOpen(false)} onSelect={(items: any[]) => handleSelectFromLibrary(items as any)} mediaUrl={typeof window !== 'undefined' && window.pulse2 ? window.pulse2.mediaUrl : undefined} nonce={typeof window !== 'undefined' && window.pulse2 ? window.pulse2.nonce : undefined} />
    </div>
  );
}

// Individual element component
interface MoodboardElementComponentProps {
  element: MoodboardElement;
  isSelected: boolean;
  isActive: boolean;
  scale: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  showAnnotations: boolean;
  onToggleAnnotations: (show: boolean) => void;
}

function MoodboardElementComponent({
  element,
  isSelected,
  isActive,
  scale,
  onMouseDown,
  onClick,
  onDoubleClick,
  showAnnotations,
  onToggleAnnotations
}: MoodboardElementComponentProps) {
  const renderElementContent = () => {
    switch (element.type) {
      case 'image':
        return (
          <img
            src={element.content.url}
            alt={element.content.filename}
            className="w-full h-full object-cover rounded"
            draggable={false}
          />
        );
      
      case 'text':
        return (
          <div
            className="w-full h-full flex items-center justify-center p-2 bg-white rounded shadow-sm border"
            style={{
              fontSize: element.content.fontSize * scale,
              fontFamily: element.content.fontFamily,
              color: element.content.color
            }}
          >
            {element.content.text}
          </div>
        );
      
      case 'color-swatch':
        return (
          <div className="w-full h-full rounded shadow-sm border-2 border-white">
            <div
              className="w-full h-full rounded"
              style={{ backgroundColor: element.content.color }}
            />
          </div>
        );
      
      default:
        return (
          <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
            Unknown element
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        "absolute cursor-move transition-all duration-200",
        isSelected && "ring-2 ring-purple-500 ring-offset-2",
        isActive && "z-10"
      )}
      style={{
        left: element.position.x * scale,
        top: element.position.y * scale,
        width: element.size.width * scale,
        height: element.size.height * scale,
        zIndex: element.position.z
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {renderElementContent()}
      
      {/* Annotations */}
      {element.annotations.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full bg-purple-500 text-white border-white",
            showAnnotations && "bg-purple-600"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleAnnotations(!showAnnotations);
          }}
        >
          <MessageCircle className="w-3 h-3" />
        </Button>
      )}
      
      {/* Annotation displays */}
      {showAnnotations && element.annotations.map((annotation) => (
        <div
          key={annotation.id}
          className="absolute z-20"
          style={{
            left: annotation.position.x,
            top: annotation.position.y
          }}
        >
          <AnnotationDisplay annotation={annotation} />
        </div>
      ))}
    </div>
  );
}

// New annotation input component
interface NewAnnotationInputProps {
  onSave: (content: string) => void;
  onCancel: () => void;
}

function NewAnnotationInput({ onSave, onCancel }: NewAnnotationInputProps) {
  const [content, setContent] = useState('');

  const handleSave = () => {
    if (content.trim()) {
      onSave(content.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-3 min-w-[250px]">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a comment..."
        className="min-h-[80px] mb-2"
        onKeyDown={handleKeyDown}
        autoFocus
      />
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!content.trim()}>
          <Check className="w-3 h-3 mr-1" />
          Save
        </Button>
      </div>
    </div>
  );
}

// Annotation display component
interface AnnotationDisplayProps {
  annotation: Annotation;
}

function AnnotationDisplay({ annotation }: AnnotationDisplayProps) {
  return (
    <div className="bg-yellow-100 dark:bg-yellow-900 rounded-lg shadow-lg border p-2 max-w-[200px]">
      <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
        {annotation.authorName}
      </div>
      <div className="text-sm text-gray-800 dark:text-gray-200">
        {annotation.content}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {new Date(annotation.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}

// handleSelectFromLibrary
  const handleSelectFromLibrary = async (selected: Array<{ id: number; source_url: string }>) => {
    for (const item of selected) {
      try {
        // Create a workspace image row using existing attachment
        // Reuse uploadWorkspaceImage endpoint by posting a small proxy; or create a specific method if backend supports
        // Here we simulate by creating an image element with the URL and persisting canvas
        const img = new Image();
        img.onload = async () => {
          const maxSize = 200;
          const aspect = img.width / img.height;
          const size = aspect > 1 ? { width: maxSize, height: maxSize / aspect } : { width: maxSize * aspect, height: maxSize };
          const newElement: Omit<MoodboardElement, 'id' | 'createdAt' | 'createdBy'> = {
            type: 'image',
            position: { x: 50, y: 50, z: (workspace.canvas?.elements.length || 0) },
            size,
            content: { url: item.source_url, filename: `media-${item.id}` },
            annotations: []
          };
          const newElements = [...(workspace.canvas?.elements || []), { ...newElement, id: `${Date.now()}-${Math.random()}`, createdAt: new Date().toISOString(), createdBy: userId } as any];
          const newCanvas = { ...(workspace.canvas || { width: 1920, height: 1080, background: '#f5f5f5' }), elements: newElements };
          onUpdate?.({ ...(workspace as any), canvas: newCanvas } as any);
          await persistCanvas(newCanvas);
        };
        img.src = item.source_url;
      } catch (e) {
        console.error('Failed to add media from library:', e);
      }
    }
    setIsMediaLibraryOpen(false);
  };