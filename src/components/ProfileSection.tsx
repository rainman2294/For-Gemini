import React from 'react';
import { Edit, Lock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { UserProfile } from '../types/user';

type ProfileSectionProps = {
  currentUser: UserProfile;
  hasPermission: (permission: string) => boolean;
  setIsEditProfileDialogOpen: (open: boolean) => void;
  setIsPasswordResetDialogOpen: (open: boolean) => void;
  getRoleColor: (role: string) => string;
};

export function ProfileSection({
  currentUser,
  hasPermission,
  setIsEditProfileDialogOpen,
  setIsPasswordResetDialogOpen,
  getRoleColor,
}: ProfileSectionProps) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>My Profile</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsEditProfileDialogOpen(true)}
            disabled={!hasPermission('canEditUsers')}
            className="glass-card hover:shadow-lg transition-all duration-300"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={currentUser.avatar || undefined} />
            <AvatarFallback className="text-lg">
              {currentUser.displayName?.split(' ').map(n => n[0]).join('') || currentUser.username?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-xl font-semibold">{currentUser.displayName}</h3>
              <p className="text-muted-foreground">{currentUser.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getRoleColor(currentUser.role)}>
                  {currentUser.role.replace('_', ' ')}
                </Badge>
                <Badge variant="outline">
                  {currentUser.status}
                </Badge>
              </div>
            </div>
            
            {currentUser.bio && (
              <div>
                <h4 className="font-medium mb-1">Bio</h4>
                <p className="text-sm text-muted-foreground">{currentUser.bio}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Username:</span>
                <p className="text-muted-foreground">{currentUser.username}</p>
              </div>
              <div>
                <span className="font-medium">Timezone:</span>
                <p className="text-muted-foreground">{currentUser.timezone}</p>
              </div>
              <div>
                <span className="font-medium">Member since:</span>
                <p className="text-muted-foreground">
                  {currentUser.createdAt && !isNaN(new Date(currentUser.createdAt).getTime()) 
                    ? formatDistanceToNow(new Date(currentUser.createdAt), { addSuffix: true }) 
                    : 'Unknown'}
                </p>
              </div>
              <div>
                <span className="font-medium">Last active:</span>
                <p className="text-muted-foreground">
                  {currentUser.lastActive && !isNaN(new Date(currentUser.lastActive).getTime()) 
                    ? formatDistanceToNow(new Date(currentUser.lastActive), { addSuffix: true }) 
                    : 'Unknown'}
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Password Management</h4>
                <p className="text-sm text-muted-foreground">
                  Request a password reset or change your password
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setIsPasswordResetDialogOpen(true)}
                className="glass-card hover:shadow-lg transition-all duration-300"
              >
                <Lock className="h-4 w-4 mr-2" />
                Reset Password
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 