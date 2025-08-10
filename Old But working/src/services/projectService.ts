import { Project, ProjectStatus, Artist, StatusHistoryEntry, ExternalLink, Note, ProjectMedia } from '@/types/project';
import { mockApi } from '@/lib/mockApi';
import { WordPressApiClient } from '@/lib/apiClient';

// Create WordPress API client instance
const wpApiClient = new WordPressApiClient();

// Helper function to check if we should use mock API
const shouldUseMockApi = () => {
  // Check if we're in a WordPress environment
  if (typeof window !== 'undefined' && window.pulse2) {
    return false; // Use WordPress API
  }
  return true; // Use mock API for development
};

export class ProjectService {
  private shouldUseMock: boolean;

  constructor() {
    this.shouldUseMock = shouldUseMockApi();
  }

  async getProjects(): Promise<Project[]> {
    if (this.shouldUseMock) {
      return mockApi.getProjects();
    } else {
      return wpApiClient.getProjects<Project>();
    }
  }

  async getProject(id: string): Promise<Project> {
    if (this.shouldUseMock) {
      return mockApi.getProject(id);
    } else {
      return wpApiClient.getProject<Project>(id);
    }
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    if (this.shouldUseMock) {
      return mockApi.createProject(data);
    } else {
      return wpApiClient.createProject<Project>(data);
    }
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    if (this.shouldUseMock) {
      return mockApi.updateProject(id, updates);
    } else {
      return wpApiClient.updateProject<Project>(id, updates);
    }
  }

  async deleteProject(id: string): Promise<void> {
    if (this.shouldUseMock) {
      return mockApi.deleteProject(id);
    } else {
      return wpApiClient.deleteProject<void>(id);
    }
  }

  async addProjectMedia(projectId: string, media: ProjectMedia): Promise<Project> {
    if (this.shouldUseMock) {
      return mockApi.addProjectMedia(projectId, media);
    } else {
      // For WordPress, we need to update the project with the new media
      const project = await this.getProject(projectId);
      const updatedMedia = [...(project.media || []), media];
      return this.updateProject(projectId, { media: updatedMedia });
    }
  }

  async updateProjectMedia(projectId: string, mediaId: string, updates: Partial<ProjectMedia>): Promise<Project> {
    if (this.shouldUseMock) {
      return mockApi.updateProjectMedia(projectId, mediaId, updates);
    } else {
      const project = await this.getProject(projectId);
      const updatedMedia = project.media?.map(media => 
        media.id === mediaId ? { ...media, ...updates } : media
      ) || [];
      return this.updateProject(projectId, { media: updatedMedia });
    }
  }

  async deleteProjectMedia(projectId: string, mediaId: string): Promise<Project> {
    if (this.shouldUseMock) {
      return mockApi.deleteProjectMedia(projectId, mediaId);
    } else {
      const project = await this.getProject(projectId);
      const updatedMedia = project.media?.filter(media => media.id !== mediaId) || [];
      return this.updateProject(projectId, { media: updatedMedia });
    }
  }
}

export const projectService = new ProjectService(); 