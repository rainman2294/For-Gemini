// User roles with WordPress compatibility
export type UserRole = 'admin' | 'project_manager' | 'client' | 'artist' | 'viewer';

// WordPress user status
export type WordPressUserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

// User profile with WordPress integration
export interface UserProfile {
  id: string;
  wordpressId?: number; // WordPress user ID
  email: string;
  username: string; // WordPress username
  displayName: string;
  avatar?: string;
  bio?: string;
  role: UserRole;
  permissions: UserPermissions;
  lastActive: Date;
  projects: string[];
  managedUserIds: string[]; // For project managers
  socialLinks?: SocialLink[];
  notificationsEnabled: boolean;
  timezone: string;
  status: WordPressUserStatus;
  createdAt: Date;
  updatedAt: Date;
  // Password management
  passwordChangeRequested?: boolean;
  passwordChangeRequestedAt?: Date;
  lastPasswordChange?: Date;
}

// Enhanced permissions system
export interface UserPermissions {
  // Project permissions
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canArchiveProjects: boolean;
  canViewAllProjects: boolean;
  
  // Team management
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canChangeMemberRoles: boolean;
  canViewTeamMembers: boolean;
  
  // Content permissions
  canAddNotes: boolean;
  canEditNotes: boolean;
  canDeleteNotes: boolean;
  canUploadMedia: boolean;
  canDeleteMedia: boolean;
  
  // Project management
  canChangeProjectStatus: boolean;
  canChangeProjectPriority: boolean;
  canExtendDeadlines: boolean;
  canAssignTasks: boolean;
  
  // Analytics and reporting
  canViewAnalytics: boolean;
  canExportData: boolean;
  canViewActivityLogs: boolean;
  
  // User management
  canCreateUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  canResetPasswords: boolean;
}

// Role-based permission configurations
export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  admin: {
    canCreateProjects: true,
    canEditProjects: true,
    canDeleteProjects: true,
    canArchiveProjects: true,
    canViewAllProjects: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canChangeMemberRoles: true,
    canViewTeamMembers: true,
    canAddNotes: true,
    canEditNotes: true,
    canDeleteNotes: true,
    canUploadMedia: true,
    canDeleteMedia: true,
    canChangeProjectStatus: true,
    canChangeProjectPriority: true,
    canExtendDeadlines: true,
    canAssignTasks: true,
    canViewAnalytics: true,
    canExportData: true,
    canViewActivityLogs: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canResetPasswords: true,
  },
  project_manager: {
    canCreateProjects: true,
    canEditProjects: true,
    canDeleteProjects: false,
    canArchiveProjects: true,
    canViewAllProjects: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canChangeMemberRoles: true,
    canViewTeamMembers: true,
    canAddNotes: true,
    canEditNotes: true,
    canDeleteNotes: true,
    canUploadMedia: true,
    canDeleteMedia: true,
    canChangeProjectStatus: true,
    canChangeProjectPriority: true,
    canExtendDeadlines: true,
    canAssignTasks: true,
    canViewAnalytics: true,
    canExportData: true,
    canViewActivityLogs: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: false,
    canResetPasswords: true,
  },
  client: {
    canCreateProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canArchiveProjects: false,
    canViewAllProjects: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canChangeMemberRoles: false,
    canViewTeamMembers: true,
    canAddNotes: true,
    canEditNotes: false,
    canDeleteNotes: false,
    canUploadMedia: true,
    canDeleteMedia: false,
    canChangeProjectStatus: false,
    canChangeProjectPriority: false,
    canExtendDeadlines: false,
    canAssignTasks: false,
    canViewAnalytics: false,
    canExportData: false,
    canViewActivityLogs: true,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canResetPasswords: false,
  },
  artist: {
    canCreateProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canArchiveProjects: false,
    canViewAllProjects: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canChangeMemberRoles: false,
    canViewTeamMembers: true,
    canAddNotes: true,
    canEditNotes: true,
    canDeleteNotes: false,
    canUploadMedia: true,
    canDeleteMedia: false,
    canChangeProjectStatus: false,
    canChangeProjectPriority: false,
    canExtendDeadlines: false,
    canAssignTasks: false,
    canViewAnalytics: false,
    canExportData: false,
    canViewActivityLogs: true,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canResetPasswords: false,
  },
  viewer: {
    canCreateProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canArchiveProjects: false,
    canViewAllProjects: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canChangeMemberRoles: false,
    canViewTeamMembers: true,
    canAddNotes: false,
    canEditNotes: false,
    canDeleteNotes: false,
    canUploadMedia: false,
    canDeleteMedia: false,
    canChangeProjectStatus: false,
    canChangeProjectPriority: false,
    canExtendDeadlines: false,
    canAssignTasks: false,
    canViewAnalytics: false,
    canExportData: false,
    canViewActivityLogs: true,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canResetPasswords: false,
  },
};

// Team member with project access
export interface TeamMember {
  id: string;
  wordpressId?: number;
  profile: UserProfile;
  projectAccess: ProjectAccess[];
  joinedAt: Date;
  lastActivity: Date;
  status: WordPressUserStatus;
}

// Project access permissions
export interface ProjectAccess {
  projectId: string;
  projectName: string;
  permissions: UserPermissions;
  grantedBy: string;
  grantedAt: Date;
}

// Team invitation with WordPress integration
export interface TeamInvitation {
  id: string;
  email: string;
  username?: string; // Generated username for new users
  invitedBy: string;
  invitedByName: string;
  projectId?: string;
  projectName?: string;
  role: UserRole;
  permissions: UserPermissions;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  wordpressUserId?: number; // Once user is created in WordPress
}

// Password change request
export interface PasswordChangeRequest {
  id: string;
  userId: string;
  userEmail: string;
  requestedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'completed' | 'expired';
  token: string;
  requestedBy?: string; // If requested by admin/PM
}

// Social links
export interface SocialLink {
  platform: string;
  url: string;
}

// Team statistics
export interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  projectsCount: number;
  averageResponseTime: number;
  memberActivity: MemberActivity[];
}

// Member activity for analytics
export interface MemberActivity {
  userId: string;
  userName: string;
  activityCount: number;
  lastActivity: Date;
}

// WordPress API response types
export interface WordPressUserResponse {
  ID: number;
  user_login: string;
  user_email: string;
  display_name: string;
  user_registered: string;
  user_status: number;
  roles: string[];
  meta?: Record<string, string | number | boolean>;
}

export interface WordPressCreateUserRequest {
  username: string;
  email: string;
  password: string;
  display_name: string;
  role: string;
  meta?: Record<string, string | number | boolean>;
}

export interface WordPressUpdateUserRequest {
  ID: number;
  user_email?: string;
  display_name?: string;
  user_pass?: string;
  role?: string;
  meta?: Record<string, string | number | boolean>;
} 

export interface User {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'member' | 'viewer';
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isActive: boolean;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    language?: string;
    timezone?: string;
    notifications?: {
      email: boolean;
      push: boolean;
      desktop: boolean;
    };
  };
}

export interface UserProfile extends User {
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
}

export interface TeamMember extends User {
  teamId: string;
  joinedAt: string;
  status: 'active' | 'inactive' | 'pending';
} 