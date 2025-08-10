import { mockApi } from '@/lib/mockApi';

interface NoteInput {
  projectId: string;
  content: string;
  parentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface NoteRecord {
  id: string;
  projectId: string;
  content: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

declare global {
  interface Window {
    pulse2?: {
      apiUrl: string;
      mediaUrl: string;
      nonce: string;
    };
  }
}

const getApiConfig = () => {
  if (typeof window !== 'undefined' && window.pulse2) return window.pulse2;
  return { apiUrl: '/wp-json/pulse2/v1', mediaUrl: '/wp-json/wp/v2/media', nonce: '' } as const;
};

const apiRequest = async (path: string, options: RequestInit = {}) => {
  const cfg = getApiConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  // Add JWT authorization if available
  const jwtToken = typeof window !== 'undefined' ? localStorage.getItem('jwtToken') : null;
  if (jwtToken) {
    headers['Authorization'] = `Bearer ${jwtToken}`;
  }
  
  if (cfg.nonce) headers['X-WP-Nonce'] = cfg.nonce;
  const res = await fetch(`${cfg.apiUrl}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Notes API ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
};

class NotesService {
  async createNote(input: NoteInput): Promise<NoteRecord> {
    if (!(typeof window !== 'undefined' && window.pulse2)) {
      return {
        id: `note-${Date.now()}`,
        projectId: input.projectId,
        content: input.content,
        parentId: input.parentId,
        createdAt: input.createdAt || new Date().toISOString(),
        updatedAt: input.updatedAt || new Date().toISOString(),
      };
    }
    return apiRequest('/notes', {
      method: 'POST',
      body: JSON.stringify({
        project_id: input.projectId,
        content: input.content,
        parent_id: input.parentId,
        created_at: input.createdAt,
        updated_at: input.updatedAt,
      }),
    });
  }

  async getNotesByProject(projectId: string): Promise<NoteRecord[]> {
    return apiRequest(`/notes?project_id=${encodeURIComponent(projectId)}`);
  }

  async updateNote(id: string, updates: Partial<Pick<NoteInput, 'content'>>): Promise<NoteRecord> {
    return apiRequest(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content: updates.content }),
    });
  }

  async deleteNote(id: string): Promise<{ success: boolean }> {
    return apiRequest(`/notes/${id}`, { method: 'DELETE' });
  }
}

export const notesService = new NotesService();