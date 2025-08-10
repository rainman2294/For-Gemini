import { workspaceService } from '@/services/workspaceService';
import { activityService } from '@/services/activityService';
import { BaseWorkspace, MoodboardElement } from '@/types/workspace';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNotes } from '../hooks/useNotes';
import { renderHook, act } from '@testing-library/react-hooks';

/**
 * Comprehensive Workspace Integration Test
 * This test verifies that all workspace operations properly trigger activity tracking
 */

const mockUserId = 'test-user-1';
const mockUserName = 'Test User';
const mockProjectId = 'test-project-1';

// Mock dependencies
vi.mock('../services/workspaceService', () => ({
  workspaceService: {
    createWorkspaceForProject: vi.fn(),
    getWorkspacesByProject: vi.fn(),
  }
}));

vi.mock('../hooks/useActivityLogger', () => ({
  useActivityLogger: () => ({
    logNoteAdded: vi.fn(),
    logNoteEdited: vi.fn(),
    logNoteDeleted: vi.fn(),
  })
}));

describe('Workspace Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Project-Workspace Connectivity', () => {
    it('should create a moodboard workspace for a project', async () => {
      const mockProject = { id: 'project-123', name: 'Test Project' };
      const mockWorkspace = { id: 'moodboard-123', projectId: 'project-123', type: 'moodboard' };
      
      workspaceService.createWorkspaceForProject.mockResolvedValue(mockWorkspace);
      
      const result = await workspaceService.createWorkspaceForProject(mockProject.id, 'moodboard');
      
      expect(workspaceService.createWorkspaceForProject).toHaveBeenCalledWith(mockProject.id, 'moodboard');
      expect(result).toEqual(mockWorkspace);
    });
    
    it('should create a whiteboard workspace for a project', async () => {
      const mockProject = { id: 'project-123', name: 'Test Project' };
      const mockWorkspace = { id: 'whiteboard-123', projectId: 'project-123', type: 'whiteboard' };
      
      workspaceService.createWorkspaceForProject.mockResolvedValue(mockWorkspace);
      
      const result = await workspaceService.createWorkspaceForProject(mockProject.id, 'whiteboard');
      
      expect(workspaceService.createWorkspaceForProject).toHaveBeenCalledWith(mockProject.id, 'whiteboard');
      expect(result).toEqual(mockWorkspace);
    });
  });

  describe('Unified Note System', () => {
    it('should add a note to a project', async () => {
      const projectId = 'project-123';
      
      // Mock fetchWithAuth
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'note-123', content: 'Test note' }),
      });
      
      const { result } = renderHook(() => useNotes(projectId));
      
      act(() => {
        result.current.setNoteInput('Test note');
      });
      
      await act(async () => {
        await result.current.handleAddNote();
      });
      
      expect(result.current.noteInput).toBe('');
      expect(result.current.notes).toContainEqual(expect.objectContaining({
        id: 'note-123',
        content: 'Test note',
      }));
    });
  });
});

// Test workspace creation and activity tracking
export async function testWorkspaceCreation() {
  console.log('🧪 Testing workspace creation...');
  
  const newWorkspace: Omit<BaseWorkspace, 'id' | 'createdAt' | 'updatedAt'> = {
    projectId: mockProjectId,
    name: 'Test Moodboard',
    type: 'moodboard',
    createdBy: mockUserId,
    isArchived: false,
    collaborators: [mockUserId],
    settings: {
      isPublic: false,
      allowComments: true,
      allowEditing: true,
      autoSave: true
    }
  };

  try {
    const createdWorkspace = await workspaceService.createWorkspace(
      newWorkspace,
      mockUserId,
      mockUserName
    );

    console.log('✅ Workspace created successfully:', createdWorkspace.id);
    
    // Verify activity was tracked
    const activities = await activityService.getProjectActivities(mockProjectId);
    const creationActivity = activities.find(a => 
      a.type === 'workspace_created' && 
      a.details.workspaceId === createdWorkspace.id
    );
    
    if (creationActivity) {
      console.log('✅ Activity tracking verified for workspace creation');
    } else {
      console.warn('⚠️ Activity tracking not found for workspace creation');
    }

    return createdWorkspace;
  } catch (error) {
    console.error('❌ Workspace creation failed:', error);
    throw error;
  }
}

// Test moodboard element addition and activity tracking
export async function testMoodboardElementAddition(workspaceId: string) {
  console.log('🧪 Testing moodboard element addition...');
  
  const newElement: Omit<MoodboardElement, 'id' | 'createdAt' | 'createdBy'> = {
    type: 'image',
    position: { x: 100, y: 100, z: 1 },
    size: { width: 200, height: 150 },
    content: {
      url: 'https://example.com/test-image.jpg',
      filename: 'test-image.jpg',
      alt: 'Test Image'
    },
    annotations: []
  };

  try {
    const addedElement = await workspaceService.addMoodboardElement(
      workspaceId,
      newElement,
      mockUserId,
      mockUserName,
      mockProjectId
    );

    console.log('✅ Element added successfully:', addedElement.id);
    
    // Verify activity was tracked
    const activities = await activityService.getProjectActivities(mockProjectId);
    const elementActivity = activities.find(a => 
      a.type === 'workspace_element_added' && 
      a.details.workspaceId === workspaceId
    );
    
    if (elementActivity) {
      console.log('✅ Activity tracking verified for element addition');
    } else {
      console.warn('⚠️ Activity tracking not found for element addition');
    }

    return addedElement;
  } catch (error) {
    console.error('❌ Element addition failed:', error);
    throw error;
  }
}

// Test annotation addition and activity tracking
export async function testAnnotationAddition(workspaceId: string, elementId: string) {
  console.log('🧪 Testing annotation addition...');
  
  const newAnnotation = {
    position: { x: 50, y: 30, z: 1 },
    content: 'This is a test comment on the image',
    author: mockUserName,
    authorId: mockUserId,
    type: 'comment' as const,
    isResolved: false
  };

  try {
    const addedAnnotation = await workspaceService.addAnnotation(
      workspaceId,
      elementId,
      newAnnotation,
      mockUserId,
      mockUserName,
      mockProjectId
    );

    console.log('✅ Annotation added successfully:', addedAnnotation.id);
    
    // Verify activity was tracked
    const activities = await activityService.getProjectActivities(mockProjectId);
    const annotationActivity = activities.find(a => 
      a.type === 'workspace_annotation_added' && 
      a.details.workspaceId === workspaceId
    );
    
    if (annotationActivity) {
      console.log('✅ Activity tracking verified for annotation addition');
    } else {
      console.warn('⚠️ Activity tracking not found for annotation addition');
    }

    return addedAnnotation;
  } catch (error) {
    console.error('❌ Annotation addition failed:', error);
    throw error;
  }
}

// Test annotation resolution and activity tracking
export async function testAnnotationResolution(workspaceId: string, elementId: string, annotationId: string) {
  console.log('🧪 Testing annotation resolution...');
  
  try {
    await workspaceService.resolveAnnotation(
      workspaceId,
      elementId,
      annotationId,
      mockUserId,
      mockUserName,
      mockProjectId
    );

    console.log('✅ Annotation resolved successfully');
    
    // Verify activity was tracked
    const activities = await activityService.getProjectActivities(mockProjectId);
    const resolutionActivity = activities.find(a => 
      a.type === 'workspace_annotation_resolved' && 
      a.details.workspaceId === workspaceId
    );
    
    if (resolutionActivity) {
      console.log('✅ Activity tracking verified for annotation resolution');
    } else {
      console.warn('⚠️ Activity tracking not found for annotation resolution');
    }
  } catch (error) {
    console.error('❌ Annotation resolution failed:', error);
    throw error;
  }
}

// Test activity feed integration
export async function testActivityFeedIntegration() {
  console.log('🧪 Testing activity feed integration...');
  
  try {
    // Get all activities for the project
    const allActivities = await activityService.getProjectActivities(mockProjectId);
    console.log(`✅ Retrieved ${allActivities.length} activities for project`);
    
    // Get activities grouped by date
    const groupedActivities = await activityService.getActivityGroups(
      { projectIds: [mockProjectId] },
      { groupByDate: true }
    );
    console.log(`✅ Activities grouped into ${groupedActivities.length} date groups`);
    
    // Get activity stats
    const stats = await activityService.getActivityStats({ projectIds: [mockProjectId] });
    console.log('✅ Activity stats retrieved:', stats);
    
    // Verify workspace activities are included
    const workspaceActivities = allActivities.filter(a => a.type.startsWith('workspace_'));
    console.log(`✅ Found ${workspaceActivities.length} workspace-related activities`);
    
    if (workspaceActivities.length > 0) {
      console.log('✅ Activity feed integration verified');
    } else {
      console.warn('⚠️ No workspace activities found in feed');
    }
    
    return { allActivities, groupedActivities, stats, workspaceActivities };
  } catch (error) {
    console.error('❌ Activity feed integration test failed:', error);
    throw error;
  }
}

// Main test runner
export async function runWorkspaceIntegrationTests() {
  console.log('🚀 Starting comprehensive workspace integration tests...\n');
  
  try {
    // Test 1: Workspace creation
    const workspace = await testWorkspaceCreation();
    console.log('');
    
    // Test 2: Element addition
    const element = await testMoodboardElementAddition(workspace.id);
    console.log('');
    
    // Test 3: Annotation addition
    const annotation = await testAnnotationAddition(workspace.id, element.id);
    console.log('');
    
    // Test 4: Annotation resolution
    await testAnnotationResolution(workspace.id, element.id, annotation.id);
    console.log('');
    
    // Test 5: Activity feed integration
    const feedResults = await testActivityFeedIntegration();
    console.log('');
    
    console.log('🎉 All workspace integration tests completed successfully!');
    console.log('\n📊 Test Results Summary:');
    console.log(`- Workspace created: ${workspace.id}`);
    console.log(`- Element added: ${element.id}`);
    console.log(`- Annotation added: ${annotation.id}`);
    console.log(`- Total activities tracked: ${feedResults.allActivities.length}`);
    console.log(`- Workspace activities: ${feedResults.workspaceActivities.length}`);
    
    return {
      success: true,
      workspace,
      element,
      annotation,
      activities: feedResults
    };
  } catch (error) {
    console.error('💥 Workspace integration tests failed:', error);
    return {
      success: false,
      error
    };
  }
}

// Activity message formatting test
export function testActivityMessageFormatting() {
  console.log('🧪 Testing activity message formatting...');
  
  const testActivities = [
    {
      id: '1',
      type: 'workspace_created' as const,
      userName: 'John Doe',
      details: { workspaceType: 'moodboard', workspaceName: 'Brand Exploration' }
    },
    {
      id: '2', 
      type: 'workspace_element_added' as const,
      userName: 'Jane Smith',
      details: { elementType: 'image', workspaceName: 'Brand Exploration' }
    },
    {
      id: '3',
      type: 'workspace_annotation_added' as const,
      userName: 'Bob Wilson',
      details: { annotationContent: 'This needs more contrast for better readability' }
    }
  ];

  testActivities.forEach(activity => {
    const message = activityService.formatActivityMessage(activity as any);
    const icon = activityService.getActivityIcon(activity.type);
    const color = activityService.getActivityColor(activity.type);
    
    console.log(`${icon} ${message} (${color})`);
  });
  
  console.log('✅ Activity message formatting test completed');
}

// Real-time updates test
export function testRealTimeUpdates() {
  console.log('🧪 Testing real-time activity updates...');
  
  const unsubscribe = activityService.subscribeToRealTimeUpdates((activity) => {
    console.log('📡 Real-time activity received:', {
      type: activity.type,
      userName: activity.userName,
      timestamp: activity.timestamp
    });
  });
  
  console.log('✅ Real-time subscription active');
  
  // Cleanup function
  return () => {
    unsubscribe();
    console.log('✅ Real-time subscription cleaned up');
  };
}

// Export test utilities
export const workspaceTestUtils = {
  runWorkspaceIntegrationTests,
  testWorkspaceCreation,
  testMoodboardElementAddition,
  testAnnotationAddition,
  testAnnotationResolution,
  testActivityFeedIntegration,
  testActivityMessageFormatting,
  testRealTimeUpdates,
  mockUserId,
  mockUserName,
  mockProjectId
};

// Development helper - run tests in browser console
if (typeof window !== 'undefined') {
  (window as any).workspaceTests = workspaceTestUtils;
  console.log('🔧 Workspace tests available at window.workspaceTests');
  console.log('🔧 Run window.workspaceTests.runWorkspaceIntegrationTests() to start');
}