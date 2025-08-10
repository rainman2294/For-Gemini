import React, { useState, useEffect } from 'react';
import { X, Menu, Home, Calendar, LayoutGrid, Palette, PenTool, GitBranch, Clock, Activity, User, Search, Bell, Settings, LogOut, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  currentView: string;
  isLoggedIn: boolean;
  userDisplayName: string | null;
  notificationCount: number;
  onLogout: () => void;
  onLogin: () => void;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  isOpen,
  onClose,
  onNavigate,
  currentView,
  isLoggedIn,
  userDisplayName,
  notificationCount,
  onLogout,
  onLogin
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const navigationItems = [
    {
      id: 'list',
      label: 'Projects',
      icon: Home,
      description: 'Manage your projects'
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      description: 'View project timeline'
    },
    {
      id: 'monday',
      label: 'Monday',
      icon: LayoutGrid,
      description: 'Board view'
    }
  ];

  const workspaceItems = [
    {
      id: 'moodboards',
      label: 'Moodboards',
      icon: Palette,
      description: 'Visual inspiration'
    },
    {
      id: 'whiteboards',
      label: 'Whiteboards',
      icon: PenTool,
      description: 'Collaborative workspace'
    },
    {
      id: 'workflows',
      label: 'Workflows',
      icon: GitBranch,
      description: 'Process management'
    },
    {
      id: 'timeline',
      label: 'Timeline',
      icon: Clock,
      description: 'Project timelines'
    }
  ];

  const utilityItems = [
    {
      id: 'activity',
      label: 'Activity',
      icon: Activity,
      description: 'Recent updates'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      description: 'Your account'
    }
  ];

  const handleNavigate = (viewId: string) => {
    onNavigate(viewId);
    onClose();
  };

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-80 bg-background border-r shadow-2xl z-50 transform transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-400 bg-clip-text text-transparent">
                CT
              </div>
              <div className="text-lg font-semibold">Menu</div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User Section */}
          <div className="p-6 border-b">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                  {userDisplayName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{userDisplayName || 'User'}</div>
                  <div className="text-sm text-muted-foreground">Online</div>
                </div>
                <Button variant="ghost" size="sm">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={onLogin} className="w-full button-primary-enhanced">
                Sign In
              </Button>
            )}
          </div>

          {/* Navigation Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Main Navigation */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Main
              </h3>
              <div className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-lg text-left transition-colors duration-200",
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-md" 
                          : "hover:bg-muted/50"
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{item.label}</div>
                        <div className={cn(
                          "text-sm",
                          isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}>
                          {item.description}
                        </div>
                      </div>
                      {isActive && (
                        <div className="w-2 h-2 rounded-full bg-primary-foreground flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Workspaces */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Workspaces
              </h3>
              <div className="space-y-2">
                {workspaceItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-lg text-left transition-colors duration-200",
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-md" 
                          : "hover:bg-muted/50"
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{item.label}</div>
                        <div className={cn(
                          "text-sm",
                          isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}>
                          {item.description}
                        </div>
                      </div>
                      {isActive && (
                        <div className="w-2 h-2 rounded-full bg-primary-foreground flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Utilities */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Tools
              </h3>
              <div className="space-y-2">
                {utilityItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-lg text-left transition-colors duration-200",
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-md" 
                          : "hover:bg-muted/50"
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{item.label}</div>
                        <div className={cn(
                          "text-sm",
                          isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}>
                          {item.description}
                        </div>
                      </div>
                      {item.id === 'activity' && notificationCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {notificationCount}
                        </Badge>
                      )}
                      {isActive && (
                        <div className="w-2 h-2 rounded-full bg-primary-foreground flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-2">
                  <Search className="h-4 w-4" />
                  <span className="text-xs">Search</span>
                </Button>
                <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-2 relative">
                  <Bell className="h-4 w-4" />
                  <span className="text-xs">Alerts</span>
                  {notificationCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 text-xs w-5 h-5 p-0 flex items-center justify-center">
                      {notificationCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          {isLoggedIn && (
            <div className="p-6 border-t">
              <div className="flex gap-3">
                <Button variant="outline" size="sm" className="flex-1">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button variant="outline" size="sm" onClick={onLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};