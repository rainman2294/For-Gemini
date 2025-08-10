import { UploadCloud, X, Library } from 'lucide-react';
import { Button } from './ui/button';
import { ProjectMedia, MediaCategory } from '@/types/project';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const mediaCategories: { value: MediaCategory; label: string }[] = [
  { value: 'Final Render', label: 'Final Render' },
  { value: 'Clay Render', label: 'Clay Render' },
  { value: 'Client Reference', label: 'Client Reference' },
  { value: 'Concept', label: 'Concept' },
  { value: 'Other', label: 'Other' },
];

interface MediaUploaderProps {
  media: ProjectMedia[];
  onMediaAdd: (files: FileList) => void;
  onMediaRemove: (id: string) => void;
  onShowMediaLibrary: () => void;
  showLibraryButton: boolean;
  onMediaCategoryChange: (id: string, type: MediaCategory) => void;
}

export function MediaUploader({ media, onMediaAdd, onMediaRemove, onShowMediaLibrary, showLibraryButton, onMediaCategoryChange }: MediaUploaderProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onMediaAdd(e.target.files);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors hover-shimmer">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
            <p className="mb-1 text-sm text-muted-foreground">Upload from Computer</p>
        </div>
          <input type="file" className="hidden" multiple onChange={handleFileChange} />
        </label>

        {showLibraryButton && (
          <button
            type="button"
            onClick={onShowMediaLibrary}
            className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors hover-shimmer"
        >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Library className="w-8 h-8 mb-2 text-muted-foreground" />
              <p className="mb-1 text-sm text-muted-foreground">Choose from Library</p>
        </div>
          </button>
        )}
      </div>

      {media.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Uploaded Media</h4>
          <div className="grid grid-cols-3 gap-4">
            {media.map((item) => (
              <div key={item.id} className="relative group flex flex-col items-center" style={{ borderRadius: 15, overflow: 'visible' }}>
                <div className="relative w-full" style={{ borderRadius: 15, overflow: 'hidden' }}>
                  <img
                    src={item.url}
                    alt={item.filename}
                    className="w-full h-32 object-cover"
                    style={{ borderRadius: 15 }}
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute -top-3 -right-3 z-20 h-8 w-8 p-0 flex items-center justify-center shadow-lg hover-shimmer"
                  onClick={() => onMediaRemove(item.id)}
                >
                  <X className="h-5 w-5" />
                </Button>
                <div className="w-full text-xs text-center text-muted-foreground bg-transparent pt-2 pb-1 truncate">
                  {item.filename}
                </div>
                <div className="w-full mt-1 flex justify-center">
                  <Select value={item.type} onValueChange={(value) => onMediaCategoryChange(item.id, value as MediaCategory)}>
                    <SelectTrigger className="w-60 h-10 text-xs hover-shimmer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mediaCategories.map(mc => <SelectItem key={mc.value} value={mc.value}>{mc.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}