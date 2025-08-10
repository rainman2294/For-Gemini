import React, { useState } from 'react';
import { Flag, Plus, Calendar, Target, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn, formatDate } from '@/lib/utils';
import { workspaceService } from '@/services/workspaceService';

interface TimelineMilestone {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'achieved' | 'missed' | 'cancelled';
  color: string;
  isCritical: boolean;
  completionPercentage: number;
  achievedAt: string | null;
  achievedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MilestoneManagerProps {
  workspaceId: string;
  milestones: TimelineMilestone[];
  onUpdated: () => void;
  onMilestoneCreated?: (milestone: TimelineMilestone) => void;
}

const milestoneColors = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#f97316', // orange
  '#06b6d4', // cyan
  '#84cc16'  // lime
];

export default function MilestoneManager({ workspaceId, milestones, onUpdated, onMilestoneCreated }: MilestoneManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dueDate: '',
    color: '#3b82f6',
    isCritical: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.dueDate) return;

    try {
      setIsSubmitting(true);
      
      const milestoneData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        dueDate: formData.dueDate,
        color: formData.color,
        isCritical: formData.isCritical
      };

      try {
        // Try API first
        await workspaceService.createTimelineMilestone(workspaceId, milestoneData);
        console.log('Milestone created via API');
      } catch (apiError) {
        console.warn('API not available, milestone created locally');
        // Create mock milestone for local state
        const mockMilestone = {
          id: `milestone-${Date.now()}`,
          workspaceId: workspaceId,
          ...milestoneData,
          status: 'pending' as const,
          completionPercentage: 0,
          achievedAt: null,
          achievedBy: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        // Call the milestone creation handler if provided
        if (onMilestoneCreated) {
          onMilestoneCreated(mockMilestone);
        }
        console.log('Mock milestone created:', mockMilestone);
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        dueDate: '',
        color: '#3b82f6',
        isCritical: false
      });
      setShowCreateDialog(false);
      
      // Always call onUpdated to refresh the parent component
      onUpdated();
    } catch (error) {
      console.error('Failed to create milestone:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'achieved': return 'bg-green-500';
      case 'missed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'achieved': return <CheckCircle className="h-4 w-4" />;
      case 'missed': return <AlertCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const sortedMilestones = [...milestones].sort((a, b) => 
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  return (
    <Card className="glass-card border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Milestones
          </CardTitle>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="hover-shimmer cyrus-ui">
                <Plus className="h-4 w-4 mr-2" />
                Add Milestone
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-0" aria-describedby="milestone-dialog-description">
              <DialogHeader>
                <DialogTitle className="bg-gradient-primary bg-clip-text text-transparent">
                  Create New Milestone
                </DialogTitle>
              </DialogHeader>
              
              <div id="milestone-dialog-description" className="sr-only">
                Dialog for creating a new milestone with name, description, due date, color, and critical status
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="milestoneName" className="text-sm font-medium">
                    Milestone Name
                  </Label>
                  <Input
                    id="milestoneName"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter milestone name..."
                    className="glass-card border-gray-200/20 focus:border-blue-500/50"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="milestoneDescription" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="milestoneDescription"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the milestone..."
                    rows={3}
                    className="glass-card border-gray-200/20 focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <Label htmlFor="milestoneDueDate" className="text-sm font-medium">
                    Due Date
                  </Label>
                  <Input
                    id="milestoneDueDate"
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="glass-card border-gray-200/20 focus:border-blue-500/50"
                    required
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Color</Label>
                  <div className="flex gap-2 mt-2">
                    {milestoneColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                          formData.color === color ? "border-gray-800 scale-110" : "border-gray-300"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="isCritical"
                    type="checkbox"
                    checked={formData.isCritical}
                    onChange={(e) => setFormData(prev => ({ ...prev, isCritical: e.target.checked }))}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                  />
                  <Label htmlFor="isCritical" className="text-sm font-medium">
                    Critical Milestone
                  </Label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200/20">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                    className="hover-shimmer cyrus-ui"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="button-primary-enhanced hover-shimmer cyrus-ui"
                    disabled={isSubmitting || !formData.name.trim() || !formData.dueDate}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Milestone'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {sortedMilestones.length === 0 ? (
          <div className="text-center py-8">
            <Flag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No milestones yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first milestone to track important project deadlines
            </p>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="hover-shimmer cyrus-ui"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedMilestones.map((milestone) => {
              const isOverdue = new Date(milestone.dueDate) < new Date() && milestone.status === 'pending';
              const daysUntilDue = Math.ceil(
                (new Date(milestone.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <div
                  key={milestone.id}
                  className={cn(
                    "p-4 rounded-lg border transition-all hover:shadow-md",
                    "glass-card border-gray-200/20",
                    isOverdue && "border-red-200/50 bg-red-50/20"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Milestone Icon */}
                      <div 
                        className="w-4 h-4 rotate-45 border-2 border-white shadow-sm mt-1 flex-shrink-0"
                        style={{ backgroundColor: milestone.color }}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate">{milestone.name}</h4>
                          {milestone.isCritical && (
                            <Badge variant="destructive" className="text-xs">
                              Critical
                            </Badge>
                          )}
                        </div>
                        
                        {milestone.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {milestone.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span className={cn(
                              isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
                            )}>
                              {formatDate(milestone.dueDate)}
                            </span>
                          </div>
                          
                          {milestone.status === 'pending' && (
                            <span className={cn(
                              "text-xs",
                              isOverdue ? "text-red-600" : 
                              daysUntilDue <= 7 ? "text-orange-600" : "text-muted-foreground"
                            )}>
                              {isOverdue 
                                ? `${Math.abs(daysUntilDue)} days overdue`
                                : daysUntilDue === 0 
                                  ? "Due today"
                                  : `${daysUntilDue} days remaining`
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Status */}
                    <div className="flex items-center gap-2 ml-4">
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-white text-xs",
                          getStatusColor(milestone.status)
                        )}
                      >
                        {getStatusIcon(milestone.status)}
                        <span className="ml-1 capitalize">{milestone.status}</span>
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}