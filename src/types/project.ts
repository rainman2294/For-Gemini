import { statusValues } from "@/lib/statuses";

export type ProjectStatus = typeof statusValues[number];

export type ProjectPriority = 'high' | 'medium' | 'low';

export type LinkType = 'google-drive' | 'google-sheets' | 'google-maps' | 'dropbox' | 'filestage' | 'other';

export interface ExternalLink {
  id: string;
  type: LinkType;
  url: string;
  name: string;
}

export interface StatusHistoryEntry {
  id: string;
  status: ProjectStatus;
  date: string;
  note?: string;
}

export type MediaCategory = "Final Render" | "Clay Render" | "Client Reference" | "Concept" | "Other";

export interface Artist {
  id: string;
  name: string;
}

export interface ProjectMedia {
  id:string;
  filename: string;
  url: string;
  type: MediaCategory;
  uploadedAt: string;
}

// Add Note interface similar to Grok's
export interface Note {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  parentNoteId?: string;
  replies?: Note[];
}

export interface Project {
  id: string;
  name: string;
  client: string;
  projectManager: string;
  artists: Artist[];
  brief: string;
  externalLinks: ExternalLink[];
  startDate: string;
  endDate: string;
  priority: ProjectPriority;
  status: ProjectStatus;
  statusHistory: StatusHistoryEntry[]; // Ensure this is always an array
  media: ProjectMedia[]; // Ensure this is always an array
  videoUrl?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // Who created the project
  notes?: Note[]; // Add notes array to fix linter errors
}

// Helper function to ensure project data integrity
export function sanitizeProject(project: Partial<Project>): Project {
  return {
    id: project.id || '',
    name: project.name || '',
    client: project.client || '',
    projectManager: project.projectManager || '',
    artists: Array.isArray(project.artists) ? project.artists : [],
    brief: project.brief || '',
    externalLinks: Array.isArray(project.externalLinks) ? project.externalLinks : [],
    startDate: project.startDate || new Date().toISOString().split('T')[0],
    endDate: project.endDate || new Date().toISOString().split('T')[0],
    priority: project.priority || 'medium',
    status: project.status || 'not_started',
    statusHistory: Array.isArray(project.statusHistory) ? project.statusHistory : [],
    media: Array.isArray(project.media) ? project.media : [],
    videoUrl: project.videoUrl,
    isArchived: project.isArchived || false,
    createdAt: project.createdAt || new Date().toISOString(),
    updatedAt: project.updatedAt || new Date().toISOString(),
    createdBy: project.createdBy,
    notes: Array.isArray(project.notes) ? project.notes : []
  };
}

export type ViewMode = 'list' | 'calendar' | 'monday' | 'activity' | 'profile' | 'moodboards' | 'whiteboards' | 'workflows' | 'timeline';
export type FilterMode = 'active' | 'archived';
export type SortMode = 'newest' | 'oldest' | 'priority' | 'deadline';