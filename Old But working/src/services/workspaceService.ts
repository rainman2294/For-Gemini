import { 
  BaseWorkspace, 
  MoodboardWorkspace, 
  WhiteboardWorkspace, 
  WorkflowWorkspace, 
  TimelineWorkspace,
  WorkspaceType,
  MoodboardElement,
  WhiteboardElement,
  Annotation,
  WorkflowStage,
  TaskAssignment,
  WorkspaceActivity,
  ChecklistItem,
  ApprovalRecord,
  WorkflowTemplate,
  WorkflowMetrics,
  ProjectMedia
} from '@/types/workspace';
import { CreateActivityContext, ActivityType } from '@/types/activity';
import { activityService } from './activityService';
import { mockApi } from '@/lib/mockApi';

// WordPress API configuration
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
  if (typeof window !== 'undefined' && window.pulse2) {
    return window.pulse2;
  }
  // Fallback for development
  return {
    apiUrl: '/wp-json/pulse2/v1',
    mediaUrl: '/wp-json/wp/v2/media',
    nonce: ''
  };
};

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const config = getApiConfig();
  const url = `${config.apiUrl}${endpoint}`;
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (config.nonce) {
    defaultHeaders['X-WP-Nonce'] = config.nonce;
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};

const uploadFile = async (workspaceId: string, categoryId: string, file: File) => {
  const config = getApiConfig();
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${config.apiUrl}/workspaces/${workspaceId}/images?category_id=${categoryId}`, {
    method: 'POST',
    headers: {
      'X-WP-Nonce': config.nonce || '',
    },
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};

// helper to fetch project details in WP mode
async function fetchProject(projectId: string): Promise<any> {
  const cfg = getApiConfig();
  return apiRequest(`/projects/${projectId}`);
}

function normalizeWorkspace<T extends BaseWorkspace>(ws: any): T {
  if (ws && ws.settings && ws.settings.canvas && !ws.canvas) {
    ws.canvas = ws.settings.canvas;
  }
  return ws as T;
}

function normalizeWorkspaceList<T extends BaseWorkspace>(list: any[]): T[] {
  return (list || []).map(w => normalizeWorkspace<T>(w));
}

class WorkspaceService {
  // Change from private to public so components can access
  public workspaces: BaseWorkspace[] = [];

  // Map to track existing workspaces by projectId and type to prevent duplicates
  private workspacesByProject = new Map<string, Map<WorkspaceType, string>>();

  // Generic Workspace Operations
  async getWorkspacesByProject(projectId: string): Promise<BaseWorkspace[]> {
    try {
      const list = await apiRequest(`/workspaces/project/${projectId}`);
      const normalized = normalizeWorkspaceList<BaseWorkspace>(list);
      this.workspaces = this.mergeAndDedupeWorkspaces(this.workspaces, normalized);
      for (const ws of normalized) {
        this.cacheWorkspace(ws.projectId, ws.type as WorkspaceType, ws.id);
      }
      return normalized;
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
      throw error;
    }
  }

  // Fetch all workspaces and update cache (used by views listing all workspaces)
  async fetchAllWorkspaces(): Promise<BaseWorkspace[]> {
    try {
      const list = await apiRequest(`/workspaces`);
      const normalized = normalizeWorkspaceList<BaseWorkspace>(list);
      this.workspaces = this.mergeAndDedupeWorkspaces(this.workspaces, normalized);
      for (const ws of normalized) {
        this.cacheWorkspace(ws.projectId, ws.type as WorkspaceType, ws.id);
      }
      return normalized;
    } catch (error) {
      console.error('Failed to fetch all workspaces:', error);
      throw error;
    }
  }

  // Get single workspace by id (WordPress)
  async getWorkspace(id: string): Promise<BaseWorkspace> {
    try {
      const ws = await apiRequest(`/workspaces/${id}`);
      const normalized = normalizeWorkspace<BaseWorkspace>(ws);
      this.workspaces = this.mergeAndDedupeWorkspaces(this.workspaces, [normalized]);
      this.cacheWorkspace(normalized.projectId, normalized.type as WorkspaceType, normalized.id);
      return normalized;
    } catch (error) {
      console.error('Failed to fetch workspace:', error);
      throw error;
    }
  }

  // Helper to merge arrays and dedupe by id
  private mergeAndDedupeWorkspaces(existing: BaseWorkspace[], incoming: BaseWorkspace[]): BaseWorkspace[] {
    const map = new Map<string, BaseWorkspace>();
    for (const w of existing) map.set(w.id, w);
    for (const w of incoming) map.set(w.id, { ...map.get(w.id), ...w });
    return Array.from(map.values());
  }

  // Check if a workspace exists for a project
  async getExistingWorkspace(projectId: string, type: WorkspaceType): Promise<BaseWorkspace | null> {
    // Try cache first
    const cached = this.workspaces.find(ws => ws.projectId === projectId && ws.type === type);
    if (cached) {
      this.cacheWorkspace(projectId, type, cached.id);
      return cached;
    }

    // Fetch from server for the project
    try {
      const list = await this.getWorkspacesByProject(projectId);
      const match = list.find(ws => ws.type === type) || null;
      if (match) this.cacheWorkspace(projectId, type, match.id);
      return match;
    } catch (error) {
      console.error(`Error checking existing workspace for project ${projectId}:`, error);
      return null;
    }
  }

  // Helper to cache a workspace
  private cacheWorkspace(projectId: string, type: WorkspaceType, workspaceId: string) {
    if (!this.workspacesByProject.has(projectId)) {
      this.workspacesByProject.set(projectId, new Map());
    }
    this.workspacesByProject.get(projectId)?.set(type, workspaceId);
  }

  async createWorkspace(workspaceData: Omit<BaseWorkspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<BaseWorkspace> {
    try {
      const workspace = await apiRequest('/workspaces', {
        method: 'POST',
        body: JSON.stringify(workspaceData),
      });

      // Update cache
      this.workspaces = this.mergeAndDedupeWorkspaces(this.workspaces, [workspace]);
      this.cacheWorkspace(workspace.projectId, workspace.type as WorkspaceType, workspace.id);

      // Log activity (server will also log depending on backend)
      await activityService.logActivity({
        type: `${workspaceData.type}_created` as any,
        projectId: workspaceData.projectId,
        userId: 'current-user',
        userName: 'Current User',
        metadata: {
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          workspaceType: workspace.type
        }
      });

      return workspace;
    } catch (error) {
      console.error('Failed to create workspace:', error);
      throw error;
    }
  }

  async updateWorkspace(id: string, updates: Partial<BaseWorkspace>): Promise<BaseWorkspace> {
    const apiConfig = getApiConfig();
    
    try {
      if (apiConfig) {
        // WordPress API update
        const response = await fetch(`${apiConfig.apiUrl}/workspaces/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': apiConfig.nonce,
          },
          body: JSON.stringify({
            ...updates,
            updatedAt: new Date().toISOString()
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Update workspace error:', errorText);
          throw new Error(`Failed to update workspace: ${response.status} ${response.statusText}`);
        }

        const updatedWorkspace = await response.json();
        
        // Update cache
        this.workspaces = this.workspaces.map(w => 
          w.id === id ? { ...w, ...updatedWorkspace } : w
        );
        
        return updatedWorkspace;
      } else {
        // Mock implementation with localStorage
        const workspaces = this.getCachedWorkspaces();
        const workspaceIndex = workspaces.findIndex(w => w.id === id);
        
        if (workspaceIndex === -1) {
          throw new Error('Workspace not found');
        }

        const updatedWorkspace = {
          ...workspaces[workspaceIndex],
          ...updates,
          updatedAt: new Date().toISOString()
        } as BaseWorkspace;

        workspaces[workspaceIndex] = updatedWorkspace;
        localStorage.setItem('workspaces', JSON.stringify(workspaces));
        
        // Update in-memory cache
        this.workspaces = this.mergeAndDedupeWorkspaces(this.workspaces, [updatedWorkspace]);

        return updatedWorkspace;
      }
    } catch (error) {
      console.error('Error updating workspace:', error);
      throw error;
    }
  }

  // Persist moodboard element changes by saving canvas in settings
  async updateMoodboardElement(
    workspaceId: string,
    elementId: string,
    updates: Partial<MoodboardElement>,
    userId?: string,
    userName?: string,
    projectId?: string
  ): Promise<MoodboardWorkspace> {
    // Load the workspace (from cache or server)
    const ws = (this.workspaces.find(w => w.id === workspaceId) || await this.getWorkspace(workspaceId)) as MoodboardWorkspace;
    const canvas = (ws as any).canvas || (ws as any).settings?.canvas;

    if (!canvas || !Array.isArray(canvas.elements)) {
      // Initialize minimal canvas if missing
      const newCanvas = { width: 1920, height: 1080, background: '#ffffff', elements: [] as MoodboardElement[] };
      (ws as any).canvas = newCanvas;
    }

    const currentCanvas = (ws as any).canvas || (ws as any).settings?.canvas;
    const elements: MoodboardElement[] = currentCanvas.elements || [];
    const idx = elements.findIndex(el => el.id === elementId);
    if (idx >= 0) {
      elements[idx] = { ...elements[idx], ...updates } as MoodboardElement;
    }

    // Persist by updating settings with canvas snapshot for server storage
    const updated = await this.updateWorkspace(workspaceId, {
      ...(ws as any),
      // Only send fields that backend expects; place canvas in settings bag
      settings: {
        ...(ws as any).settings,
        canvas: { ...currentCanvas, elements }
      },
      updatedAt: new Date().toISOString()
    } as Partial<BaseWorkspace>);

    // Update local in-memory representation to include canvas for UI
    const updatedWs = { ...(ws as any), ...updated } as MoodboardWorkspace;
    (updatedWs as any).canvas = (updated as any).settings?.canvas || currentCanvas;
    this.workspaces = this.mergeAndDedupeWorkspaces(this.workspaces, [updatedWs]);

    // Log
    activityService.logActivity({
      type: 'moodboard_element_updated' as any,
      projectId: projectId || ws.projectId,
      userId: userId || 'current-user',
      metadata: { workspaceId, elementId }
    });

    return updatedWs;
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    try {
      // Remove from internal workspaces array
      const workspaceIndex = this.workspaces.findIndex(ws => ws.id === workspaceId);
      if (workspaceIndex === -1) {
        throw new Error(`Workspace with ID ${workspaceId} not found`);
      }
      
      const workspace = this.workspaces[workspaceIndex];
      
      // Remove from workspaces array
      this.workspaces.splice(workspaceIndex, 1);
      
      // Clean up cached workspace mapping
      if (workspace.projectId && this.workspacesByProject.has(workspace.projectId)) {
        const typeMap = this.workspacesByProject.get(workspace.projectId);
        if (typeMap && typeMap.has(workspace.type)) {
          typeMap.delete(workspace.type);
          // If no more workspaces for this project, remove the project entry
          if (typeMap.size === 0) {
            this.workspacesByProject.delete(workspace.projectId);
          }
        }
      }
      
      // Log activity
      activityService.logActivity({
        type: 'project_updated',
        title: `${workspace.type} deleted`,
        description: `Deleted ${workspace.type}: ${workspace.name}`,
        projectId: workspace.projectId,
        userId: 'current-user',
        metadata: { workspaceId, workspaceName: workspace.name }
      });
      
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      throw error;
    }
  }

  // Categories
  async getWorkspaceCategories(workspaceId: string): Promise<any[]> {
    try {
      return await apiRequest(`/workspaces/${workspaceId}/categories`);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      throw error;
    }
  }

  async createWorkspaceCategory(workspaceId: string, categoryData: { name: string; color?: string }): Promise<any> {
    try {
      const category = await apiRequest(`/workspaces/${workspaceId}/categories`, {
        method: 'POST',
        body: JSON.stringify(categoryData),
      });

      // Log activity
      await activityService.logActivity({
        type: 'whiteboard_category_created',
        projectId: '', // Will be filled by the backend
        userId: 'current-user',
        userName: 'Current User',
        details: {
          workspaceId,
          categoryName: categoryData.name
        }
      });

      return category;
    } catch (error) {
      console.error('Failed to create category:', error);
      throw error;
    }
  }

  // Images
  async getWorkspaceImages(workspaceId: string): Promise<any[]> {
    try {
      return await apiRequest(`/workspaces/${workspaceId}/images`);
    } catch (error) {
      console.error('Failed to fetch images:', error);
      throw error;
    }
  }

  // Public image upload that associates the upload with a workspace and returns workspace image id
  public async uploadWorkspaceImage(workspaceId: string, categoryId: string, file: File): Promise<any> {
    return uploadFile(workspaceId, categoryId, file);
  }

  public async attachWorkspaceImage(workspaceId: string, categoryId: string, attachmentId: number): Promise<any> {
    try {
      return await apiRequest(`/workspaces/${workspaceId}/images/attach`, {
        method: 'POST',
        body: JSON.stringify({ attachment_id: attachmentId, category_id: categoryId })
      });
    } catch (error) {
      console.error('Failed to attach workspace image:', error);
      throw error;
    }
  }

  // Pins
  async getImagePins(imageId: string): Promise<any[]> {
    try {
      return await apiRequest(`/workspace-images/${imageId}/pins`);
    } catch (error) {
      console.warn('Failed to fetch pins, returning empty:', error);
      return [];
    }
  }

  async createImagePin(imageId: string, pinData: { x: number; y: number; note?: string }): Promise<any> {
    try {
      const pin = await apiRequest(`/workspace-images/${imageId}/pins`, {
        method: 'POST',
        body: JSON.stringify(pinData),
      });
      return pin;
    } catch (error) {
      console.error('Failed to create pin:', error);
      throw error;
    }
  }

  async updatePin(pinId: string, updates: { note?: string; isResolved?: boolean }): Promise<void> {
    try {
      await apiRequest(`/workspace-pins/${pinId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Failed to update pin:', error);
      throw error;
    }
  }

  async deletePin(pinId: string): Promise<void> {
    try {
      await apiRequest(`/workspace-pins/${pinId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete pin:', error);
      throw error;
    }
  }

  // Comments
  async getWorkspaceComments(workspaceId: string): Promise<any[]> {
    try {
      return await apiRequest(`/workspaces/${workspaceId}/comments`);
    } catch (error) {
      console.warn('Failed to fetch comments, returning empty:', error);
      return [];
    }
  }

  async createWorkspaceComment(workspaceId: string, commentData: { text: string; imageId?: string; pinId?: string }): Promise<any> {
    try {
      const comment = await apiRequest(`/workspaces/${workspaceId}/comments`, {
        method: 'POST',
        body: JSON.stringify(commentData),
      });
      return comment;
    } catch (error) {
      console.error('Failed to create comment:', error);
      throw error;
    }
  }

  // Activities
  async getWorkspaceActivities(projectId: string): Promise<WorkspaceActivity[]> {
    try {
      return await apiRequest(`/workspace-activities/project/${projectId}`);
    } catch (error) {
      console.error('Failed to fetch workspace activities:', error);
      throw error;
    }
  }

  // Legacy methods for backward compatibility - now mapped to workspace operations

  // Moodboards (now workspaces of type 'moodboard')
  async getMoodboards(projectId: string): Promise<MoodboardWorkspace[]> {
    const workspaces = await this.getWorkspacesByProject(projectId);
    return workspaces.filter(w => w.type === 'moodboard') as MoodboardWorkspace[];
  }

  async createMoodboard(moodboardData: Omit<MoodboardWorkspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<MoodboardWorkspace> {
    return this.createWorkspace({
      ...moodboardData,
      type: 'moodboard'
    }) as Promise<MoodboardWorkspace>;
  }

  async updateMoodboard(id: string, updates: Partial<MoodboardWorkspace>): Promise<MoodboardWorkspace> {
    return this.updateWorkspace(id, updates) as Promise<MoodboardWorkspace>;
  }

  async deleteMoodboard(id: string): Promise<void> {
    return this.deleteWorkspace(id);
  }

  async addMoodboardElement(workspaceId: string, elementData: any): Promise<MoodboardElement> {
    try {
      // This would need to be implemented based on element type
      // For now, we'll use the image upload for image elements
      if (elementData.type === 'image' && elementData.content.file) {
        const image = await this.uploadWorkspaceImage(workspaceId, '', elementData.content.file);
        const newElement: MoodboardElement = {
          id: `element-${Date.now()}`,
          ...elementData,
          content: {
            ...elementData.content,
            filename: elementData.content.file.name,
            alt: elementData.content.file.name
          }
        };
        return newElement;
      }
      throw new Error('Element type not yet implemented');
    } catch (error) {
      console.error('Failed to add moodboard element:', error);
      throw error;
    }
  }

  // Whiteboards (now workspaces of type 'whiteboard')
  async getWhiteboards(projectId: string): Promise<WhiteboardWorkspace[]> {
    const workspaces = await this.getWorkspacesByProject(projectId);
    return workspaces.filter(w => w.type === 'whiteboard') as WhiteboardWorkspace[];
  }

  async createWhiteboard(whiteboardData: Omit<WhiteboardWorkspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<WhiteboardWorkspace> {
    return this.createWorkspace({
      ...whiteboardData,
      type: 'whiteboard'
    }) as Promise<WhiteboardWorkspace>;
  }

  async updateWhiteboard(id: string, updates: Partial<WhiteboardWorkspace>): Promise<WhiteboardWorkspace> {
    return this.updateWorkspace(id, updates) as Promise<WhiteboardWorkspace>;
  }

  async deleteWhiteboard(id: string): Promise<void> {
    return this.deleteWorkspace(id);
  }

  // Workflows (now workspaces of type 'workflow')
  async getWorkflows(projectId: string): Promise<WorkflowWorkspace[]> {
    const workspaces = await this.getWorkspacesByProject(projectId);
    return workspaces.filter(w => w.type === 'workflow') as WorkflowWorkspace[];
  }

  async createWorkflow(workflowData: Omit<WorkflowWorkspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkflowWorkspace> {
    return this.createWorkspace({
      ...workflowData,
      type: 'workflow'
    }) as Promise<WorkflowWorkspace>;
  }

  // Workflow Stages
  async getWorkflowStages(workspaceId: string): Promise<WorkflowStage[]> {
    try {
      return await apiRequest(`/workspaces/${workspaceId}/stages`);
    } catch (error) {
      console.error('Failed to fetch workflow stages:', error);
      throw error;
    }
  }

  async createWorkflowStage(workspaceId: string, stageData: Omit<WorkflowStage, 'id'>): Promise<WorkflowStage> {
    try {
      const stage = await apiRequest(`/workspaces/${workspaceId}/stages`, {
        method: 'POST',
        body: JSON.stringify(stageData),
      });

      // Activity is logged in the backend
      return stage;
    } catch (error) {
      console.error('Failed to create workflow stage:', error);
      
      // For mock data, create stage and log activity
      const newStage: WorkflowStage = {
        id: `stage-${Date.now()}`,
        workspaceId,
        ...stageData,
        checklistItems: stageData.checklistItems || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Log workflow stage creation activity
      try {
        const workspace = this.workspaces.find(w => w.id === workspaceId);
        activityService.logActivity({
          type: 'workflow_updated',
          title: `New workflow stage created: ${newStage.name}`,
          description: `Added stage "${newStage.name}" to workflow`,
          projectId: workspace?.projectId,
          userId: 'current-user',
          metadata: {
            workspaceId,
            stageId: newStage.id,
            stageName: newStage.name,
            action: 'stage_created'
          }
        });
      } catch (activityError) {
        console.warn('Failed to log workflow stage creation activity:', activityError);
      }

      return newStage;
    }
  }

  async updateWorkflowStage(stageId: string, updates: Partial<WorkflowStage>): Promise<void> {
    try {
      await apiRequest(`/workflow-stages/${stageId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Failed to update workflow stage:', error);
      throw error;
    }
  }

  async completeWorkflowStage(stageId: string): Promise<void> {
    try {
      await apiRequest(`/workflow-stages/${stageId}/complete`, {
        method: 'POST',
      });

      // Activity is logged in the backend
    } catch (error) {
      console.error('Failed to complete workflow stage:', error);
      
      // For mock data, log activity
      try {
        // Find the stage and workspace for activity logging
        let stageName = 'Unknown Stage';
        let workspaceId = '';
        let projectId = '';

        for (const workspace of this.workspaces) {
          if (workspace.type === 'workflow') {
            const workflowWorkspace = workspace as WorkflowWorkspace;
            const stage = workflowWorkspace.stages?.find(s => s.id === stageId);
            if (stage) {
              stageName = stage.name;
              workspaceId = workspace.id;
              projectId = workspace.projectId;
              break;
            }
          }
        }

        activityService.logActivity({
          type: 'workflow_updated',
          title: `Workflow stage completed: ${stageName}`,
          description: `Marked stage "${stageName}" as completed`,
          projectId,
          userId: 'current-user',
          metadata: {
            workspaceId,
            stageId,
            stageName,
            action: 'stage_completed'
          }
        });
      } catch (activityError) {
        console.warn('Failed to log workflow stage completion activity:', activityError);
      }
    }
  }

  async deleteWorkflowStage(stageId: string): Promise<void> {
    try {
      await apiRequest(`/workflow-stages/${stageId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete workflow stage:', error);
      throw error;
    }
  }

  // Workflow Checklist Items
  async getStageChecklistItems(stageId: string): Promise<ChecklistItem[]> {
    try {
      return await apiRequest(`/workflow-stages/${stageId}/checklist`);
    } catch (error) {
      console.error('Failed to fetch checklist items:', error);
      throw error;
    }
  }

  async createChecklistItem(stageId: string, itemData: Omit<ChecklistItem, 'id'>): Promise<ChecklistItem> {
    try {
      const item = await apiRequest(`/workflow-stages/${stageId}/checklist`, {
        method: 'POST',
        body: JSON.stringify(itemData),
      });

      // Activity is logged in the backend
      return item;
    } catch (error) {
      console.error('Failed to create checklist item:', error);
      throw error;
    }
  }

  async updateChecklistItem(itemId: string, updates: Partial<ChecklistItem>): Promise<void> {
    try {
      await apiRequest(`/workflow-checklist/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      // Activity is logged in the backend
    } catch (error) {
      console.error('Failed to update checklist item:', error);
      throw error;
    }
  }

  async deleteChecklistItem(itemId: string): Promise<void> {
    try {
      await apiRequest(`/workflow-checklist/${itemId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete checklist item:', error);
      throw error;
    }
  }

  // Workflow Approvals
  async getWorkflowApprovals(params: { workspaceId?: string; stageId?: string; status?: string } = {}): Promise<ApprovalRecord[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params.workspaceId) queryParams.append('workspace_id', params.workspaceId);
      if (params.stageId) queryParams.append('stage_id', params.stageId);
      if (params.status) queryParams.append('status', params.status);
      
      const url = `/workflow-approvals${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      return await apiRequest(url);
    } catch (error) {
      console.error('Failed to fetch workflow approvals:', error);
      throw error;
    }
  }

  async createWorkflowApproval(approvalData: Omit<ApprovalRecord, 'id' | 'requestedAt'>): Promise<ApprovalRecord> {
    try {
      const approval = await apiRequest('/workflow-approvals', {
        method: 'POST',
        body: JSON.stringify(approvalData),
      });

      // Activity is logged in the backend
      return approval;
    } catch (error) {
      console.error('Failed to create workflow approval:', error);
      throw error;
    }
  }

  async updateWorkflowApproval(approvalId: string, updates: Partial<ApprovalRecord>): Promise<void> {
    try {
      await apiRequest(`/workflow-approvals/${approvalId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      // Activity is logged in the backend
    } catch (error) {
      console.error('Failed to update workflow approval:', error);
      throw error;
    }
  }

  // Enhanced Workflow Methods
  
  // Stage Dependencies
  async createStageDependency(workspaceId: string, fromStageId: string, toStageId: string): Promise<void> {
    try {
      await apiRequest(`/workspaces/${workspaceId}/stage-dependencies`, {
        method: 'POST',
        body: JSON.stringify({ fromStageId, toStageId }),
      });
    } catch (error) {
      console.error('Failed to create stage dependency:', error);
      throw error;
    }
  }

  async deleteStageDependency(workspaceId: string, fromStageId: string, toStageId: string): Promise<void> {
    try {
      await apiRequest(`/workspaces/${workspaceId}/stage-dependencies`, {
        method: 'DELETE',
        body: JSON.stringify({ fromStageId, toStageId }),
      });
    } catch (error) {
      console.error('Failed to delete stage dependency:', error);
      throw error;
    }
  }

  // Bulk Operations
  async bulkUpdateStages(stageUpdates: Array<{ id: string; updates: Partial<WorkflowStage> }>): Promise<void> {
    try {
      await apiRequest('/workflow-stages/bulk-update', {
        method: 'PUT',
        body: JSON.stringify({ stages: stageUpdates }),
      });
    } catch (error) {
      console.error('Failed to bulk update stages:', error);
      throw error;
    }
  }

  async bulkAssignStages(stageIds: string[], assigneeIds: string[]): Promise<void> {
    try {
      await apiRequest('/workflow-stages/bulk-assign', {
        method: 'POST',
        body: JSON.stringify({ stageIds, assigneeIds }),
      });
    } catch (error) {
      console.error('Failed to bulk assign stages:', error);
      throw error;
    }
  }

  // Workflow Templates
  async getWorkflowTemplates(category?: string): Promise<WorkflowTemplate[]> {
    try {
      const queryParams = category ? `?category=${category}` : '';
      return await apiRequest(`/workflow-templates${queryParams}`);
    } catch (error) {
      console.error('Failed to fetch workflow templates:', error);
      // Return mock templates for development
      return this.getMockWorkflowTemplates();
    }
  }

  async createWorkflowTemplate(templateData: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<WorkflowTemplate> {
    try {
      return await apiRequest('/workflow-templates', {
        method: 'POST',
        body: JSON.stringify(templateData),
      });
    } catch (error) {
      console.error('Failed to create workflow template:', error);
      throw error;
    }
  }

  async createWorkflowFromTemplate(templateId: string, workspaceData: Partial<WorkflowWorkspace>): Promise<WorkflowWorkspace> {
    try {
      return await apiRequest(`/workflow-templates/${templateId}/create-workflow`, {
        method: 'POST',
        body: JSON.stringify(workspaceData),
      });
    } catch (error) {
      console.error('Failed to create workflow from template:', error);
      throw error;
    }
  }

  // Workflow Metrics
  async getWorkflowMetrics(workspaceId: string): Promise<WorkflowMetrics> {
    try {
      return await apiRequest(`/workspaces/${workspaceId}/metrics`);
    } catch (error) {
      console.error('Failed to fetch workflow metrics:', error);
      // Return mock metrics for development
      return this.getMockWorkflowMetrics(workspaceId);
    }
  }

  // Workflow Validation
  async validateWorkflowTransition(stageId: string, targetStatus: string): Promise<{ valid: boolean; errors: string[] }> {
    try {
      return await apiRequest(`/workflow-stages/${stageId}/validate-transition`, {
        method: 'POST',
        body: JSON.stringify({ targetStatus }),
      });
    } catch (error) {
      console.error('Failed to validate workflow transition:', error);
      // Return basic validation for development
      return { valid: true, errors: [] };
    }
  }

  async detectDependencyCycles(workspaceId: string): Promise<{ hasCycles: boolean; cycles: string[][] }> {
    try {
      return await apiRequest(`/workspaces/${workspaceId}/dependency-cycles`);
    } catch (error) {
      console.error('Failed to detect dependency cycles:', error);
      return { hasCycles: false, cycles: [] };
    }
  }

  // Mock Data Methods for Development
  private getMockWorkflowTemplates(): WorkflowTemplate[] {
    return [
      {
        id: 'template-1',
        name: 'Design Review Workflow',
        description: 'Standard design review process with client feedback',
        category: 'design',
        stages: [
          {
            id: 'stage-1',
            name: 'Initial Design',
            description: 'Create initial design concepts',
            order: 0,
            isRequired: true,
            estimatedHours: 8,
            checklistTemplate: [],
            requiresApproval: false,
          },
          {
            id: 'stage-2',
            name: 'Internal Review',
            description: 'Team review and feedback',
            order: 1,
            isRequired: true,
            estimatedHours: 4,
            checklistTemplate: [],
            requiresApproval: true,
          },
          {
            id: 'stage-3',
            name: 'Client Presentation',
            description: 'Present to client for approval',
            order: 2,
            isRequired: true,
            estimatedHours: 2,
            checklistTemplate: [],
            requiresApproval: true,
          },
        ],
        isPublic: true,
        createdBy: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 15,
      },
    ];
  }

  private getMockWorkflowMetrics(workspaceId: string): WorkflowMetrics {
    return {
      id: `metrics-${workspaceId}`,
      workspaceId,
      totalStages: 5,
      completedStages: 2,
      averageStageCompletionTime: 16.5,
      bottleneckStages: ['stage-2', 'stage-4'],
      teamEfficiency: 85.5,
      onTimeDelivery: 78.2,
      totalEstimatedHours: 40,
      totalActualHours: 42.5,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Timelines (now workspaces of type 'timeline')
  async getTimelines(projectId: string): Promise<TimelineWorkspace[]> {
    const workspaces = await this.getWorkspacesByProject(projectId);
    return workspaces.filter(w => w.type === 'timeline') as TimelineWorkspace[];
  }

  async createTimeline(timelineData: Omit<TimelineWorkspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<TimelineWorkspace> {
    return this.createWorkspace({
      ...timelineData,
      type: 'timeline'
    }) as Promise<TimelineWorkspace>;
  }

  // Timeline Tasks
  async getTimelineTasks(workspaceId: string): Promise<any[]> {
    try {
      return await apiRequest(`/workspaces/${workspaceId}/timeline-tasks`);
    } catch (error) {
      console.error('Failed to fetch timeline tasks:', error);
      throw error;
    }
  }

  async createTimelineTask(workspaceId: string, taskData: any): Promise<any> {
    try {
      const task = await apiRequest(`/workspaces/${workspaceId}/timeline-tasks`, {
        method: 'POST',
        body: JSON.stringify(taskData),
      });

      // Activity is logged in the backend
      return task;
    } catch (error) {
      console.error('Failed to create timeline task:', error);
      throw error;
    }
  }

  async updateTimelineTask(taskId: string, updates: any): Promise<void> {
    try {
      await apiRequest(`/timeline-tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Failed to update timeline task:', error);
      throw error;
    }
  }

  async deleteTimelineTask(taskId: string): Promise<void> {
    try {
      await apiRequest(`/timeline-tasks/${taskId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete timeline task:', error);
      throw error;
    }
  }

  // Timeline Assignments
  async getTimelineAssignments(params: { taskId?: string; userId?: string } = {}): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params.taskId) queryParams.append('task_id', params.taskId);
      if (params.userId) queryParams.append('user_id', params.userId);
      
      const url = `/timeline-assignments${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      return await apiRequest(url);
    } catch (error) {
      console.error('Failed to fetch timeline assignments:', error);
      throw error;
    }
  }

  async createTimelineAssignment(assignmentData: any): Promise<any> {
    try {
      const assignment = await apiRequest('/timeline-assignments', {
        method: 'POST',
        body: JSON.stringify(assignmentData),
      });

      // Activity is logged in the backend
      return assignment;
    } catch (error) {
      console.error('Failed to create timeline assignment:', error);
      throw error;
    }
  }

  // Timeline Milestones
  async getTimelineMilestones(workspaceId: string): Promise<any[]> {
    try {
      return await apiRequest(`/workspaces/${workspaceId}/milestones`);
    } catch (error) {
      console.error('Failed to fetch timeline milestones:', error);
      throw error;
    }
  }

  async createTimelineMilestone(workspaceId: string, milestoneData: any): Promise<any> {
    try {
      const milestone = await apiRequest(`/workspaces/${workspaceId}/milestones`, {
        method: 'POST',
        body: JSON.stringify(milestoneData),
      });

      // Activity is logged in the backend
      return milestone;
    } catch (error) {
      console.error('Failed to create timeline milestone:', error);
      throw error;
    }
  }

  // Timeline Dependencies
  async getTimelineDependencies(workspaceId?: string): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      if (workspaceId) queryParams.append('workspace_id', workspaceId);
      
      const url = `/timeline-dependencies${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      return await apiRequest(url);
    } catch (error) {
      console.error('Failed to fetch timeline dependencies:', error);
      throw error;
    }
  }

  async createTimelineDependency(dependencyData: any): Promise<any> {
    try {
      const dependency = await apiRequest('/timeline-dependencies', {
        method: 'POST',
        body: JSON.stringify(dependencyData),
      });

      // Activity is logged in the backend
      return dependency;
    } catch (error) {
      console.error('Failed to create timeline dependency:', error);
      throw error;
    }
  }

  // New method with improved flow
  async createWorkspaceForProject(projectId: string, type: WorkspaceType): Promise<{
    workspace: BaseWorkspace;
    isNew: boolean;
    message: string;
  }> {
    // First check if a workspace of this type already exists for this project
    const existingWorkspace = await this.getExistingWorkspace(projectId, type);
    
    if (existingWorkspace) {
      return {
        workspace: existingWorkspace,
        isNew: false,
        message: `Existing ${type} found for this project`
      };
    }
    
    // If no existing workspace, create a new one
    // Determine mode
    const isWP = typeof window !== 'undefined' && !!window.pulse2;

    // Get project details to create a meaningful workspace name
    let projectName = 'Project';
    try {
      if (isWP) {
        // Fetch via REST
        const projectResp = await fetchProject(projectId);
        projectName = projectResp?.name || 'Project';
      } else {
        const project = await mockApi.getProject(projectId);
        projectName = project.name || 'Project';
      }
    } catch (e) {
      console.warn('Could not fetch project details:', e);
    }
    
    const userId = (typeof window !== 'undefined' && localStorage.getItem('userId')) || 'current-user';

    const baseData = {
      projectId,
      type,
      name: `${projectName} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      createdBy: userId,
      collaborators: [userId],
      settings: {
        isPublic: false,
        allowComments: true,
        allowEditing: true,
        autoSave: true
      }
    } as Omit<BaseWorkspace, 'id' | 'createdAt' | 'updatedAt'>;

    // Persist to server or mock
    const created = await this.createWorkspace(baseData);

    // Refresh cache for the project
    await this.getWorkspacesByProject(projectId);

    return {
      workspace: created,
      isNew: true,
      message: `New ${type} successfully created`
    };
  }
  
  // New method to keep workspaces in sync with project changes
  private setupProjectSyncListener(projectId: string, workspaceId: string, workspaceType: WorkspaceType) {
    // In a real app, this would set up a websocket or poll for changes
    // For our mock implementation, we'll use the mockApi's event system when it's implemented
    console.log(`Setting up sync between project ${projectId} and ${workspaceType} ${workspaceId}`);
    
    // Register this workspace for updates - to be implemented with events
    const syncInfo = {
      projectId,
      workspaceId,
      workspaceType,
      lastSync: new Date().toISOString()
    };
    
    // Store sync info for later use
    if (!this._projectSyncMap) {
      this._projectSyncMap = new Map();
    }
    
    if (!this._projectSyncMap.has(projectId)) {
      this._projectSyncMap.set(projectId, []);
    }
    
    this._projectSyncMap.get(projectId)?.push(syncInfo);
  }
  
  // Map to track project sync information
  private _projectSyncMap?: Map<string, Array<{
    projectId: string;
    workspaceId: string;
    workspaceType: WorkspaceType;
    lastSync: string;
  }>>;
  
  // Method to update workspaces when projects change
  async syncProjectChanges(projectId: string) {
    // Check if we have any workspaces registered for this project
    const syncInfos = this._projectSyncMap?.get(projectId);
    if (!syncInfos || syncInfos.length === 0) return;
    
    try {
      // Get the latest project data
      const project = await mockApi.getProject(projectId);
      
      // Update each registered workspace
      for (const syncInfo of syncInfos) {
        const { workspaceId, workspaceType } = syncInfo;
        
        // Find the workspace
        const workspace = this.workspaces.find(ws => ws.id === workspaceId);
        if (!workspace) continue;
        
        // Update based on workspace type
        if (workspaceType === 'moodboard') {
          this.updateMoodboardFromProject(workspace, project);
        } else if (workspaceType === 'whiteboard') {
          this.updateWhiteboardFromProject(workspace, project);
        }
        
        // Update sync timestamp
        syncInfo.lastSync = new Date().toISOString();
      }
    } catch (error) {
      console.error(`Failed to sync workspaces for project ${projectId}:`, error);
    }
  }
  
  // Update moodboard with project changes
  private updateMoodboardFromProject(moodboard: any, project: any) {
    // Only update if it's a moodboard
    if (moodboard.type !== 'moodboard') return;
    
    // Update name if project name changed
    if (project.name && !moodboard.name.includes(project.name)) {
      moodboard.name = `${project.name} Moodboard`;
    }
    
    // Sync images (add new ones, don't remove existing ones)
    if (project.media && Array.isArray(project.media)) {
      const existingImageIds = new Set((moodboard.images || []).map((img: any) => img.id));
      
      // Add new images that aren't already in the moodboard
      const newImages = project.media
        .filter((media: any) => !existingImageIds.has(media.id))
        .map((media: any) => ({
          id: media.id,
          type: 'image',
          url: media.url,
          filename: media.filename,
          category: media.type
        }));
      
      if (newImages.length > 0) {
        moodboard.images = [...(moodboard.images || []), ...newImages];
        moodboard.updatedAt = new Date().toISOString();
      }
    }
    
    // Sync links (add new ones, don't remove existing ones)
    if (project.externalLinks && Array.isArray(project.externalLinks)) {
      const existingLinkIds = new Set((moodboard.links || []).map((link: any) => link.id));
      
      // Add new links that aren't already in the moodboard
      const newLinks = project.externalLinks
        .filter((link: any) => !existingLinkIds.has(link.id))
        .map((link: any) => ({
          id: link.id,
          type: 'link',
          url: link.url,
          title: link.name
        }));
      
      if (newLinks.length > 0) {
        moodboard.links = [...(moodboard.links || []), ...newLinks];
        moodboard.updatedAt = new Date().toISOString();
      }
    }
  }
  
  // Update whiteboard with project changes
  private updateWhiteboardFromProject(whiteboard: any, project: any) {
    // Only update if it's a whiteboard
    if (whiteboard.type !== 'whiteboard') return;
    
    // Update name if project name changed
    if (project.name && !whiteboard.name.includes(project.name)) {
      whiteboard.name = `${project.name} Whiteboard`;
    }
    
    // Create a map of existing images by ID
    const existingImageIds = new Set();
    whiteboard.categories?.forEach((category: any) => {
      category.images?.forEach((image: any) => {
        // Store original ID if available, otherwise just the image ID
        const originalId = image.originalId || image.id;
        existingImageIds.add(originalId);
      });
    });
    
    // Process new media by category
    if (project.media && Array.isArray(project.media)) {
      // Group new media by category
      const mediaByCategory: Record<string, any[]> = {};
      
      project.media.forEach((media: any) => {
        // Skip existing images
        if (existingImageIds.has(media.id)) return;
        
        const categoryName = media.type || "Other";
        if (!mediaByCategory[categoryName]) {
          mediaByCategory[categoryName] = [];
        }
        mediaByCategory[categoryName].push(media);
      });
      
      // Process each category
      Object.entries(mediaByCategory).forEach(([categoryName, mediaItems]) => {
        if (mediaItems.length === 0) return;
        
        // Find existing category or create new one
        let category = whiteboard.categories?.find((c: any) => c.name === categoryName);
        
        if (!category) {
          // Create new category
          const categoryId = `cat-${Date.now()}-${categoryName.replace(/\s+/g, '-').toLowerCase()}`;
          category = {
            id: categoryId,
            name: categoryName,
            color: this.getCategoryColor(categoryName),
            isMinimized: false,
            images: []
          };
          
          // Add to categories
          whiteboard.categories = [...(whiteboard.categories || []), category];
        }
        
        // Add new images to the category
        const newImages = mediaItems.map((media: any) => ({
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          originalId: media.id, // Keep track of original ID for future syncing
          url: media.url,
          filename: media.filename,
          categoryId: category.id,
          label: media.filename,
          uploadedBy: localStorage.getItem('userId') || 'current-user',
          uploadedAt: new Date().toISOString(),
          pins: [],
          comments: []
        }));
        
        category.images = [...category.images, ...newImages];
      });
      
      whiteboard.updatedAt = new Date().toISOString();
    }
  }
  
  // Helper to get a consistent color for each category type
  private getCategoryColor(categoryName: string): string {
    const colorMap: Record<string, string> = {
      "Final Render": "#3b82f6", // blue
      "Clay Render": "#10b981", // green
      "Client Reference": "#8b5cf6", // purple
      "Concept": "#f59e0b", // amber
      "Other": "#6b7280" // gray
    };
    
    return colorMap[categoryName as keyof typeof colorMap] || "#6b7280";
  }

  // Method to get workspaces from localStorage
  private getCachedWorkspaces(): BaseWorkspace[] {
    try {
      const cached = localStorage.getItem('workspaces');
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error reading cached workspaces:', error);
      return [];
    }
  }
}

export const workspaceService = new WorkspaceService();