import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: WPMedia[]) => void;
  mediaUrl: string;
  nonce: string;
}

interface WPMedia {
  id: number;
  source_url: string;
  alt_text: string;
  media_details: {
    sizes: {
      thumbnail: {
        source_url: string;
      };
    };
  };
}

export function MediaLibraryModal({ isOpen, onClose, onSelect, mediaUrl, nonce }: MediaLibraryModalProps) {
  const [selectedMedia, setSelectedMedia] = useState<WPMedia[]>([]);

  const { data: mediaItems = [], isLoading } = useQuery<WPMedia[]>({
    queryKey: ['wp-media'],
    queryFn: async () => {
      const response = await fetch(`${mediaUrl}?per_page=100`, {
        headers: {
          'X-WP-Nonce': nonce,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch media library');
      }
      return response.json();
    },
    enabled: isOpen, // Only fetch when the modal is open
  });

  const toggleSelection = (media: WPMedia) => {
    setSelectedMedia(prev =>
      prev.some(item => item.id === media.id)
        ? prev.filter(item => item.id !== media.id)
        : [...prev, media]
    );
  };

  const handleSelect = () => {
    onSelect(selectedMedia);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setSelectedMedia([]);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>WordPress Media Library</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full">
          {isLoading ? (
            <p>Loading media...</p>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 p-4">
              {mediaItems.map((item: WPMedia) => {
                const isSelected = selectedMedia.some(m => m.id === item.id);
                return (
                  <div
                    key={item.id}
                    className="relative aspect-square cursor-pointer group"
                    onClick={() => toggleSelection(item)}
                  >
                    <img
                      src={item.media_details?.sizes?.thumbnail?.source_url || item.source_url}
                      alt={item.alt_text}
                      className="w-full h-full object-cover rounded-md transition-transform group-hover:scale-105"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Check className="h-8 w-8 text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="hover-shimmer">Cancel</Button>
          <Button onClick={handleSelect} disabled={selectedMedia.length === 0} className="hover-shimmer">
            Select {selectedMedia.length > 0 ? `(${selectedMedia.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 