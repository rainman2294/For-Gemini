import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Project } from '@/types/project';
import { ProjectDetailsContent } from './ProjectDetailsContent';

interface ProjectDetailModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (project: Project) => void;
  isLoggedIn: boolean;
}

export function ProjectDetailModal({ project, isOpen, onClose, onEdit, isLoggedIn }: ProjectDetailModalProps) {
  if (!project) return null;
  return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
          <DialogTitle>{project.name}</DialogTitle>
          </DialogHeader>
        <ProjectDetailsContent project={project} isLoggedIn={isLoggedIn} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {isLoggedIn && <Button onClick={() => onEdit(project)}>Edit</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}