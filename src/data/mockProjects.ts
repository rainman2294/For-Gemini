import { Project } from '@/types/project';

// Clean start - no mock data for production
export const mockProjects: Project[] = [];

// Clean moodboards data
export const mockMoodboards: Project[] = [];

// Clean whiteboards data  
export const mockWhiteboards: object[] = [];

// Sanitization helper
export const sanitizeProject = (project) => ({
  ...project,
  name: project.name?.trim() || 'Untitled Project',
  client: project.client?.trim() || 'Unknown Client',
  status: project.status || 'planning',
  // Sanitize dates
  startDate: project.startDate ? new Date(project.startDate).toISOString() : new Date().toISOString(),
  endDate: project.endDate ? new Date(project.endDate).toISOString() : null,
});

// Validation helper
export const validateProject = (project) => {
  if (!project.name?.trim()) throw new Error('Project name required');
  if (!project.client?.trim()) throw new Error('Client required');
  return project;
};

// Update sampleProjects to use sanitization
export const sampleProjects = mockProjects.map(sanitizeProject);