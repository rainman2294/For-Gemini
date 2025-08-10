import React, { useState, useCallback } from 'react';
import { ProjectDetailsContent } from './ProjectDetailsContent';
import { Project } from '@/types/project';
import { useNotes } from '@/hooks/useNotes';
import { workspaceService } from '@/services/workspaceService';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onEdit: () => void;
  isLoggedIn?: boolean;
  onPin?: () => void;
  isPinned?: boolean;
  autoRefresh?: boolean;
  onToggleAutoRefresh?: React.Dispatch<React.SetStateAction<boolean>>;
}

export function ProjectDetail({ 
  project, 
  onBack, 
  onEdit, 
  isLoggedIn = false,
  onPin,
  isPinned = false,
  autoRefresh = false,
  onToggleAutoRefresh
}: ProjectDetailProps) {
  // If onToggleAutoRefresh is not provided, create a local state
  const [localAutoRefresh, setLocalAutoRefresh] = useState(autoRefresh);
  const effectiveAutoRefresh = onToggleAutoRefresh ? autoRefresh : localAutoRefresh;
  const handleToggleAutoRefresh = onToggleAutoRefresh || setLocalAutoRefresh;
  
  // Get toast outside of callback
  const { toast } = useToast();
  
  // Use the effective autoRefresh value for the hook
  const notesState = useNotes(project?.id);
  
  // Handle workspace creation functions
  const handleCreateOrNavigateMoodboard = useCallback(async (project: Project) => {
    try {
      // Show loading state
      toast({
        title: "Creating moodboard...",
        description: "Please wait while we set up your moodboard.",
      });
      
      const result = await workspaceService.createWorkspaceForProject(project.id, 'moodboard');
      
      // Provide feedback on success
      toast({
        title: result.isNew ? "Moodboard created" : "Existing moodboard found",
        description: result.message,
      });
      
      // Instead of trying to navigate to a non-existent route,
      // offer to take the user to the moodboards tab
      toast({
        title: "Ready to view",
        description: "Click here to go to the Moodboards tab",
        action: (
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => {
              // This is the proper way to navigate to the moodboards tab
              const indexComponent = document.querySelector('[data-viewmode="moodboards"]');
              if (indexComponent) {
                (indexComponent as HTMLButtonElement).click();
              } else {
                // Fallback approach - dispatch a custom event for the Index component to handle
                const event = new CustomEvent('navigate', {
                  detail: { viewMode: 'moodboards', workspaceId: result.workspace.id }
                });
                window.dispatchEvent(event);
              }
            }}
            className="bg-gradient-primary"
          >
            View Moodboards
          </Button>
        ),
        duration: 10000, // Give them 10 seconds to click
      });
    } catch (error) {
      console.error("Failed to create moodboard:", error);
      toast({
        title: "Error",
        description: "Failed to create moodboard. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);
  
  const handleCreateOrNavigateWhiteboard = useCallback(async (project: Project) => {
    try {
      // Show loading state
      toast({
        title: "Creating whiteboard...",
        description: "Please wait while we set up your whiteboard.",
      });
      
      const result = await workspaceService.createWorkspaceForProject(project.id, 'whiteboard');
      
      // Provide feedback on success
      toast({
        title: result.isNew ? "Whiteboard created" : "Existing whiteboard found",
        description: result.message,
      });
      
      // Instead of trying to navigate to a non-existent route,
      // offer to take the user to the whiteboards tab
      toast({
        title: "Ready to view",
        description: "Click here to go to the Whiteboards tab",
        action: (
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => {
              // This is the proper way to navigate to the whiteboards tab
              const indexComponent = document.querySelector('[data-viewmode="whiteboards"]');
              if (indexComponent) {
                (indexComponent as HTMLButtonElement).click();
              } else {
                // Fallback approach - dispatch a custom event for the Index component to handle
                const event = new CustomEvent('navigate', {
                  detail: { viewMode: 'whiteboards', workspaceId: result.workspace.id }
                });
                window.dispatchEvent(event);
              }
            }}
            className="bg-gradient-primary"
          >
            View Whiteboards
          </Button>
        ),
        duration: 10000, // Give them 10 seconds to click
      });
    } catch (error) {
      console.error("Failed to create whiteboard:", error);
      toast({
        title: "Error",
        description: "Failed to create whiteboard. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  return (
    <ProjectDetailsContent
      project={project}
      isLoggedIn={isLoggedIn}
      onEdit={onEdit}
      onPin={onPin}
      isPinned={isPinned}
      autoRefresh={effectiveAutoRefresh}
      onToggleAutoRefresh={handleToggleAutoRefresh}
      onCreateOrNavigateMoodboard={handleCreateOrNavigateMoodboard}
      onCreateOrNavigateWhiteboard={handleCreateOrNavigateWhiteboard}
      onBack={onBack}
    />
  );
} 