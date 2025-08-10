import { useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProjectMedia, MediaCategory } from '@/types/project';

interface ImageSliderProps {
  media: ProjectMedia[];
  categoryName: MediaCategory | 'All';
  onImageClick?: (index: number) => void;
  onCommentClick?: (media: ProjectMedia) => void;
}

export function ImageSlider({ media, categoryName, onImageClick, onCommentClick }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (media.length === 0) {
    return (
      <div className="h-48 bg-muted/50 rounded-lg flex items-center justify-center border-2 border-dashed">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm font-semibold">No media in this category</p>
        </div>
      </div>
    );
  }

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => prev > 0 ? prev - 1 : media.length - 1);
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => prev < media.length - 1 ? prev + 1 : 0);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageClick?.(currentIndex);
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCommentClick?.(media[currentIndex]);
  };

  return (
    <div className="relative group w-full h-48 cyrus-image-slider" onClick={(e) => e.stopPropagation()}>
      <div 
        className="w-full h-full bg-background rounded-lg overflow-hidden cursor-pointer cyrus-image-container"
        onClick={handleImageClick}
      >
        <img
          src={media[currentIndex].url}
          alt={media[currentIndex].filename}
          className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {media.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
            onClick={goToNext}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </>
      )}

      <div className="absolute top-2 left-2 flex items-center gap-2">
        <Badge className="text-xs bg-black/60 text-white border-transparent">
          {categoryName === 'All' ? media[currentIndex].type : categoryName}
        </Badge>
      </div>

      {/* Comments Button */}
      {onCommentClick && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-blue-500/80 hover:bg-blue-600/90 text-white rounded-full h-8 px-3"
          onClick={handleCommentClick}
        >
          <MessageCircle className="h-3 w-3 mr-1" />
          <span className="text-xs">Comments</span>
        </Button>
      )}

      {media.length > 1 && (
        <div className="absolute bottom-2 right-2 bg-black/60 text-white rounded-full px-2 py-0.5 text-xs font-mono">
          {currentIndex + 1} / {media.length}
        </div>
      )}
    </div>
  );
}