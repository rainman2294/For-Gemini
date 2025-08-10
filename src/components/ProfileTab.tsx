import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  UserPlus, 
  Mail, 
  Users, 
  Settings, 
  Trash2, 
  Send, 
  X, 
  Edit, 
  Save, 
  Lock,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { useUserManagement } from '../hooks/useUserManagement';
import { UserRole, UserProfile, TeamInvitation } from '../types/user';
import { ProfileSection } from './ProfileSection';
import { TeamTab } from './TeamTab';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { ActivityFeed } from './ActivityFeed';

interface ProfileTabProps {
  className?: string;
  onNavigateToProject?: (projectId: string) => void;
}

export function ProfileTab({ className, onNavigateToProject }: ProfileTabProps) {
  const {
    currentUser,
    users,
    invitations,
    loadingUsers,
    loadingInvitations,
    createUser,
    updateUser,
    deleteUser,
    createInvitation,
    updateInvitation,
    deleteInvitation,
    requestPasswordReset,
    hasPermission,
    canManageUsers,
    canInviteMembers,
    getUsersByRole,
    isCreatingUser,
    isUpdatingUser,
    isDeletingUser,
    isCreatingInvitation,
    isUpdatingInvitation,
    isDeletingInvitation,
    isRequestingPasswordReset,
  } = useUserManagement();

  const [activeTab, setActiveTab] = useState('profile');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [isEditProfileDialogOpen, setIsEditProfileDialogOpen] = useState(false);
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);
  const [isCredentialsDialogOpen, setIsCredentialsDialogOpen] = useState(false);
  
  // Form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('client');
  const [inviteProjectId, setInviteProjectId] = useState<string>('none');
  
  const [createUserData, setCreateUserData] = useState({
    email: '',
    displayName: '',
    role: 'client' as UserRole,
    projectId: 'none' as string,
  });
  
  const [editProfileData, setEditProfileData] = useState({
    displayName: currentUser?.display_name || '',
    bio: currentUser?.bio || '',
    timezone: currentUser?.timezone || 'UTC',
    notificationsEnabled: currentUser?.notifications_enabled === 'true',
  });
  
  const [passwordResetEmail, setPasswordResetEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    username: string;
    password: string;
    email: string;
  } | null>(null);

  // Mock team stats (in real app, this would come from API)
  const teamStats = {
    totalMembers: users.length,
    activeMembers: users.filter(u => u.status === 'active').length,
    projectsCount: 2,
    averageResponseTime: 4.5,
    memberActivity: users.slice(0, 5).map(user => ({
      userId: user.id,
      userName: user.displayName,
      activityCount: Math.floor(Math.random() * 20) + 1,
      lastActivity: user.lastActive,
    }))
  };

  const handleSendInvitation = () => {
    if (!inviteEmail) return;
    
    createInvitation({
      email: inviteEmail,
      role: inviteRole,
      project_id: inviteProjectId === 'none' ? undefined : inviteProjectId,
      project_name: inviteProjectId === 'none' ? undefined : 'Sample Project',
    });
    
    setIsInviteDialogOpen(false);
    setInviteEmail('');
    setInviteRole('client');
    setInviteProjectId('none');
  };

  const handleCreateUser = () => {
    if (!createUserData.email || !createUserData.displayName) return;
    
    createUser({
      email: createUserData.email,
      display_name: createUserData.displayName,
      role: createUserData.role,
      project_id: createUserData.projectId === 'none' ? undefined : createUserData.projectId,
    });
    
    setIsCreateUserDialogOpen(false);
    setCreateUserData({
      email: '',
      displayName: '',
      role: 'client',
      projectId: 'none',
    });
  };

  const handleUpdateProfile = () => {
    if (!currentUser) return;
    
    updateUser({
      userId: currentUser.id,
      updates: {
        id: currentUser.id, // Removed parseInt, keep as string
        display_name: editProfileData.displayName,
        meta: {
          bio: editProfileData.bio,
          timezone: editProfileData.timezone,
          notifications_enabled: editProfileData.notificationsEnabled.toString(),
        },
      },
    });
    
    setIsEditProfileDialogOpen(false);
  };

  const handleRequestPasswordReset = () => {
    if (!passwordResetEmail) return;
    
    requestPasswordReset(passwordResetEmail);
    setIsPasswordResetDialogOpen(false);
    setPasswordResetEmail('');
  };

  const handleResendInvitation = (invitation: TeamInvitation) => {
    updateInvitation({
      invitationId: invitation.id,
      updates: {
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Converted to string
      },
    });
  };

  const handleCancelInvitation = (invitation: TeamInvitation) => {
    deleteInvitation(invitation.id);
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      deleteUser(userId);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getRoleColor = (role: UserRole) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      project_manager: 'bg-blue-100 text-blue-800',
      client: 'bg-green-100 text-green-800',
      artist: 'bg-purple-100 text-purple-800',
      viewer: 'bg-gray-100 text-gray-800',
    };
    return colors[role];
  };

  const getStatusColor = (status: TeamInvitation['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
    };
    return colors[status];
  };

  if (!currentUser) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Please log in to view your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-6 space-y-6", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Profile & Team Management</h2>
        <div className="flex gap-2">
          {canManageUsers() && (
            <Button onClick={() => setIsCreateUserDialogOpen(true)} className="hover-shimmer">
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          )}
          {canInviteMembers() && (
            <Button onClick={() => setIsInviteDialogOpen(true)} className="hover-shimmer">
              <Mail className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <ProfileSection
            currentUser={currentUser as UserProfile}
            hasPermission={hasPermission}
            setIsEditProfileDialogOpen={setIsEditProfileDialogOpen}
            setIsPasswordResetDialogOpen={setIsPasswordResetDialogOpen}
            getRoleColor={getRoleColor}
          />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <TeamTab
            teamStats={teamStats}
            users={users}
            loadingUsers={loadingUsers}
            currentUser={currentUser}
            hasPermission={hasPermission}
            handleDeleteUser={handleDeleteUser}
            isDeletingUser={isDeletingUser}
            getRoleColor={getRoleColor}
          />
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Pending Invitations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingInvitations ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-4 border rounded-lg animate-pulse">
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{invitation.email}</span>
                          <Badge className={getStatusColor(invitation.status)}>
                            {invitation.status}
                          </Badge>
                          <Badge variant="outline" className={getRoleColor(invitation.role)}>
                            {invitation.role.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Invited by {invitation.invited_by_name} • {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                        </p>
                        {invitation.project_name && (
                          <p className="text-sm text-muted-foreground">
                            Project: {invitation.project_name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {invitation.status === 'pending' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleResendInvitation(invitation)}
                              disabled={isUpdatingInvitation}
                              className="hover-shimmer"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Resend
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleCancelInvitation(invitation)}
                              disabled={isDeletingInvitation}
                              className="hover-shimmer text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {invitations.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No pending invitations</p>
                      {canInviteMembers && (
                        <Button 
                          onClick={() => setIsInviteDialogOpen(true)} 
                          className="mt-4 hover-shimmer"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Send Invitation
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsDashboard />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <ActivityFeed 
            limit={50}
            userId={currentUser?.id}
            showFilters={true}
            showRefreshButton={true}
            isMainActivityTab={false}
            hideAllUsersFilter={true}
            onActivityClick={(activity) => {
              if (activity.projectId && activity.projectId !== 'general' && onNavigateToProject) {
                onNavigateToProject(activity.projectId);
              }
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your team. They will receive an email with instructions to accept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="artist">Artist</SelectItem>
                  <SelectItem value="project_manager">Project Manager</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="invite-project">Project (Optional)</Label>
              <Select value={inviteProjectId} onValueChange={setInviteProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific project</SelectItem>
                  <SelectItem value="project-1">Sample Project 1</SelectItem>
                  <SelectItem value="project-2">Sample Project 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendInvitation} 
              className="hover-shimmer"
              disabled={isCreatingInvitation || !inviteEmail}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user account. A secure password will be generated automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-email">Email Address</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="user@example.com"
                value={createUserData.email}
                onChange={(e) => setCreateUserData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="create-name">Display Name</Label>
              <Input
                id="create-name"
                placeholder="John Doe"
                value={createUserData.displayName}
                onChange={(e) => setCreateUserData(prev => ({ ...prev, displayName: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="create-role">Role</Label>
              <Select 
                value={createUserData.role} 
                onValueChange={(value) => setCreateUserData(prev => ({ ...prev, role: value as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="artist">Artist</SelectItem>
                  <SelectItem value="project_manager">Project Manager</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="create-project">Assign to Project (Optional)</Label>
              <Select 
                value={createUserData.projectId} 
                onValueChange={(value) => setCreateUserData(prev => ({ ...prev, projectId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific project</SelectItem>
                  <SelectItem value="project-1">Sample Project 1</SelectItem>
                  <SelectItem value="project-2">Sample Project 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser} 
              className="hover-shimmer"
              disabled={isCreatingUser || !createUserData.email || !createUserData.displayName}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditProfileDialogOpen} onOpenChange={setIsEditProfileDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information and preferences.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Display Name</Label>
              <Input
                id="edit-name"
                value={editProfileData.displayName}
                onChange={(e) => setEditProfileData(prev => ({ ...prev, displayName: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-bio">Bio</Label>
              <Textarea
                id="edit-bio"
                placeholder="Tell us about yourself..."
                value={editProfileData.bio}
                onChange={(e) => setEditProfileData(prev => ({ ...prev, bio: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-timezone">Timezone</Label>
              <Select 
                value={editProfileData.timezone} 
                onValueChange={(value) => setEditProfileData(prev => ({ ...prev, timezone: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="notifications"
                checked={editProfileData.notificationsEnabled}
                onCheckedChange={(checked) => setEditProfileData(prev => ({ ...prev, notificationsEnabled: checked }))}
              />
              <Label htmlFor="notifications">Enable notifications</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditProfileDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateProfile} 
              className="hover-shimmer"
              disabled={isUpdatingUser}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordResetDialogOpen} onOpenChange={setIsPasswordResetDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Request Password Reset</DialogTitle>
            <DialogDescription>
              Enter your email address to receive a password reset link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reset-email">Email Address</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="your@email.com"
                value={passwordResetEmail}
                onChange={(e) => setPasswordResetEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRequestPasswordReset} 
              className="hover-shimmer"
              disabled={isRequestingPasswordReset || !passwordResetEmail}
            >
              <Lock className="h-4 w-4 mr-2" />
              Send Reset Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={isCredentialsDialogOpen} onOpenChange={setIsCredentialsDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>User Credentials</DialogTitle>
            <DialogDescription>
              Please save these credentials securely and share them with the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {generatedCredentials && (
              <>
                <div>
                  <Label>Email</Label>
                  <div className="flex items-center gap-2">
                    <Input value={generatedCredentials.email} readOnly />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedCredentials.email)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Username</Label>
                  <div className="flex items-center gap-2">
                    <Input value={generatedCredentials.username} readOnly />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedCredentials.username)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Password</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type={showPassword ? 'text' : 'password'} 
                      value={generatedCredentials.password} 
                      readOnly 
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedCredentials.password)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsCredentialsDialogOpen(false)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 