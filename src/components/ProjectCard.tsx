import { useState, useMemo, useEffect } from 'react';
import { Calendar, Edit, Users, MoreVertical, Archive, ArchiveRestore, Trash2, Link, Video, MapPin, Maximize2, Minimize2, Palette, PenTool } from 'lucide-react';
import { Project, ProjectStatus, LinkType, MediaCategory, ExternalLink, ProjectMedia } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Timeline } from './Timeline';
import { ImageSlider } from './ImageSlider';
import { LightboxModal } from './LightboxModal';
import { projectStatuses, getStatusBorderColorClass } from '@/lib/statuses';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { cn, getYouTubeVideoId, formatDate } from '@/lib/utils';
import { getPriorityColor, getStatusBadgeColor } from '@/lib/statuses';
import { workspaceService } from '@/services/workspaceService';
import { useToast } from '@/components/ui/use-toast';

interface ProjectCardProps {
  project: Project;
  isCompact: boolean;
  onStatusChange: (newStatus: ProjectStatus) => void;
  onEdit: (project: Project) => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  isLoggedIn: boolean;
  onClick?: () => void;
}

const getLinkIcon = () => {
  return <Link className="h-4 w-4" />;
};

const YouTubeEmbed = ({ url }: { url: string }) => {
  const videoId = getYouTubeVideoId(url) || '';

  if (!videoId) return <p className="text-white p-4">Invalid or unsupported YouTube URL</p>;
  
  return (
    <iframe
      width="100%"
      height="100%"
      src={`https://www.youtube.com/embed/${videoId}`}
      title="YouTube video player"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    ></iframe>
  );
};

export function ProjectCard({ project, isCompact, onStatusChange, onEdit, onArchive, onRestore, onDelete, isLoggedIn, onClick }: ProjectCardProps) {
  const [lightboxState, setLightboxState] = useState<{ media: ProjectMedia[]; index: number } | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isIndividuallyExpanded, setIsIndividuallyExpanded] = useState(false);
  const [hasMoodboard, setHasMoodboard] = useState(false);
  const [hasWhiteboard, setHasWhiteboard] = useState(false);
  const { toast } = useToast();
  
  const mediaByCategory = useMemo(() => {
    const media = project.media || [];
    const allMedia = { 'All': media };
    const categorized = media.reduce((acc, item) => {
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

  const handleImageClick = (media: ProjectMedia[], index: number) => {
    setLightboxState({ media, index });
  };

  const handleMoodboardClick = async (e) => {
    e.stopPropagation();
    try {
      // Show loading toast
      toast({
        title: "Creating moodboard...",
        description: "Please wait while we set up your moodboard.",
      });
      
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
      console.error('Failed to handle moodboard:', error);
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to create moodboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleWhiteboardClick = async (e) => {
    e.stopPropagation();
    try {
      // Show loading toast
      toast({
        title: "Creating whiteboard...",
        description: "Please wait while we set up your whiteboard.",
      });
      
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
      console.error('Failed to handle whiteboard:', error);
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to create whiteboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div 
      className={cn("glass-card p-4 sm:p-6 relative group", 
        project.isArchived && "opacity-75",
        onClick && "cursor-pointer hover:shadow-lg transition-shadow"
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {isCompact ? (
        // Compact View
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-3 h-3 rounded-full ${getPriorityColor(project.priority)} flex-shrink-0`} />
            <h3 className="text-base font-semibold text-foreground truncate" title={project.name}>{project.name}</h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 w-1/2 justify-end">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={isIndividuallyExpanded ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); setIsIndividuallyExpanded(!isIndividuallyExpanded); }}
                            className="h-8 w-8 hover-shimmer"
                            aria-label={isIndividuallyExpanded ? 'Shrink card' : 'Expand card'}
                        >
                            {isIndividuallyExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{isIndividuallyExpanded ? 'Shrink' : 'Expand'}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <Button variant="ghost" size="icon" onClick={handleMoodboardClick} className={`h-8 w-8 hover-shimmer ${hasMoodboard ? 'bg-primary text-primary-foreground' : ''}`}>
                <Palette className="h-4 w-4 text-purple-500" />
                <span className="sr-only">Moodboard</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleWhiteboardClick} className={`h-8 w-8 hover-shimmer ${hasWhiteboard ? 'bg-primary text-primary-foreground' : ''}`}>
                <PenTool className="h-4 w-4 text-green-500" />
                <span className="sr-only">Whiteboard</span>
            </Button>
            <Select value={project.status} onValueChange={(value: ProjectStatus) => onStatusChange(value)}>
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
             {isLoggedIn && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="hover-shimmer cyrus-ui h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem key="edit" onClick={() => onEdit(project)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                    {project.isArchived 
                      ? <DropdownMenuItem key="restore" onClick={onRestore}><ArchiveRestore className="h-4 w-4 mr-2" />Restore</DropdownMenuItem>
                      : <DropdownMenuItem key="archive" onClick={onArchive}><Archive className="h-4 w-4 mr-2" />Archive</DropdownMenuItem>
                    }
                    <DropdownMenuItem key="delete" onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      ) : (
        // List View (Default)
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 gap-4">
          <div className="flex-1 md:w-1/2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
              <div className={`w-3 h-3 rounded-full ${getPriorityColor(project.priority)}`} />
              <h3 className="text-lg md:text-xl font-semibold text-foreground">{project.name}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground md:pl-7">
              <span><span className="font-semibold">Client:</span> {project.client}</span>
              <span><span className="font-semibold">PM:</span> {project.projectManager}</span>
              <div className="flex items-center gap-1.5"><Users className="h-4 w-4" /><span>{(project.artists || []).map(a => a.name).join(', ')}</span></div>
            </div>
          </div>
          
          <div className="flex items-start gap-2 md:w-1/2 justify-end">
            <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleMoodboardClick}
                  className={`h-8 w-8 hover-shimmer ${hasMoodboard ? 'bg-primary text-primary-foreground' : ''}`}
                >
                  <Palette className="h-4 w-4 text-purple-500" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleWhiteboardClick}
                  className={`h-8 w-8 hover-shimmer ${hasWhiteboard ? 'bg-primary text-primary-foreground' : ''}`}
                >
                  <PenTool className="h-4 w-4 text-green-500" />
                </Button>
                
                <Select value={project.status} onValueChange={(value: ProjectStatus) => onStatusChange(value)}>
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

            {isLoggedIn && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="hover-shimmer cyrus-ui"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem key="edit" onClick={() => onEdit(project)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                  {project.isArchived 
                    ? <DropdownMenuItem key="restore" onClick={onRestore}><ArchiveRestore className="h-4 w-4 mr-2" />Restore</DropdownMenuItem>
                    : <DropdownMenuItem key="archive" onClick={onArchive}><Archive className="h-4 w-4 mr-2" />Archive</DropdownMenuItem>
                  }
                  <DropdownMenuItem key="delete" onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      {!isCompact || isIndividuallyExpanded ? (
        <>
          {project.brief && <p className="text-muted-foreground mb-4 leading-relaxed"><span className="font-semibold">Brief:</span> {project.brief}</p>}
          
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4 text-sm text-muted-foreground">
            {isLoggedIn && project.externalLinks && project.externalLinks.length > 0 && (
              <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
                {project.externalLinks.map((link) => (
                  <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover-shimmer" onClick={e => e.stopPropagation()}>
                    {getLinkIcon()}
                    <span className="text-xs font-medium">{link.name}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

                      {((project.media && project.media.length > 0) || project.videoUrl) && (
            <div className="mb-4 group/slider">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MediaCategory | 'All')} className="w-full">
                <div className="flex items-center border-b">
                  <TabsList className="bg-transparent border-none p-0">
                    {mediaCategories.map(cat => (
                      <TabsTrigger key={cat} value={cat} className="text-muted-foreground data-[state=active]:text-primary data-[state=active]:shadow-none hover-shimmer" onClick={e => e.stopPropagation()}>
                        {cat}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {project.videoUrl && (
                       <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setIsVideoModalOpen(true); }} className="ml-auto flex items-center gap-2 hover-shimmer">
                            <Video className="h-5 w-5" />
                            <span className="text-xs font-medium">Watch Me</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Watch Video</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                {mediaCategories.map(cat => (
                  <TabsContent key={cat} value={cat} className="mt-4">
                    <div onClick={(e) => {
                      e.stopPropagation();
                    }}>
                      <ImageSlider 
                        media={mediaByCategory[cat]} 
                        categoryName={cat} 
                        onImageClick={(index) => {
                          handleImageClick(mediaByCategory[cat], index);
                        }}
                      />
                    </div>
                  </TabsContent>
                ))}
                {mediaCategories.length === 0 && project.videoUrl && (
                   <div className="mt-4 flex justify-center items-center h-48 bg-muted/50 rounded-lg border-2 border-dashed">
                      <Button variant="outline" onClick={() => setIsVideoModalOpen(true)} className="hover-shimmer">
                        <Video className="h-5 w-5 mr-2" />
                        Watch Project Video
                      </Button>
                   </div>
                )}
              </Tabs>
            </div>
          )}
        </>
      ) : null}

      <Timeline project={project} isCompact={isCompact && !isIndividuallyExpanded} />

      {lightboxState && (
        <LightboxModal 
          media={lightboxState.media}
          initialIndex={lightboxState.index}
          onClose={() => setLightboxState(null)}
        />
      )}
      
      {project.videoUrl && (
        <Dialog open={isVideoModalOpen} onOpenChange={(open) => { if (!open) setIsVideoModalOpen(false); }}>
          <DialogContent className="max-w-3xl h-[60vh] p-0 bg-black" onClick={e => e.stopPropagation()}>
            <VisuallyHidden asChild>
              <DialogTitle>YouTube Video Player</DialogTitle>
            </VisuallyHidden>
            <YouTubeEmbed url={project.videoUrl} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}