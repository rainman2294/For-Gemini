import React, { useState } from 'react';
import { Pin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PinGroup {
  id: string;
  name: string;
  itemIds: string[];
}

interface UniversalPinButtonProps {
  itemId: string;
  itemType: 'project' | 'moodboard' | 'whiteboard';
  itemTitle: string;
  pinGroups: PinGroup[];
  onPin: (itemId: string, groupId: string) => void;
  onUnpin: (itemId: string) => void;
  onCreateGroup: (groupName: string) => string; // Returns new group ID
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
}

export function UniversalPinButton({
  itemId,
  itemType,
  itemTitle,
  pinGroups,
  onPin,
  onUnpin,
  onCreateGroup,
  className,
  size = 'default',
  variant = 'outline'
}: UniversalPinButtonProps) {
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Check if item is pinned and get the groups it's pinned to
  const pinnedGroups = pinGroups.filter(group => group.itemIds.includes(itemId));
  const isPinned = pinnedGroups.length > 0;

  const handlePinClick = () => {
    if (isPinned) {
      // If already pinned, show options to unpin or pin to more groups
      setShowPinDialog(true);
    } else {
      // If not pinned, show pin options
      setShowPinDialog(true);
    }
  };

  const handleGroupSelect = (groupId: string) => {
    const isAlreadyInGroup = pinnedGroups.some(group => group.id === groupId);
    
    if (isAlreadyInGroup) {
      // Remove from this group (unpin from specific group)
      onUnpin(itemId);
    } else {
      // Add to this group
      onPin(itemId, groupId);
    }
    setShowPinDialog(false);
  };

  const handleCreateNewGroup = () => {
    if (newGroupName.trim()) {
      const newGroupId = onCreateGroup(newGroupName.trim());
      onPin(itemId, newGroupId);
      setNewGroupName('');
      setShowCreateGroup(false);
      setShowPinDialog(false);
    }
  };

  const getItemTypeIcon = () => {
    switch (itemType) {
      case 'moodboard': return '🎨';
      case 'whiteboard': return '🖼️';
      case 'project': 
      default: return '📁';
    }
  };

  const getItemTypeColor = () => {
    switch (itemType) {
      case 'moodboard': return 'text-purple-500';
      case 'whiteboard': return 'text-green-500';
      case 'project': 
      default: return 'text-blue-500';
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handlePinClick}
        className={cn(
          "hover-shimmer cyrus-ui",
          isPinned && "bg-primary/10 border-primary",
          className
        )}
      >
        <Pin className={cn("h-4 w-4", isPinned && "fill-current")} />
        {size !== 'sm' && (
          <span className="ml-2">
            {isPinned ? `Pinned (${pinnedGroups.length})` : 'Pin'}
          </span>
        )}
      </Button>

      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="glass-card max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{getItemTypeIcon()}</span>
              Pin "{itemTitle}"
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current pin status */}
            {isPinned && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm font-medium mb-2">Currently pinned to:</p>
                <div className="flex flex-wrap gap-2">
                  {pinnedGroups.map(group => (
                    <Badge key={group.id} variant="secondary" className="cyrus-ui">
                      {group.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Available pin groups */}
            <div>
              <p className="text-sm font-medium mb-3">
                {isPinned ? 'Pin to additional groups:' : 'Select a pin group:'}
              </p>
              
              {pinGroups.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {pinGroups.map(group => {
                    const isInGroup = pinnedGroups.some(pg => pg.id === group.id);
                    return (
                      <Button
                        key={group.id}
                        variant={isInGroup ? "secondary" : "outline"}
                        onClick={() => handleGroupSelect(group.id)}
                        className={cn(
                          "justify-between hover-shimmer cyrus-ui",
                          isInGroup && "bg-primary/10 border-primary"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {group.name}
                          <Badge variant="outline" className="text-xs">
                            {group.itemIds.length}
                          </Badge>
                        </span>
                        {isInGroup && (
                          <Pin className="h-3 w-3 fill-current" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Pin className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No pin groups yet</p>
                  <p className="text-xs">Create your first group below</p>
                </div>
              )}
            </div>

            {/* Create new group */}
            <div className="border-t pt-4">
              {showCreateGroup ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter group name..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm hover-shimmer cyrus-ui"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateNewGroup();
                      } else if (e.key === 'Escape') {
                        setShowCreateGroup(false);
                        setNewGroupName('');
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleCreateNewGroup}
                      disabled={!newGroupName.trim()}
                      className="flex-1 hover-shimmer cyrus-ui"
                    >
                      Create & Pin
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setShowCreateGroup(false);
                        setNewGroupName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowCreateGroup(true)}
                  className="w-full hover-shimmer cyrus-ui"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Group
                </Button>
              )}
            </div>

            {/* Remove all pins option */}
            {isPinned && (
              <div className="border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    onUnpin(itemId);
                    setShowPinDialog(false);
                  }}
                  className="w-full text-destructive hover:bg-destructive/10 border-destructive/20"
                >
                  Unpin from All Groups
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}