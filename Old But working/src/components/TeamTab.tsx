import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Users, 
  Settings, 
  Trash2
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { UserRole } from '../types/user';

interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  projectsCount: number;
  averageResponseTime: number;
}

interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  role: string;
  status: string;
  last_active: string;
  avatar?: string;
}

interface TeamTabProps {
  teamStats: TeamStats;
  users: User[];
  loadingUsers: boolean;
  currentUser: User;
  hasPermission: (permission: string) => boolean;
  handleDeleteUser: (userId: string) => void;
  isDeletingUser: boolean;
  getRoleColor: (role: UserRole) => string;
}

export function TeamTab({
  teamStats,
  users,
  loadingUsers,
  currentUser,
  hasPermission,
  handleDeleteUser,
  isDeletingUser,
  getRoleColor
}: TeamTabProps) {
  return (
    <>
      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.totalMembers}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.activeMembers}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.projectsCount}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.averageResponseTime}h</div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-4 border rounded-lg animate-pulse">
                  <div className="h-10 w-10 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback>
                        {user.display_name?.split(' ').map(n => n[0]).join('') || user.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.display_name}</span>
                        <Badge className={getRoleColor(user.role as UserRole)}>
                          {user.role.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline">
                          {user.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Last active {formatDistanceToNow(new Date(user.last_active), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasPermission('canEditUsers') && (
                      <Button variant="outline" size="sm" className="hover-shimmer">
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                    {hasPermission('canDeleteUsers') && user.id !== currentUser.id && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="hover-shimmer text-destructive"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={isDeletingUser}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {users.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No team members found</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}