import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Calendar, 
  LayoutGrid, 
  Palette, 
  PenTool, 
  GitBranch, 
  Clock, 
  Activity, 
  User, 
  Search, 
  Bell, 
  Settings, 
  LogOut, 
  Menu,
  X,
  ChevronRight,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  action: () => void;
}

interface MobileNavigationProps {
  onNavigate: (view: string) => void;
  currentView: string;
  onLogout: () => void;
  onLogin: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  onNavigate,
  currentView,
  onLogout,
  onLogin
}) => {
  const {
    isAuthenticated,
    userDisplayName,
    notificationCount,
    isHamburgerMenuOpen,
    setHamburgerMenuOpen,
    setLoginModalOpen,
    setCurrentView
  } = useAppStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isHamburgerMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isHamburgerMenuOpen]);

  const primaryNavItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'Projects',
      icon: <Home className="h-5 w-5" />,
      action: () => {
        onNavigate('list');
        setHamburgerMenuOpen(false);
      }
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: <Calendar className="h-5 w-5" />,
      action: () => {
        onNavigate('calendar');
        setHamburgerMenuOpen(false);
      }
    },
    {
      id: 'monday',
      label: 'Monday View',
      icon: <LayoutGrid className="h-5 w-5" />,
      action: () => {
        onNavigate('monday');
        setHamburgerMenuOpen(false);
      }
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: <Activity className="h-5 w-5" />,
      badge: notificationCount > 0 ? notificationCount : undefined,
      action: () => {
        onNavigate('activity');
        setHamburgerMenuOpen(false);
      }
    }
  ];

  const workspaceNavItems: NavigationItem[] = [
    {
      id: 'moodboards',
      label: 'Moodboards',
      icon: <Palette className="h-5 w-5" />,
      action: () => {
        onNavigate('moodboards');
        setHamburgerMenuOpen(false);
      }
    },
    {
      id: 'whiteboards',
      label: 'Whiteboards',
      icon: <PenTool className="h-5 w-5" />,
      action: () => {
        onNavigate('whiteboards');
        setHamburgerMenuOpen(false);
      }
    },
    {
      id: 'workflows',
      label: 'Workflows',
      icon: <GitBranch className="h-5 w-5" />,
      action: () => {
        onNavigate('workflows');
        setHamburgerMenuOpen(false);
      }
    },
    {
      id: 'timeline',
      label: 'Timeline',
      icon: <Clock className="h-5 w-5" />,
      action: () => {
        onNavigate('timeline');
        setHamburgerMenuOpen(false);
      }
    }
  ];

  const handleCreateNew = () => {
    setCurrentView('form');
    setHamburgerMenuOpen(false);
  };

  const handleLogin = () => {
    setLoginModalOpen(true);
    setHamburgerMenuOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    setHamburgerMenuOpen(false);
  };

  if (!mounted) return null;

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden glass-navbar px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHamburgerMenuOpen(true)}
            className="touch-target p-2"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-responsive-lg">
            Pulse 2
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateNew}
              className="touch-target p-2"
              aria-label="Create new project"
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
          
          {notificationCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="touch-target p-2 relative"
              aria-label={`${notificationCount} notifications`}
            >
              <Bell className="h-5 w-5" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
              >
                {notificationCount > 99 ? '99+' : notificationCount}
              </Badge>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isHamburgerMenuOpen && (
        <div 
          className="mobile-menu-overlay md:hidden"
          onClick={() => setHamburgerMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-out Menu */}
      <div
        className={cn(
          "mobile-menu transform transition-transform duration-300 ease-in-out md:hidden",
          isHamburgerMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-menu-title"
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 id="mobile-menu-title" className="text-lg font-semibold">
            Navigation
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHamburgerMenuOpen(false)}
            className="touch-target p-2"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* User Section */}
        <div className="p-4 border-b border-border">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {userDisplayName || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Logged in
                </p>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleLogin}
              className="w-full touch-target button-primary-enhanced hover-shimmer cyrus-ui"
            >
              <User className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>

        {/* Primary Navigation */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Main
          </h3>
          <nav className="space-y-1" role="navigation">
            {primaryNavItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start touch-target h-12 px-3",
                  currentView === item.id && "bg-primary/10 text-primary"
                )}
                onClick={item.action}
              >
                <span className="flex items-center gap-3 flex-1">
                  {item.icon}
                  <span className="text-sm">{item.label}</span>
                </span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto">
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
                <ChevronRight className="h-4 w-4 ml-2 opacity-50" />
              </Button>
            ))}
          </nav>
        </div>

        <Separator />

        {/* Workspace Navigation */}
        {isAuthenticated && (
          <div className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Workspaces
            </h3>
            <nav className="space-y-1" role="navigation">
              {workspaceNavItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start touch-target h-12 px-3",
                    currentView === item.id && "bg-primary/10 text-primary"
                  )}
                  onClick={item.action}
                >
                  <span className="flex items-center gap-3 flex-1">
                    {item.icon}
                    <span className="text-sm">{item.label}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 ml-2 opacity-50" />
                </Button>
              ))}
            </nav>
          </div>
        )}

        {/* Footer Actions */}
        {isAuthenticated && (
          <>
            <Separator />
            <div className="p-4 space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start touch-target h-12 px-3"
                onClick={() => {
                  // Handle settings
                  setHamburgerMenuOpen(false);
                }}
              >
                <Settings className="h-5 w-5 mr-3" />
                <span className="text-sm">Settings</span>
                <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start touch-target h-12 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-3" />
                <span className="text-sm">Sign Out</span>
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Bottom Navigation for Mobile (Alternative/Additional Navigation) */}
      <div className="mobile-nav p-2 md:hidden">
        <div className="flex items-center justify-around">
          {primaryNavItems.slice(0, 4).map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className={cn(
                "flex-col gap-1 h-auto py-2 px-3 touch-target relative",
                currentView === item.id && "text-primary"
              )}
              onClick={item.action}
            >
              {item.icon}
              <span className="text-xs">{item.label}</span>
              {item.badge && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 w-4 text-xs p-0 flex items-center justify-center"
                >
                  {item.badge > 9 ? '9+' : item.badge}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>
    </>
  );
};

export default MobileNavigation;