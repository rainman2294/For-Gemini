// Core Workspace Types - Foundation for all creative features
export type WorkspaceType = 'moodboard' | 'whiteboard' | 'workflow' | 'timeline';

export interface BaseWorkspace {
  id: string;
  projectId: string;
  name: string;
  type: WorkspaceType;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  collaborators: string[]; // User IDs
  settings: WorkspaceSettings;
}

export interface WorkspaceSettings {
  isPublic: boolean;
  allowComments: boolean;
  allowEditing: boolean;
  autoSave: boolean;
}

// Moodboard Workspace Types
export interface MoodboardWorkspace extends BaseWorkspace {
  type: 'moodboard';
  canvas?: MoodboardCanvas; // Make canvas optional
  inspirationSources?: InspirationSource[];
  images?: Image[];
  links?: Link[];
  comments?: Comment[];
  tags?: string[];
  description?: string; // Add description property
}

export interface MoodboardCanvas {
  width: number;
  height: number;
  background: string;
  elements: MoodboardElement[];
}

export interface MoodboardElement {
  id: string;
  type: 'image' | 'text' | 'color-swatch' | 'link';
  position: Position;
  size: Size;
  content: ImageContent | TextContent | ColorContent | LinkContent;
  annotations: Annotation[];
  createdBy: string;
  createdAt: string;
}

export interface Position {
  x: number;
  y: number;
  z: number; // Layer order
}

export interface Size {
  width: number;
  height: number;
}

// Content type definitions
export interface ImageContent {
  url: string;
  filename?: string;
  name?: string;
  alt?: string;
}

export interface TextContent {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: string;
}

export interface ColorContent {
  color: string;
  name?: string;
  hex?: string;
}

export interface LinkContent {
  url: string;
  title?: string;
  description?: string;
  favicon?: string;
}

export interface Annotation {
  id: string;
  position: Position;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  resolved: boolean;
  replies: AnnotationReply[];
}

export interface AnnotationReply {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface InspirationSource {
  id: string;
  url: string;
  title: string;
  description?: string;
  thumbnail?: string;
  addedBy: string;
  addedAt: string;
}

export interface Image {
  id: string;
  type: 'image'; // Add type property
  url: string;
  filename?: string; // Make filename optional
  aspectRatio?: number;
}

export interface Link {
  id: string;
  type: 'link'; // Add type property
  url: string;
  title: string;
}

export interface Comment {
    id: string;
    text: string;
    createdBy: string;
    userAvatar?: string;
    createdAt: string;
}

export type MoodboardItem = Image | Link;

// Whiteboard Workspace Types
export interface WhiteboardWorkspace extends BaseWorkspace {
  type: 'whiteboard';
  canvas: WhiteboardCanvas;
}

export interface WhiteboardCanvas {
  width: number;
  height: number;
  background: string;
  elements: WhiteboardElement[];
}

export interface WhiteboardElement {
  id: string;
  type: 'drawing' | 'text' | 'sticky-note' | 'arrow' | 'shape';
  position: Position;
  size: Size;
  style: ElementStyle;
  content: DrawingContent | TextContent | StickyNoteContent | ArrowContent | ShapeContent;
  createdBy: string;
  createdAt: string;
}

export interface ElementStyle {
  color: string;
  backgroundColor?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  opacity?: number;
}

// Whiteboard content types
export interface DrawingContent {
  paths: string[]; // SVG path data
  strokeColor: string;
  strokeWidth: number;
}

export interface StickyNoteContent {
  text: string;
  color: string;
}

export interface ArrowContent {
  startPoint: Position;
  endPoint: Position;
  strokeColor: string;
  strokeWidth: number;
}

export interface ShapeContent {
  type: 'rectangle' | 'circle' | 'triangle';
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

// Workflow Workspace Types
export interface WorkflowWorkspace extends BaseWorkspace {
  type: 'workflow';
  stages: WorkflowStage[];
  currentStage: string;
  approvals: ApprovalRecord[];
}

export interface WorkflowStage {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  order: number;
  isRequired: boolean;
  assignedTo: string[];
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'blocked';
  dependencies: string[]; // Other stage IDs this stage depends on
  estimatedHours: number;
  actualHours: number;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  templateId?: string; // Reference to workflow template
  checklistItems: ChecklistItem[];
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  stageId: string;
  text: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours: number;
  actualHours?: number;
  tags: string[];
  dependencies: string[]; // Other checklist item IDs this item depends on
  assignedTo?: string;
  dueDate?: string;
  completedBy?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRecord {
  id: string;
  stageId: string;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  attachments?: string[];
}

// New Workflow Interfaces
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'design' | 'development' | 'review' | 'approval' | 'custom';
  stages: WorkflowTemplateStage[];
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export interface WorkflowTemplateStage {
  id: string;
  name: string;
  description: string;
  order: number;
  isRequired: boolean;
  estimatedHours: number;
  defaultAssigneeRole?: string;
  checklistTemplate: ChecklistTemplateItem[];
  requiresApproval: boolean;
}

export interface ChecklistTemplateItem {
  id: string;
  text: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours: number;
  tags: string[];
  isRequired: boolean;
}

export interface StageTransition {
  id: string;
  fromStageId: string;
  toStageId: string;
  workspaceId: string;
  condition: 'manual' | 'auto_on_completion' | 'auto_on_approval' | 'conditional';
  rules?: TransitionRule[];
  createdAt: string;
}

export interface TransitionRule {
  type: 'checklist_complete' | 'approval_received' | 'time_elapsed' | 'custom';
  parameters: Record<string, any>;
}

export interface WorkflowMetrics {
  id: string;
  workspaceId: string;
  totalStages: number;
  completedStages: number;
  averageStageCompletionTime: number; // in hours
  bottleneckStages: string[]; // Stage IDs that take longest
  teamEfficiency: number; // percentage
  onTimeDelivery: number; // percentage
  totalEstimatedHours: number;
  totalActualHours: number;
  lastUpdated: string;
}

// Timeline Workspace Types
export interface TimelineWorkspace extends BaseWorkspace {
  type: 'timeline';
  timeRange: TimeRange;
  assignments: TaskAssignment[];
  workloadSettings: WorkloadSettings;
}

export interface TimeRange {
  startDate: string;
  endDate: string;
  viewMode: 'day' | 'week' | 'month' | 'quarter';
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  assigneeId: string;
  projectId: string;
  startDate: string;
  endDate: string;
  estimatedHours: number;
  actualHours?: number;
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface WorkloadSettings {
  maxHoursPerWeek: number;
  warningThreshold: number; // Percentage of max hours
  criticalThreshold: number; // Percentage of max hours
  includeWeekends: boolean;
}

// Activity Integration Types
export interface WorkspaceActivity {
  id: string;
  workspaceId: string;
  workspaceType: WorkspaceType;
  action: WorkspaceAction;
  details: WorkspaceActivityDetails;
  performedBy: string;
  performedAt: string;
  affectedUsers: string[];
}

export interface WorkspaceActivityDetails {
  elementId?: string;
  elementType?: string;
  annotationId?: string;
  collaboratorId?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type WorkspaceAction = 
  | 'created'
  | 'updated'
  | 'deleted'
  | 'element_added'
  | 'element_updated'
  | 'element_deleted'
  | 'annotation_added'
  | 'annotation_resolved'
  | 'stage_completed'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_rejected'
  | 'task_assigned'
  | 'task_completed'
  | 'collaboration_started'
  | 'collaboration_ended';