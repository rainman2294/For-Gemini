import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Project, ProjectMedia, MediaCategory, Note } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Calendar, User, Briefcase, Tag, FileText, MessageCircle, Send, Trash2, Edit2, CornerDownRight, Video, ExternalLink, Image, Pin, Palette, GitBranch, PenTool, Plus, ArrowLeft, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { projectStatuses, getStatusColorClass, getStatusBorderColorClass } from '@/lib/statuses';
import { cn, getYouTubeVideoId, formatDate } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageSlider } from './ImageSlider';
import { LightboxModal } from './LightboxModal';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useNotes } from '@/hooks/useNotes';
import { RefreshToggle } from './RefreshToggle';
import { WorkspaceContainer } from './WorkspaceContainer';
import { FilestageComments } from './FilestageComments';
import { workspaceService } from '@/services/workspaceService';
import { toast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type UseNotesResult = ReturnType<typeof useNotes>;

// User color utilities
const userColors = ['#FF6B35', '#F7931E', '#FFD23F', '#06FFA5', '#118AB2', '#073B4C', '#7209B7', '#F72585'];

const getUserColor = (authorId: string | undefined) => {
  if (!authorId) return userColors[0];
  let hash = 0;
  for (let i = 0; i < authorId.length; i++) hash = authorId.charCodeAt(i) + ((hash << 5) - hash);
  return userColors[Math.abs(hash) % userColors.length];
};

// NoteCard component - moved outside to prevent re-renders
const NoteCard = memo(({ 
  note, 
  isReply = false, 
  userId, 
  replyTo, 
  setReplyTo, 
  replyInput, 
  setReplyInput, 
  editingNoteId, 
  setEditingNoteId, 
  editInput, 
  setEditInput, 
  setNoteIdToDelete, 
  handleReply, 
  handleEditNote 
}: { 
  note: Note; 
  isReply?: boolean;
  userId: string;
  replyTo: string | null;
  setReplyTo: (id: string | null) => void;
  replyInput: string;
  setReplyInput: (value: string) => void;
  editingNoteId: string | null;
  setEditingNoteId: (id: string | null) => void;
  editInput: string;
  setEditInput: (value: string) => void;
  setNoteIdToDelete: (id: string | null) => void;
  handleReply: (noteId: string) => void;
  handleEditNote: (noteId: string) => void;
}) => {
  const isAuthor = String(note.authorId || '') === String(userId || '');
  
  return (
    <div className={`p-3 flex flex-col gap-1 rounded-lg bg-black/20 backdrop-blur-sm border border-white/10 shadow-lg ${isReply ? 'ml-8 mt-2' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold text-sm text-primary-foreground bg-primary/70 rounded px-2 py-0.5" style={{ backgroundColor: getUserColor(note.authorId) }}>
          {note.authorName}
        </span>
        <span className="text-xs text-muted-foreground">{formatDate(note.createdAt, 'PPpp')}</span>
      </div>
      {editingNoteId === note.id ? (
        <div className="flex gap-2 items-center">
          <Input
            value={editInput}
            onChange={e => setEditInput(e.target.value)}
            className="flex-1 text-sm text-muted-foreground"
            onKeyDown={e => { if (e.key === 'Enter') handleEditNote(note.id); }}
            autoFocus
          />
          <Button size="sm" onClick={() => handleEditNote(note.id)} className="hover-shimmer">
            <Send className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditingNoteId(null)} className="hover-shimmer">
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-base flex-1 break-words">{note.content}</span>
          <div className="flex items-center">
            {isAuthor && (
              <>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => { 
                    setEditingNoteId(note.id); 
                    setEditInput(note.content); 
                  }} 
                  className="hover-shimmer"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => setNoteIdToDelete(note.id)} 
                  className="hover-shimmer text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => {
                setReplyTo(replyTo === note.id ? null : note.id);
                if (replyTo !== note.id) {
                  setReplyInput('');
                }
              }} 
              className="hover-shimmer"
            >
              <CornerDownRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {replyTo === note.id && (
        <div className="flex gap-2 mt-2">
          <Input
            value={replyInput}
            onChange={e => setReplyInput(e.target.value)}
            placeholder={`Reply to ${note.authorName}`}
            className="flex-1 text-sm text-muted-foreground"
            onKeyDown={e => { 
              if (e.key === 'Enter' && replyInput.trim()) {
                handleReply(note.id);
              }
            }}
            autoFocus
          />
          <Button 
            onClick={() => handleReply(note.id)} 
            size="sm" 
            className="hover-shimmer"
            disabled={!replyInput.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button 
            onClick={() => {
              setReplyTo(null);
              setReplyInput('');
            }} 
            size="sm" 
            variant="outline" 
            className="hover-shimmer"
          >
            Cancel
          </Button>
        </div>
      )}
      {note.replies && note.replies.map(reply => (
        <NoteCard 
          key={reply.id} 
          note={reply} 
          isReply={true}
          userId={userId}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          replyInput={replyInput}
          setReplyInput={setReplyInput}
          editingNoteId={editingNoteId}
          setEditingNoteId={setEditingNoteId}
          editInput={editInput}
          setEditInput={setEditInput}
          setNoteIdToDelete={setNoteIdToDelete}
          handleReply={handleReply}
          handleEditNote={handleEditNote}
        />
      ))}
    </div>
  );
});

NoteCard.displayName = 'NoteCard';

interface ProjectDetailsContentProps {
  project: Project;
  isLoggedIn: boolean;
  onEdit: () => void;
  onPin: () => void;
  isPinned: boolean;
  autoRefresh: boolean;
  onToggleAutoRefresh: (enabled: boolean) => void;
  onCreateOrNavigateMoodboard?: (project: Project) => void;
  onCreateOrNavigateWhiteboard?: (project: Project) => void;
  onBack: () => void;
}

export function ProjectDetailsContent({ 
  project, 
  isLoggedIn, 
  onEdit, 
  onPin, 
  isPinned, 
  autoRefresh, 
  onToggleAutoRefresh,
  onCreateOrNavigateMoodboard,
  onCreateOrNavigateWhiteboard,
  onBack 
}: ProjectDetailsContentProps) {
  const [lightboxState, setLightboxState] = useState<{ media: ProjectMedia[]; index: number } | null>(null);
  const [commentingImage, setCommentingImage] = useState<ProjectMedia | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [hasMoodboard, setHasMoodboard] = useState(false);
  const [hasWhiteboard, setHasWhiteboard] = useState(false);
  
  // Notes state
  const {
    notes,
    noteInput,
    setNoteInput,
    handleAddNote,
    handleEditNote,
    handleConfirmDelete,
    handleReply,
    replyTo,
    setReplyTo,
    replyInput,
    setReplyInput,
    editingNoteId,
    setEditingNoteId,
    editInput,
    setEditInput,
    noteIdToDelete,
    setNoteIdToDelete
  }: UseNotesResult = useNotes(project.id);
  
  // User info
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || 'demo-user' : 'demo-user';

  // Create memoized handlers to prevent re-renders
  const handleReplyMemo = useCallback((noteId: string) => {
    handleReply(noteId);
  }, [handleReply]);

  const handleEditNoteMemo = useCallback((noteId: string) => {
    handleEditNote(noteId);
  }, [handleEditNote]);

  // Add handlers
  const handleCreateMoodboard = async () => {
    try {
      // Show loading toast
      toast({
        title: "Creating moodboard...",
        description: "Please wait while we set up your moodboard.",
      });
      
      // Fallback to local implementation
      const result = await workspaceService.createWorkspaceForProject(project.id, 'moodboard');
      setHasMoodboard(true);
      
      // Provide feedback on success
      toast({
        title: result.isNew ? "Moodboard created" : "Existing moodboard found",
        description: result.message,
      });
      
      // Offer navigation to moodboards tab
      toast({
        title: "Ready to view",
        description: "Click here to go to the Moodboards tab",
        action: (
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => {
              // Navigate to the moodboards tab
              const indexComponent = document.querySelector('[data-viewmode="moodboards"]');
              if (indexComponent) {
                (indexComponent as HTMLButtonElement).click();
              } else {
                // Fallback - dispatch event for the Index component
                const event = new CustomEvent('navigate', {
                  detail: { viewMode: 'moodboards', workspaceId: result.workspace.id }
                });
                window.dispatchEvent(event);
              }
            }}
            className="button-primary-enhanced hover-shimmer cyrus-ui"
          >
            View Moodboards
          </Button>
        ),
        duration: 10000, // Give them 10 seconds to click
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to create moodboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateWhiteboard = async () => {
    try {
      // Show loading toast
      toast({
        title: "Creating whiteboard...",
        description: "Please wait while we set up your whiteboard.",
      });
      
      // Fallback to local implementation
      const result = await workspaceService.createWorkspaceForProject(project.id, 'whiteboard');
      setHasWhiteboard(true);
      
      // Provide feedback on success
      toast({
        title: result.isNew ? "Whiteboard created" : "Existing whiteboard found",
        description: result.message,
      });
      
      // Offer navigation to whiteboards tab
      toast({
        title: "Ready to view",
        description: "Click here to go to the Whiteboards tab",
        action: (
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => {
              // Navigate to the whiteboards tab
              const indexComponent = document.querySelector('[data-viewmode="whiteboards"]');
              if (indexComponent) {
                (indexComponent as HTMLButtonElement).click();
              } else {
                // Fallback - dispatch event for the Index component
                const event = new CustomEvent('navigate', {
                  detail: { viewMode: 'whiteboards', workspaceId: result.workspace.id }
                });
                window.dispatchEvent(event);
              }
            }}
            className="button-primary-enhanced hover-shimmer cyrus-ui"
          >
            View Whiteboards
          </Button>
        ),
        duration: 10000, // Give them 10 seconds to click
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to create whiteboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Media categorization
  const mediaByCategory = useMemo(() => {
    // Add null check and default to empty array
    const projectMedia = project.media || [];
    const allMedia = { 'All': projectMedia };
    const categorized = projectMedia.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    }, {} as Record<MediaCategory, ProjectMedia[]>);
    return { ...allMedia, ...categorized };
  }, [project.media]);

  const mediaCategories = Object.keys(mediaByCategory) as (MediaCategory | 'All')[];
  const [activeTab, setActiveTab] = useState<MediaCategory | 'All' | undefined>(mediaCategories[0]);

  useEffect(() => {
    if (mediaCategories.length > 0 && !mediaCategories.includes(activeTab as MediaCategory | 'All')) {
      setActiveTab(mediaCategories[0]);
    }
  }, [mediaCategories, activeTab]);

  // Main render
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="glass-card p-6 rounded-lg shadow-lg">
        {/* Header with Title and Status */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4 md:w-1/2">
            <Button variant="ghost" size="sm" onClick={onBack} className="hover-shimmer cyrus-ui">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">{project.name}</h1>
          </div>
          
          <div className="flex items-center gap-3 md:w-1/2 justify-end">
            {isLoggedIn && (
              <>
                <Button 
                  onClick={handleCreateMoodboard} 
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 hover-shimmer ${hasMoodboard ? 'bg-primary text-primary-foreground' : ''}`}
                >
                  <Palette className="h-4 w-4 text-purple-500" />
                </Button>
                <Button 
                  onClick={handleCreateWhiteboard}
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 hover-shimmer ${hasWhiteboard ? 'bg-primary text-primary-foreground' : ''}`}
                >
                  <PenTool className="h-4 w-4 text-green-500" />
                </Button>
                <Button onClick={onPin} variant="outline" className="hover-shimmer">
                  <Pin className={cn("h-4 w-4", isPinned && "fill-foreground")} />
                </Button>
                <Button onClick={onEdit} variant="outline" className="hover-shimmer cyrus-ui">Edit Project</Button>
              </>
            )}
            
            {/* Status Badge - Using same styling as Monday view */}
            <Select value={project.status} onValueChange={(value) => {}}>
              <SelectTrigger className={`w-full max-w-[190px] py-1 px-3 text-xs font-medium hover-shimmer border-l-4 ${getStatusBorderColorClass(project.status)}`}>
                <SelectValue>
                  {projectStatuses.find((opt) => opt.value === project.status)?.label || project.status}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {projectStatuses.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Project details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">Created by: <span className="font-medium">{project.createdBy || localStorage.getItem('userDisplayName') || 'Unknown'}</span></span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                <span>Client: <span className="font-medium">{project.client}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <span>PM: <span className="font-medium">{project.projectManager || 'Not assigned'}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span>Artists: <span className="font-medium">{project.artists.map(a => a.name).join(', ')}</span></span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">Start: <span className="font-medium">{formatDate(project.startDate)}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">End: <span className="font-medium">{formatDate(project.endDate)}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">Priority: <Badge variant="outline" className={cn(
                "font-medium",
                project.priority === 'high' ? "text-red-500" :
                project.priority === 'medium' ? "text-amber-500" : "text-green-500"
              )}>{project.priority}</Badge></span>
            </div>
            
            {/* Status History moved to left column */}
            {project.statusHistory && Array.isArray(project.statusHistory) && project.statusHistory.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CornerDownRight className="h-5 w-5 text-muted-foreground" />
                  Status History
                </h3>
                <div className="space-y-2">
                  {project.statusHistory.map((history, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-md bg-card/50 backdrop-blur-sm border">
                      <div>
                        <span className="font-medium">{history.status}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{formatDate(history.date, 'PPpp')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Brief & Notes
              </h2>
              <div className="p-4 bg-card/50 backdrop-blur-sm rounded-md border">
                {project.brief ? (
                  <p className="whitespace-pre-wrap">{project.brief}</p>
                ) : (
                  <p className="text-muted-foreground italic">No brief provided</p>
                )}
                <Separator className="my-4" />
                {/* Notes Section */}
                <div className="mt-4">
                  <div className="font-semibold text-base mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" /> Project Notes
                    </div>
                    <RefreshToggle 
                      autoRefresh={autoRefresh}
                      onToggle={onToggleAutoRefresh}
                    />
                  </div>
                  {isLoggedIn && (
                    <div className="flex gap-2 mb-4">
                      <Input
                        value={noteInput}
                        onChange={e => setNoteInput(e.target.value)}
                        placeholder="Write a note..."
                        className="flex-1"
                        onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); }}
                      />
                      <Button onClick={handleAddNote} size="sm"><Send className="h-4 w-4" /></Button>
                    </div>
                  )}
                  <div className="space-y-3">
                    {notes.length === 0 && <div className="text-muted-foreground text-sm">No notes yet.</div>}
                    {notes.map(note => (
                      <NoteCard 
                        key={note.id} 
                        note={note}
                        userId={userId}
                        replyTo={replyTo}
                        setReplyTo={setReplyTo}
                        replyInput={replyInput}
                        setReplyInput={setReplyInput}
                        editingNoteId={editingNoteId}
                        setEditingNoteId={setEditingNoteId}
                        editInput={editInput}
                        setEditInput={setEditInput}
                        setNoteIdToDelete={setNoteIdToDelete}
                        handleReply={handleReplyMemo}
                        handleEditNote={handleEditNoteMemo}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {project.externalLinks && project.externalLinks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2">External Links</h2>
            <div className="grid gap-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
              {project.externalLinks.map((link, index) => (
                <a 
                  key={index} 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-card/50 backdrop-blur-sm rounded-md border hover:bg-card/80 transition-colors hover-shimmer"
                >
                  {link.name || link.url}
                </a>
              ))}
            </div>
          </div>
        )}

        {(project.media && Array.isArray(project.media) && project.media.length > 0) && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Media</h2>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MediaCategory | 'All')} className="w-full">
              <div className="flex items-center justify-between mb-4 w-full">
                <TabsList className="rounded-full bg-muted/20 px-2 py-1">
                  {mediaCategories.map(cat => (
                    <TabsTrigger key={cat} value={cat} className="hover-shimmer">{cat}</TabsTrigger>
                  ))}
                </TabsList>
                {project.videoUrl && (
                  <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setIsVideoModalOpen(true); }} className="flex items-center gap-2 hover-shimmer ml-4">
                    <Video className="h-5 w-5" />
                    <span className="text-xs font-medium">Watch Me</span>
                  </Button>
                )}
              </div>
              {mediaCategories.map(cat => (
                <TabsContent key={cat} value={cat}>
                  <ImageSlider 
                    media={mediaByCategory[cat]} 
                    categoryName={cat} 
                    onImageClick={(index) => setLightboxState({ media: mediaByCategory[cat], index })}
                    onCommentClick={(media) => setCommentingImage(media)}
                  />
                </TabsContent>
              ))}
            </Tabs>
            {project.videoUrl && (
              <Dialog open={!!isVideoModalOpen} onOpenChange={(open) => { if (!open) setIsVideoModalOpen(false); }}>
                <DialogContent className="max-w-3xl h-[60vh] p-0 bg-black" onClick={e => e.stopPropagation()}>
                  <DialogTitle className="sr-only">YouTube Video Player</DialogTitle>
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${getYouTubeVideoId(project.videoUrl) || ''}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}

        <AlertDialog open={noteIdToDelete !== null} onOpenChange={(open) => !open && setNoteIdToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this note and any replies to it.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
              </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {lightboxState && (
          <LightboxModal
            media={lightboxState.media}
            initialIndex={lightboxState.index}
            onClose={() => setLightboxState(null)}
          />
        )}
        
        {/* Workspace View - Full Screen Overlay */}
        {/* showWorkspaces && (
          <div className="fixed inset-0 z-50 bg-background">
            <WorkspaceContainer
              project={project}
              userId={userId}
              userName={typeof window !== 'undefined' ? localStorage.getItem('userName') || 'Demo User' : 'Demo User'}
              onBack={() => setShowWorkspaces(false)}
            />
          </div>
        ) */}

        {/* Filestage Comments Dialog */}
        {commentingImage && (
          <Dialog open={!!commentingImage} onOpenChange={(open) => !open && setCommentingImage(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogTitle>Image Comments - {commentingImage.filename}</DialogTitle>
              <FilestageComments
                imageUrl={commentingImage.url}
                imageAlt={commentingImage.filename}
                projectId={project.id}
                mediaId={commentingImage.id}
                userId={userId}
                userName={typeof window !== 'undefined' ? localStorage.getItem('userName') || 'Demo User' : 'Demo User'}
                comments={[]}
                onAddComment={(comment) => {
                  console.log('New comment:', comment);
                  // Here you would save the comment to your backend
                  // For now, just log it
                }}
                onResolveComment={(commentId) => {
                  console.log('Resolve comment:', commentId);
                  // Here you would mark the comment as resolved in your backend
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
} 