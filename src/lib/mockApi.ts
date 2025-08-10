import { Project, ProjectStatus, Artist, StatusHistoryEntry, ExternalLink, Note, ProjectMedia } from '@/types/project';
import { mockProjects } from '@/data/mockProjects';
import { sanitizeInput, isValidEmail, isValidUrl } from '@/lib/utils';
import { sanitizeProject } from '@/types/project';
import { workspaceService } from "@/services/workspaceService";

// In-memory storage for projects
let projects = [...mockProjects];

// Custom error type for API errors
class ApiError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

// Helper functions to find project and validate input
const findProject = (id: string): Project => {
  const project = projects.find(p => p.id === id);
  if (!project) {
    throw new ApiError(`Project with ID ${id} not found`, 404);
  }
  return project;
};

const generateNoteId = () => `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// Helper to check if a project should be marked as archived
const isArchived = (meta: unknown): boolean | undefined => {
  if (meta && typeof meta === 'object' && 'is_archived' in meta) {
    return Boolean((meta as any).is_archived);
    }
  return undefined;
};

// Mock API class
class MockAPI {
  private projects: Project[] = [];

  constructor() {
    // Initialize with some data
    this.projects = [...mockProjects];
  }

  // Project operations
  async getProjects(): Promise<Project[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    // Sanitize all projects to ensure data integrity
    return this.projects.map(project => sanitizeProject(project));
  }

  async getProject(id: string): Promise<Project> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const project = this.projects.find(p => p.id === id);
    if (!project) {
      throw new Error(`Project with ID ${id} not found`);
    }
    
    return sanitizeProject(project);
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    // Validate required fields
    if (!data || typeof data !== 'object' || !data.name || !data.client) {
      throw new Error('Invalid project data');
    }
    
    // Create new project with defaults for missing fields
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: data.name,
      client: data.client,
      projectManager: data.projectManager || 'Unassigned',
      artists: data.artists || [],
      brief: data.brief || '',
      externalLinks: data.externalLinks || [],
      startDate: data.startDate || new Date().toISOString(),
      endDate: data.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      priority: data.priority || 'medium',
      status: data.status || 'Planning',
      statusHistory: [
        ...(data.statusHistory || []),
        {
          id: `status-${Date.now()}`,
          status: data.status || 'Planning',
          date: new Date().toISOString(),
          note: 'Project created'
        }
      ],
      media: data.media || [],
      videoUrl: data.videoUrl,
      isArchived: data.isArchived || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: data.notes || []
    };
    
    // Add to projects list
    this.projects.push(newProject);
    
    // Log activity directly to localStorage for immediate availability
    const activities = JSON.parse(localStorage.getItem('activities') || '[]');
    const userId = localStorage.getItem('userId') || 'current-user';
    const userName = localStorage.getItem('userDisplayName') || 'Current User';
    
    const activityData = {
      id: `activity-${Date.now()}-${Math.random()}`,
      type: 'project_created',
      title: newProject.name,
      description: `Project "${newProject.name}" was created for ${newProject.client}`,
      projectId: newProject.id,
      projectName: newProject.name,
      userId: userId,
      userName: userName,
      date: new Date().toISOString(),
      metadata: { 
        projectId: newProject.id,
        projectName: newProject.name,
        client: newProject.client
      }
    };
    
    activities.unshift(activityData);
    localStorage.setItem('activities', JSON.stringify(activities.slice(0, 1000)));
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return { ...newProject };
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    // Find project
    const projectIndex = this.projects.findIndex(p => p.id === id);
    if (projectIndex === -1) {
      throw new Error(`Project with ID ${id} not found`);
    }
    
    const currentProject = this.projects[projectIndex];
    
    // Update status history if status changed
    const updatedStatusHistory = [...currentProject.statusHistory];
    if (updates.status && updates.status !== currentProject.status) {
      updatedStatusHistory.push({
        id: `status-${Date.now()}`,
        status: updates.status,
        date: new Date().toISOString(),
        note: updates.status === 'Completed' ? 'Project completed' : `Status changed to ${updates.status}`
      });
    }
    
    // Create updated project
    const updatedProject = {
      ...currentProject,
      ...updates,
      statusHistory: updatedStatusHistory,
      updatedAt: new Date().toISOString()
    };
    
    // Update in projects list
    this.projects[projectIndex] = updatedProject;
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
      
    // Sync changes with associated workspaces
    await this.syncProjectWithWorkspaces(id);
    
    return { ...updatedProject };
  }

  async deleteProject(id: string): Promise<void> {
    // Check if project exists
    const projectIndex = this.projects.findIndex(p => p.id === id);
    if (projectIndex === -1) {
      throw new Error(`Project with ID ${id} not found`);
        }
        
    // Remove from projects list
    this.projects.splice(projectIndex, 1);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
      }
      
  // Function to add media to a project
  async addProjectMedia(projectId: string, media: ProjectMedia): Promise<Project> {
    const project = await this.getProject(projectId);
    
    // Add media to project
    project.media = [...project.media, media];
    project.updatedAt = new Date().toISOString();
    
    // Update project
    await this.updateProject(projectId, project);
    
    // Sync changes with associated workspaces
    await this.syncProjectWithWorkspaces(projectId);
    
    return project;
  }
  
  // Function to update media in a project
  async updateProjectMedia(projectId: string, mediaId: string, updates: Partial<ProjectMedia>): Promise<Project> {
    const project = await this.getProject(projectId);
    
    // Find and update media
    const updatedMedia = project.media.map(media => 
      media.id === mediaId ? { ...media, ...updates } : media
    );
    
    // Update project
    const updatedProject = await this.updateProject(projectId, { 
      media: updatedMedia,
      updatedAt: new Date().toISOString()
    });
    
    return updatedProject;
  }
  
  // Function to delete media from a project
  async deleteProjectMedia(projectId: string, mediaId: string): Promise<Project> {
    const project = await this.getProject(projectId);
    
    // Filter out the media to delete
    const updatedMedia = project.media.filter(media => media.id !== mediaId);
    
    // Update project
    const updatedProject = await this.updateProject(projectId, { 
      media: updatedMedia,
      updatedAt: new Date().toISOString()
    });
    
    return updatedProject;
  }
  
  // Function to sync project changes with workspaces
  private async syncProjectWithWorkspaces(projectId: string): Promise<void> {
    try {
      // Use the workspaceService to sync changes
      await workspaceService.syncProjectChanges(projectId);
    } catch (error) {
      console.error(`Failed to sync project ${projectId} with workspaces:`, error);
    }
  }
}

export const mockApi = new MockAPI();

// Export a helper to determine if we should use the mock API
export const useMockApi = () => {
  // Check if we're in a WordPress environment
  if (typeof window !== 'undefined' && window.pulse2) {
    return false; // Use WordPress API
  }
  return true; // Use mock API for development
}; 