import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

// User types that match your existing structure
export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  role: string;
  bio?: string;
  timezone: string;
  notifications_enabled: string;
  status: string;
  created_at: string;
  last_active: string;
}

export interface UserCredentials {
  username: string;
  password: string;
}

export interface CreateUserData {
  email: string;
  display_name: string;
  role: string;
  bio?: string;
  timezone?: string;
  notifications_enabled?: boolean;
}

export interface Invitation {
  id: string;
  email: string;
  username?: string;
  invited_by: string;
  invited_by_name: string;
  project_id?: string;
  project_name?: string;
  role: string;
  permissions: string;
  status: string;
  expires_at: string;
  created_at: string;
}

// Get API config from window object (your existing pattern)
const getApiConfig = () => {
  return typeof window !== 'undefined' && window.pulse2 ? window.pulse2 : null;
};

// Get JWT token from localStorage (your existing pattern)
const getJwtToken = () => {
  return typeof window !== 'undefined' ? localStorage.getItem('jwtToken') || '' : '';
};

const refreshToken = async () => {
  const apiConfig = getApiConfig();
  if (!apiConfig) throw new Error('API not available');
  const response = await fetch(`${apiConfig.apiUrl}/token/refresh`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getJwtToken()}` },
  });
  if (!response.ok) throw new Error('Token refresh failed');
  const data = await response.json();
  localStorage.setItem('jwtToken', data.token);
  return data.token;
};

// Add JWT token expiry checking
const isTokenExpired = (token: string): boolean => {
  if (!token) return true;
  
  try {
    // JWT token consists of three parts: header.payload.signature
    const payload = token.split('.')[1];
    if (!payload) return true;
    
    // Decode the base64 payload
    const decodedPayload = JSON.parse(atob(payload));
    
    // Check if token has expiration claim
    if (!decodedPayload.exp) return false;
    
    // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
    const expiryTime = decodedPayload.exp * 1000;
    return Date.now() >= expiryTime;
  } catch (error) {
    console.error('Error checking token expiry:', error);
    return true;
  }
};

// Add token refresh before expiry
const checkAndRefreshTokenIfNeeded = async () => {
  const token = getJwtToken();
  
  // If no token or token is expired, don't try to refresh
  if (!token) return;
  
  try {
    // Get payload to check expiry time
    const payload = token.split('.')[1];
    if (!payload) return;
    
    const decodedPayload = JSON.parse(atob(payload));
    
    // If no expiry or already expired, return
    if (!decodedPayload.exp) return;
    
    const expiryTime = decodedPayload.exp * 1000;
    const currentTime = Date.now();
    
    // If token expires in less than 5 minutes, refresh it
    if (expiryTime - currentTime < 5 * 60 * 1000) {
      await refreshToken();
    }
  } catch (error) {
    console.error('Error in token refresh check:', error);
  }
};

// Enhance fetchWithAuth to check token expiry
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  await checkAndRefreshTokenIfNeeded();
  
  const apiConfig = getApiConfig();
  let token = getJwtToken();
  const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
  if (apiConfig?.nonce) headers['X-WP-Nonce'] = apiConfig.nonce;
  
  let response = await fetch(url, { ...options, headers });
  
  // If unauthorized, try to refresh token once
  if (response.status === 401) {
    try {
      token = await refreshToken();
      headers['Authorization'] = `Bearer ${token}`;
      response = await fetch(url, { ...options, headers });
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Handle authentication failure (e.g., redirect to login)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userDisplayName');
        // Optional: Redirect to login or show login modal
      }
    }
  }
  
  return response;
};

/**
 * Custom hook for managing users, invitations, and related operations.
 * Provides state, queries, and mutations for user management.
 * @returns Object containing user data, loading states, and management functions
 */
export function useUserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apiConfig = getApiConfig();

  // Get current user from localStorage (your existing pattern)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('userId');
      const userDisplayName = localStorage.getItem('userDisplayName');
      const jwtToken = localStorage.getItem('jwtToken');
      
      if (userId && userDisplayName && jwtToken) {
        return {
          id: userId,
          username: userDisplayName,
          email: '',
          display_name: userDisplayName,
          role: 'subscriber',
          timezone: 'UTC',
          notifications_enabled: 'true',
          status: 'active',
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString(),
        };
      }
    }
    return null;
  });

  // Fetch users with presence
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      if (!apiConfig) return [];
      
      const [usersResponse, presenceResponse] = await Promise.all([
        fetchWithAuth(`${apiConfig.apiUrl}/users`),
        fetchWithAuth(`${apiConfig.apiUrl}/presence`)
      ]);
      
      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const usersData = await usersResponse.json();
      const presenceData = presenceResponse.ok ? await presenceResponse.json() : [];
      
      // Merge presence data with users
      return usersData.map((user: User) => {
        const presence = presenceData.find((p: { userId: string; isOnline?: boolean; lastActivity?: string }) => p.userId === user.id);
        return {
          ...user,
          isOnline: presence?.isOnline || false,
          lastActivity: presence?.lastActivity || null,
        };
      });
    },
    enabled: !!apiConfig && !!currentUser,
  });

  // Fetch invitations
  const { data: invitations = [], isLoading: loadingInvitations } = useQuery({
    queryKey: ['invitations'],
    queryFn: async () => {
      if (!apiConfig) return [];
      
      const response = await fetchWithAuth(`${apiConfig.apiUrl}/invitations`);
      if (!response.ok) {
        throw new Error('Failed to fetch invitations');
      }
      return response.json();
    },
    enabled: !!apiConfig && !!currentUser,
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserData) => {
      if (!apiConfig) throw new Error('API not available');
      
      const response = await fetchWithAuth(`${apiConfig.apiUrl}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create user');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      
      toast({
        title: 'User created successfully',
        description: `User ${data.user.display_name} has been created.`,
      });

      // Show credentials if available
      if (data.credentials) {
        toast({
          title: 'User Credentials',
          description: `Username: ${data.credentials.username}\nPassword: ${data.credentials.password}\n\nPlease share these credentials securely with the user.`,
          duration: 10000,
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Failed to create user',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
      if (!apiConfig) throw new Error('API not available');
      
      const response = await fetchWithAuth(`${apiConfig.apiUrl}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update user');
      }
      
      return response.json();
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'User updated successfully',
        description: `User ${user.display_name} has been updated.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update user',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!apiConfig) throw new Error('API not available');
      
      const response = await fetchWithAuth(`${apiConfig.apiUrl}/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete user');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'User deleted successfully',
        description: 'The user has been removed from the system.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete user',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: async (invitationData: {
      email: string;
      role: string;
      project_id?: string;
      project_name?: string;
    }) => {
      if (!apiConfig) throw new Error('API not available');
      
      const currentUser = getCurrentUser();
      const response = await fetchWithAuth(`${apiConfig.apiUrl}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...invitationData,
          invited_by: currentUser?.id || '',
          invited_by_name: currentUser?.display_name || '',
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create invitation');
      }
      
      return response.json();
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      const invitation = response.invitation || response;
      toast({
        title: 'Invitation sent',
        description: `Invitation has been sent to ${invitation.email}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to send invitation',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Update invitation mutation
  const updateInvitationMutation = useMutation({
    mutationFn: async ({ invitationId, updates }: { invitationId: string; updates: Partial<Invitation> }) => {
      if (!apiConfig) throw new Error('API not available');
      
      const response = await fetchWithAuth(`${apiConfig.apiUrl}/invitations/${invitationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update invitation');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({
        title: 'Invitation updated',
        description: 'The invitation has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update invitation',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Delete invitation mutation
  const deleteInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      if (!apiConfig) throw new Error('API not available');
      
      const response = await fetchWithAuth(`${apiConfig.apiUrl}/invitations/${invitationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete invitation');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({
        title: 'Invitation cancelled',
        description: 'The invitation has been cancelled.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to cancel invitation',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Password reset mutation
  const requestPasswordResetMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!apiConfig) throw new Error('API not available');
      
      const response = await fetchWithAuth(`${apiConfig.apiUrl}/password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to request password reset');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Password reset requested',
        description: 'If an account exists with this email, a password reset link has been sent.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to request password reset',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Helper functions
  const getCurrentUser = useCallback(() => currentUser, [currentUser]);

  // Update user presence on login only (removed automatic polling)
  const updatePresence = useCallback(async () => {
    if (!apiConfig || !currentUser) return;
    
    try {
      await fetchWithAuth(`${apiConfig.apiUrl}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp: new Date().toISOString() }),
      });
    } catch (error) {
      console.error('Failed to update presence:', error);
    }
  }, [apiConfig, currentUser]);

  // Update presence once on mount if user is logged in
  useEffect(() => {
    if (currentUser) {
      updatePresence();
    }
  }, [currentUser, updatePresence]);

  const hasPermission = useCallback((permission: string) => {
    // Simple permission check based on role
    if (!currentUser) return false;
    
    const rolePermissions = {
      administrator: ['all'],
      editor: ['edit_posts', 'create_users', 'invite_members'],
      author: ['edit_posts', 'add_notes'],
      contributor: ['add_notes'],
      subscriber: ['view_projects'],
    };
    
    const userRole = currentUser.role;
    const permissions = rolePermissions[userRole as keyof typeof rolePermissions] || [];
    
    return permissions.includes('all') || permissions.includes(permission);
  }, [currentUser]);

  const canManageUsers = useCallback(() => {
    return hasPermission('create_users');
  }, [hasPermission]);

  const canInviteMembers = useCallback(() => {
    return hasPermission('invite_members');
  }, [hasPermission]);

  const canEditProjects = useCallback(() => {
    return hasPermission('edit_posts');
  }, [hasPermission]);

  const canAddNotes = useCallback(() => {
    return hasPermission('add_notes');
  }, [hasPermission]);

  const getUsersByRole = useCallback((role: string) => {
    return users.filter(user => user.role === role);
  }, [users]);

  return {
    // State
    currentUser,
    users,
    invitations,
    loadingUsers,
    loadingInvitations,

    // Mutations
    createUser: createUserMutation.mutate,
    updateUser: updateUserMutation.mutate,
    deleteUser: deleteUserMutation.mutate,
    createInvitation: createInvitationMutation.mutate,
    updateInvitation: updateInvitationMutation.mutate,
    deleteInvitation: deleteInvitationMutation.mutate,
    requestPasswordReset: requestPasswordResetMutation.mutate,

    // Loading states
    isCreatingUser: createUserMutation.isPending,
    isUpdatingUser: updateUserMutation.isPending,
    isDeletingUser: deleteUserMutation.isPending,
    isCreatingInvitation: createInvitationMutation.isPending,
    isUpdatingInvitation: updateInvitationMutation.isPending,
    isDeletingInvitation: deleteInvitationMutation.isPending,
    isRequestingPasswordReset: requestPasswordResetMutation.isPending,

    // Permission checks
    hasPermission,
    canManageUsers,
    canInviteMembers,
    canEditProjects,
    canAddNotes,

    // Utility functions
    getUsersByRole,
    getCurrentUser,
  };
} 