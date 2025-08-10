import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Copy, Trash2, X } from 'lucide-react';
import { ProjectMedia } from '@/types/project';
import { useToast } from '@/hooks/use-toast';
import { Image } from '@/types/workspace';

// Create a union type to support both single image mode and gallery mode
interface BaseLightboxProps {
  onClose: () => void;
}

interface LightboxMediaGalleryProps extends BaseLightboxProps {
  media: ProjectMedia[];
  initialIndex: number;
  onDelete?: (mediaId: string) => void;
  src?: never; // Not used in gallery mode
  alt?: never; // Not used in gallery mode
}

interface LightboxSingleImageProps extends BaseLightboxProps {
  src: string;
  alt: string;
  media?: never; // Not used in single mode
  initialIndex?: never; // Not used in single mode
  onDelete?: never; // Not used in single mode
}

export type LightboxModalProps = LightboxMediaGalleryProps | LightboxSingleImageProps;

export function LightboxModal(props: LightboxModalProps) {
  const { onClose } = props;
  const { toast } = useToast();

  // Handle gallery mode
  const [currentIndex, setCurrentIndex] = useState(props.initialIndex || 0);

  useEffect(() => {
    if ('initialIndex' in props && props.initialIndex !== undefined) {
      setCurrentIndex(props.initialIndex);
    }
  }, [props]);

  // Determine if we're in single image mode or gallery mode
  const isSingleMode = 'src' in props && props.src !== undefined;

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: "The image link has been copied to your clipboard.",
    });
  };

  const handleDelete = (mediaId: string) => {
    if (!isSingleMode && props.onDelete) {
      props.onDelete(mediaId);
      toast({
        title: "Media deleted",
        description: "The media file has been removed from the project.",
      });
    }
    onClose();
  };

  const navigateMedia = (direction: 'prev' | 'next') => {
    if (isSingleMode || !props.media) return;
    
    if (direction === 'prev') {
      setCurrentIndex(currentIndex > 0 ? currentIndex - 1 : props.media.length - 1);
    } else {
      setCurrentIndex(currentIndex < props.media.length - 1 ? currentIndex + 1 : 0);
    }
  };

  // In single image mode, just return a simple lightbox
  if (isSingleMode) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="relative flex items-center justify-center min-h-[70vh] bg-background/95">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 z-10 bg-background/80 hover:bg-background"
              onClick={e => { e.stopPropagation(); onClose(); }}
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Main Image */}
            <div className="flex items-center justify-center w-full h-full p-8">
              <img
                src={props.src}
                alt={props.alt}
                className="max-w-full max-h-[85vh] object-contain"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Early return if no media in gallery mode
  if (!props.media || props.media.length === 0) return null;

  const currentMedia = props.media[currentIndex];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="relative flex items-center justify-center min-h-[70vh] bg-background/95">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 z-10 bg-background/80 hover:bg-background"
            onClick={e => { e.stopPropagation(); onClose(); }}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Navigation Buttons */}
          {props.media.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background"
                onClick={e => { e.stopPropagation(); navigateMedia('prev'); }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background"
                onClick={e => { e.stopPropagation(); navigateMedia('next'); }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Main Image */}
          <div className="flex items-center justify-center w-full h-full p-8">
            <img
              src={currentMedia.url}
              alt={currentMedia.filename}
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-4 flex justify-between items-center">
            <div className="flex gap-2 items-center">
              <Badge variant="outline" className="bg-background/50">
                {currentIndex + 1} / {props.media.length}
              </Badge>
              <Badge variant="secondary">
              {currentMedia.type}
            </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyLink(currentMedia.url)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              {props.onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(currentMedia.id)}
              >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
              </Button>
            )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}