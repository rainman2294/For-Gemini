import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceService } from '@/services/workspaceService';
import { BaseWorkspace, WorkspaceType } from '@/types/workspace';

export function useWorkspaces(projectId?: string) {
  const queryClient = useQueryClient();

  const enabled = typeof window !== 'undefined';

  const { data, isLoading, error } = useQuery<BaseWorkspace[]>({
    queryKey: ['workspaces', projectId || 'all'],
    queryFn: async () => {
      if (projectId) return workspaceService.getWorkspacesByProject(projectId);
      return workspaceService.fetchAllWorkspaces();
    },
    enabled,
  });

  const createMutation = useMutation({
    mutationFn: async (input: { projectId: string; type: WorkspaceType }) => {
      return workspaceService.createWorkspaceForProject(input.projectId, input.type);
    },
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', 'all'] });
    },
  });

  return {
    workspaces: data || [],
    isLoading,
    error,
    createWorkspaceForProject: createMutation.mutateAsync,
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', projectId || 'all'] });
    },
  };
}