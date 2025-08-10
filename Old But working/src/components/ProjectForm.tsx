import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Project, ProjectPriority, ProjectMedia, LinkType, MediaCategory, ExternalLink, Artist } from '@/types/project';
import { MediaUploader } from './MediaUploader';
import { MediaLibraryModal } from './MediaLibraryModal';
import { useToast } from '@/hooks/use-toast';
import { useMockApi } from '@/lib/mockApi';
import { isValidUrl } from '@/lib/utils';

interface ProjectFormProps {
  onClose: () => void;
  onSubmit: (project: Omit<Project, 'id' | 'statusHistory' | 'createdAt' | 'updatedAt'>) => void;
  project?: Project;
  isLoggedIn: boolean;
}

const initialFormData: Omit<Project, 'id' | 'statusHistory' | 'createdAt' | 'updatedAt'> = {
  name: '',
  client: '',
  projectManager: '',
  artists: [],
  brief: '',
  externalLinks: [],
  startDate: '',
  endDate: '',
  priority: 'medium' as ProjectPriority,
  status: 'preview',
  media: [],
  videoUrl: '',
  isArchived: false,
};

const linkTypes: { value: LinkType; label: string }[] = [
  { value: 'google-drive', label: 'Google Drive' },
  { value: 'google-sheets', label: 'Google Sheets' },
  { value: 'google-maps', label: 'Google Maps' },
  { value: 'dropbox', label: 'Dropbox' },
  { value: 'filestage', label: 'Filestage' },
  { value: 'other', label: 'Other' },
];

const mediaCategories: { value: MediaCategory; label: string }[] = [
  { value: 'Final Render', label: 'Final Render' },
  { value: 'Clay Render', label: 'Clay Render' },
  { value: 'Client Reference', label: 'Client Reference' },
  { value: 'Concept', label: 'Concept' },
  { value: 'Other', label: 'Other' },
];

export function ProjectForm({ onClose, onSubmit, project, isLoggedIn }: ProjectFormProps) {
  const { toast } = useToast();
  const shouldMock = useMockApi();
  const [formData, setFormData] = useState(initialFormData);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const showLibraryButton = !shouldMock || (typeof window !== 'undefined' && 'pulse2' in window);
  // Get the API config from the window object
  const apiConfig = typeof window !== 'undefined' && 'pulse2' in window 
    ? window.pulse2 
    : { mediaUrl: '', nonce: '' };

  useEffect(() => {
    if (project) {
      setFormData({
        ...project,
        videoUrl: project.videoUrl || '',
      });
    } else {
      setFormData(initialFormData);
    }
  }, [project]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };
  
  const handleMediaAdd = async (files: FileList) => {
    const newMediaPromises = Array.from(files).map(async (file) => {
      if (shouldMock) {
        return {
      id: `${file.name}-${Date.now()}`,
      filename: file.name,
      url: URL.createObjectURL(file),
          type: 'Final Render' as MediaCategory,
      uploadedAt: new Date().toISOString(),
        };
      } else {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(apiConfig.mediaUrl, {
          method: 'POST',
          headers: { 'X-WP-Nonce': apiConfig.nonce },
          body: formData,
        });
        if (!response.ok) {
          throw new Error('Failed to upload media');
        }
        const data = await response.json();
        return {
          id: data.id.toString(),
          filename: data.title.rendered,
          url: data.source_url,
          type: 'Final Render' as MediaCategory,
          uploadedAt: data.date,
        };
      }
    });

    try {
      const newMedia = await Promise.all(newMediaPromises);
      
      // Filter out duplicates based on filename and URL
      const existingFilenames = new Set(formData.media.map(m => m.filename));
      const existingUrls = new Set(formData.media.map(m => m.url));
      
      const uniqueNewMedia = newMedia.filter(media => 
        !existingFilenames.has(media.filename) && !existingUrls.has(media.url)
      );
      
      if (uniqueNewMedia.length < newMedia.length) {
        const duplicateCount = newMedia.length - uniqueNewMedia.length;
        toast({ 
          title: 'Some files were skipped', 
          description: `${duplicateCount} duplicate file(s) were not added.`,
          variant: 'default'
        });
      }
      
      setFormData(prev => ({
        ...prev,
        media: [...prev.media, ...uniqueNewMedia],
      }));
      
      if (uniqueNewMedia.length > 0) {
        toast({ title: 'Media uploaded successfully' });
      }
    } catch (error) {
      toast({ title: 'Error uploading media', description: error.message, variant: 'destructive' });
    }
  };

  const handleMediaRemove = (id: string) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.filter(m => m.id !== id),
    }));
  };

  const handleMediaCategoryChange = (id: string, type: MediaCategory) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.map(m => m.id === id ? { ...m, type } : m)
    }));
  };

  const handleMediaLibrarySelect = (selectedMedia: { id: number; alt_text: string; source_url: string }[]) => {
    const newMedia: ProjectMedia[] = selectedMedia.map(item => {
      const filename = item.source_url.split('/').pop() || item.alt_text || `media_${item.id}`;
      return {
        id: item.id.toString(),
        filename: filename,
        url: item.source_url,
        type: 'Final Render', // Default category
        uploadedAt: new Date().toISOString(),
      };
    });
    
    // Filter out duplicates based on filename and URL
    const existingFilenames = new Set(formData.media.map(m => m.filename));
    const existingUrls = new Set(formData.media.map(m => m.url));
    
    const uniqueNewMedia = newMedia.filter(media => 
      !existingFilenames.has(media.filename) && !existingUrls.has(media.url)
    );
    
    if (uniqueNewMedia.length < newMedia.length) {
      const duplicateCount = newMedia.length - uniqueNewMedia.length;
      toast({ 
        title: 'Some files were skipped', 
        description: `${duplicateCount} duplicate file(s) were not added.`,
        variant: 'default'
      });
    }
    
    setFormData(prev => ({
      ...prev,
      media: [...prev.media, ...uniqueNewMedia],
    }));
    
    if (uniqueNewMedia.length > 0) {
      toast({ title: 'Media added successfully' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate URLs before submitting
    const invalidLinks = formData.externalLinks.filter(link => link.url.trim() !== '' && !isValidUrl(link.url));
    if (invalidLinks.length > 0) {
      toast({
        title: 'Invalid URLs',
        description: `Please fix ${invalidLinks.length} invalid URL${invalidLinks.length > 1 ? 's' : ''} before submitting.`,
        variant: 'destructive',
      });
      return;
    }

    // Validate video URL if present
    if (formData.videoUrl && !isValidUrl(formData.videoUrl)) {
      toast({
        title: 'Invalid Video URL',
        description: 'Please enter a valid video URL or leave it empty.',
        variant: 'destructive',
      });
      return;
    }

    const finalFormData = {
      ...formData,
      artists: formData.artists.filter(a => a.name.trim() !== ''),
    };

    onSubmit(finalFormData);
    onClose();
  };

  const addArtist = () => {
    setFormData(prev => ({ ...prev, artists: [...prev.artists, { id: `new-${Date.now()}`, name: '' }] }));
  };

  const removeArtist = (id: string) => {
    setFormData(prev => ({ ...prev, artists: prev.artists.filter(a => a.id !== id) }));
  };

  const updateArtist = (id: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      artists: prev.artists.map(artist => artist.id === id ? { ...artist, name: value } : artist)
    }));
  };

  const addLink = () => {
    setFormData(prev => ({
      ...prev,
      externalLinks: [...prev.externalLinks, { id: `new-${Date.now()}`, type: 'other', name: '', url: '' }]
    }));
  };

  const removeLink = (id: string) => {
    setFormData(prev => ({
      ...prev,
      externalLinks: prev.externalLinks.filter(link => link.id !== id)
    }));
  };

  const updateLink = (id: string, field: keyof Omit<ExternalLink, 'id'>, value: string | LinkType) => {
    setFormData(prev => ({
      ...prev,
      externalLinks: prev.externalLinks.map(link => {
        if (link.id === id) {
          const updatedLink = { ...link, [field]: value };
          if (field === 'type' && value !== 'other') {
            const linkType = linkTypes.find(lt => lt.value === value);
            updatedLink.name = linkType ? linkType.label : '';
          }
          
          // Validate URL when the url field is updated
          if (field === 'url' && typeof value === 'string' && value.trim() !== '') {
            if (!isValidUrl(value)) {
              toast({
                title: 'Invalid URL',
                description: 'Please enter a valid URL (e.g., https://example.com)',
                variant: 'destructive',
              });
            }
          }
          
          return updatedLink;
        }
        return link;
      })
    }));
  };

  if (!isLoggedIn) {
    return (
      <div className="p-8 text-center">
        <p>You must be logged in to create or edit a project.</p>
        <Button onClick={onClose} className="mt-4 hover-shimmer">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <form onSubmit={handleSubmit} className="space-y-6 glass-card p-6">
          <h2 className="text-2xl font-bold">{project ? 'Edit Project' : 'Create New Project'}</h2>
          
          {/* All project fields in one line */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input id="name" name="name" className="input-glass cyrus-ui" value={formData.name} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Input id="client" name="client" className="input-glass cyrus-ui" value={formData.client} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectManager">Project Manager</Label>
              <Input id="projectManager" name="projectManager" className="input-glass cyrus-ui" value={formData.projectManager} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select name="priority" value={formData.priority} onValueChange={(value) => handleSelectChange('priority', value)}>
                <SelectTrigger className="input-glass cyrus-ui"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" name="startDate" type="date" className="input-glass cyrus-ui" value={formData.startDate} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" name="endDate" type="date" className="input-glass cyrus-ui" value={formData.endDate} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL</Label>
              <Input id="videoUrl" name="videoUrl" className="input-glass cyrus-ui" value={formData.videoUrl} onChange={handleInputChange} />
            </div>
          </div>

          {/* Artists and Brief in two columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label>Artists</Label>
              <div className="flex flex-wrap gap-2">
                {formData.artists.map((artist, index) => (
                  <div key={artist.id} className="flex items-center gap-2">
                    <Input
                      value={artist.name}
                      onChange={(e) => updateArtist(artist.id, e.target.value)}
                      placeholder={`Artist ${index + 1}`}
                      className="input-glass cyrus-ui px-2 py-1 w-auto min-w-[60px] max-w-[180px]"
                      style={{ width: `${Math.max(artist.name.length * 10 + 40, 80)}px` }}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeArtist(artist.id)} className="text-destructive hover-shimmer"><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={addArtist} className="hover-shimmer">
                <Plus className="mr-2 h-4 w-4" /> Add Artist
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brief">Brief</Label>
              <Textarea id="brief" name="brief" className="input-glass cyrus-ui h-32" value={formData.brief} onChange={handleInputChange} />
            </div>
          </div>

          <div className="space-y-4">
            <Label>External Links</Label>
            <div className="space-y-3">
              {formData.externalLinks.map((link) => (
                <div key={link.id} className="grid grid-cols-[160px_150px_1fr_auto] gap-3 items-center p-2">
                  <Select
                    value={link.type}
                    onValueChange={(value) => updateLink(link.id, 'type', value as LinkType)}
                  >
                    <SelectTrigger className="input-glass cyrus-ui hover-shimmer"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {linkTypes.map(lt => <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    value={link.name}
                    onChange={(e) => updateLink(link.id, 'name', e.target.value)}
                    placeholder="Name"
                    className="input-glass cyrus-ui w-[150px]"
                    disabled={link.type !== 'other'}
                  />
                  <Input
                    value={link.url}
                    onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                    placeholder="URL"
                    className="input-glass cyrus-ui"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeLink(link.id)} className="text-destructive hover-shimmer"><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={addLink} className="hover-shimmer">
              <Plus className="mr-2 h-4 w-4" /> Add Link
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Project Media</Label>
            <MediaUploader 
              onMediaAdd={handleMediaAdd} 
              onMediaRemove={handleMediaRemove}
              media={formData.media} 
              onShowMediaLibrary={() => setIsMediaLibraryOpen(true)}
              showLibraryButton={showLibraryButton}
              onMediaCategoryChange={handleMediaCategoryChange}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-6">
              <Button type="button" variant="ghost" onClick={onClose} className="hover-shimmer">Cancel</Button>
              <Button type="submit" className="button-primary-enhanced hover-shimmer cyrus-ui">{project ? 'Update Project' : 'Create Project'}</Button>
          </div>
        </form>
        
        {isMediaLibraryOpen && (
          <MediaLibraryModal
            isOpen={isMediaLibraryOpen}
            onClose={() => setIsMediaLibraryOpen(false)}
            onSelect={handleMediaLibrarySelect}
            mediaUrl={apiConfig.mediaUrl}
            nonce={apiConfig.nonce}
          />
        )}
    </div>
  );
}