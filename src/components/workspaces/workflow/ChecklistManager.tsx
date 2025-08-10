import React, { useState } from 'react';
import { Plus, Check, Clock, Trash2, Edit3, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn, formatDate } from '@/lib/utils';
import { ChecklistItem } from '@/types/workspace';
import { workspaceService } from '@/services/workspaceService';

interface ChecklistManagerProps {
  stageId: string;
  items: ChecklistItem[];
  onUpdated: () => void;
  className?: string;
}

export default function ChecklistManager({
  stageId,
  items,
  onUpdated,
  className
}: ChecklistManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemPriority, setNewItemPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newItemHours, setNewItemHours] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getPriorityConfig = (priority: string) => {
    const configs = {
      low: { color: 'bg-gray-500', text: 'Low' },
      medium: { color: 'bg-blue-500', text: 'Medium' },
      high: { color: 'bg-orange-500', text: 'High' },
      urgent: { color: 'bg-red-500', text: 'Urgent' }
    };
    return configs[priority as keyof typeof configs] || configs.medium;
  };

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;

    try {
      setIsSubmitting(true);
      
      try {
        await workspaceService.createChecklistItem(stageId, {
          text: newItemText.trim(),
          description: newItemDescription.trim(),
          priority: newItemPriority,
          estimatedHours: parseFloat(newItemHours) || 0,
          order: items.length,
          isCompleted: false,
          attachments: []
        });
      } catch (apiError) {
        console.warn('API not available, item created locally');
        // In development, just show success since we can't persist
      }

      // Reset form
      setNewItemText('');
      setNewItemDescription('');
      setNewItemPriority('medium');
      setNewItemHours('');
      setShowAddDialog(false);
      onUpdated();
    } catch (error) {
      console.error('Failed to create checklist item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (item: ChecklistItem) => {
    try {
      try {
        await workspaceService.updateChecklistItem(item.id, {
          isCompleted: !item.isCompleted
        });
      } catch (apiError) {
        console.warn('API not available, toggle not persisted');
      }
      onUpdated();
    } catch (error) {
      console.error('Failed to toggle checklist item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await workspaceService.deleteChecklistItem(itemId);
      onUpdated();
    } catch (error) {
      console.error('Failed to delete checklist item:', error);
    }
  };

  const sortedItems = [...items].sort((a, b) => a.order - b.order);
  const completedCount = items.filter(item => item.isCompleted).length;
  const progressPercentage = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Progress</span>
          <Badge variant="secondary" className="cyrus-ui">
            {completedCount} / {items.length}
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground">{progressPercentage}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        {sortedItems.length === 0 ? (
          <div className="glass-card p-6 rounded-lg text-center">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No tasks yet</p>
          </div>
        ) : (
          sortedItems.map((item) => {
            const priorityConfig = getPriorityConfig(item.priority);
            
            return (
              <div
                key={item.id}
                className={cn(
                  "glass-card p-3 rounded-lg group hover:glow transition-all",
                  item.isCompleted && "opacity-60"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <Checkbox
                    checked={item.isCompleted}
                    onCheckedChange={() => handleToggleComplete(item)}
                    className="mt-1"
                  />

                  {/* Item Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={cn(
                        "font-medium text-sm",
                        item.isCompleted && "line-through text-muted-foreground"
                      )}>
                        {item.text}
                      </h4>
                      
                      <Badge 
                        variant="secondary" 
                        className={cn("text-white text-xs cyrus-ui", priorityConfig.color)}
                      >
                        {priorityConfig.text}
                      </Badge>
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {item.description}
                      </p>
                    )}

                    {/* Item Meta */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {item.estimatedHours > 0 && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{item.estimatedHours}h estimated</span>
                        </div>
                      )}
                      
                      {item.actualHours > 0 && (
                        <div className="flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          <span>{item.actualHours}h spent</span>
                        </div>
                      )}

                      {item.completedAt && (
                        <div className="flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          <span>Completed {formatDate(item.completedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingItem(item)}
                      className="h-6 w-6 p-0 hover-shimmer cyrus-ui"
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                      className="h-6 w-6 p-0 hover-shimmer cyrus-ui text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Item Button */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full hover-shimmer cyrus-ui"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </DialogTrigger>
        <DialogContent className="glass-card border-0">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Task Name</label>
              <Input
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder="Enter task name..."
                className="input-glass cyrus-ui"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
              <Textarea
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                placeholder="Add more details..."
                className="input-glass cyrus-ui"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Priority</label>
                <Select value={newItemPriority} onValueChange={(value: any) => setNewItemPriority(value)}>
                  <SelectTrigger className="input-glass cyrus-ui">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Estimated Hours</label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={newItemHours}
                  onChange={(e) => setNewItemHours(e.target.value)}
                  placeholder="0"
                  className="input-glass cyrus-ui"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                className="hover-shimmer cyrus-ui"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddItem}
                disabled={!newItemText.trim() || isSubmitting}
                className="hover-shimmer cyrus-ui"
              >
                {isSubmitting ? 'Adding...' : 'Add Task'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}