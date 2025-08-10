import React, { useState } from 'react';
import { CalendarDays, Clock, Users, Flag, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { workspaceService } from '@/services/workspaceService';
import { Project } from '@/types/project';
import { DialogContent } from '@/components/ui/dialog';

interface TaskCreationDialogProps {
  workspaceId: string;
  onTaskCreated: (task: any) => void; // TODO: Replace with proper task type when available
  project?: Project; // Add project prop for real data
}

export default function TaskCreationDialog({ workspaceId, onTaskCreated, project }: TaskCreationDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    priority: 'medium',
    estimatedHours: ''
  });
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get real project data for users
  const projectUsers = project?.artists || [];
  const projectManager = project?.projectManager ? [{ id: project.projectManager, name: project.projectManager }] : [];
  const allUsers = [...projectUsers, ...projectManager];

  // Helper function to get user display info
  const getUserDisplayInfo = (user: { id: string; name: string }) => ({
    id: user.id,
    name: user.name,
    email: `${user.name.toLowerCase().replace(' ', '.')}@example.com`, // Generate email from name
    avatar: user.name.split(' ').map(n => n[0]).join('').toUpperCase() // Generate initials
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.startDate || !formData.endDate) return;

    try {
      setIsSubmitting(true);
      
      const taskData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        priority: formData.priority,
        estimatedHours: parseFloat(formData.estimatedHours) || 0,
        status: 'not_started' as const
      };

      try {
        const newTask = await workspaceService.createTimelineTask(workspaceId, taskData);
        onTaskCreated(newTask);
      } catch (apiError) {
        console.warn('API not available, creating mock task');
        // Create mock task for development
        const mockTask = {
          id: `task-${Date.now()}`,
          workspaceId: workspaceId,
          ...taskData,
          progressPercentage: 0,
          actualHours: 0,
          parentTaskId: null,
          createdBy: '1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        onTaskCreated(mockTask);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserAssignment = (userId: string) => {
    setAssignedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-xl font-semibold bg-gradient-primary bg-clip-text text-transparent">
          Add a new task to the timeline
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new task with timeline, priority, and team assignment
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="glass-card p-6 rounded-lg space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Task Information</h3>
              </div>
              
              <div>
                <Label htmlFor="taskName" className="text-sm font-medium">
                  Task Name
                </Label>
                <Input
                  id="taskName"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter task name..."
                  className="glass-card hover:shadow-lg transition-all duration-300"
                  required
                />
              </div>

              <div>
                <Label htmlFor="taskDescription" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="taskDescription"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the task..."
                  rows={3}
                  className="glass-card hover:shadow-lg transition-all duration-300"
                />
              </div>
            </div>

            {/* Team Assignment */}
            <div className="glass-card p-6 rounded-lg space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                <label className="text-sm font-medium">Assign Team Members</label>
                <Badge variant="secondary" className="glass-card">
                  {assignedUsers.length} selected
                </Badge>
              </div>

              <div className="space-y-2">
                {allUsers.map(user => {
                  const userInfo = getUserDisplayInfo(user);
                  return (
                    <div
                      key={userInfo.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg glass-card cursor-pointer transition-all hover:shadow-lg",
                        assignedUsers.includes(userInfo.id) && "bg-primary/10 ring-1 ring-primary/20"
                      )}
                      onClick={() => toggleUserAssignment(userInfo.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full glass-card flex items-center justify-center text-white text-sm font-medium bg-gradient-to-br from-blue-500 to-purple-600">
                          {userInfo.avatar}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{userInfo.name}</p>
                          <p className="text-xs text-muted-foreground">{userInfo.email}</p>
                        </div>
                      </div>
                      
                      <div className={cn(
                        "w-5 h-5 rounded border-2 transition-all",
                        assignedUsers.includes(userInfo.id) 
                          ? "bg-primary border-primary" 
                          : "border-gray-300"
                      )}>
                        {assignedUsers.includes(userInfo.id) && (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Timeline */}
            <div className="glass-card p-6 rounded-lg space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Timeline</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="startDate" className="text-sm font-medium">
                    Start Date
                  </Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="glass-card hover:shadow-lg transition-all duration-300"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-sm font-medium">
                    End Date
                  </Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="glass-card hover:shadow-lg transition-all duration-300"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Priority & Estimation */}
            <div className="glass-card p-6 rounded-lg space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Flag className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Priority & Estimation</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="priority" className="text-sm font-medium">
                    Priority
                  </Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger className="glass-card hover:shadow-lg transition-all duration-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-500" />
                          Low
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          Medium
                        </div>
                      </SelectItem>
                      <SelectItem value="high">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          High
                        </div>
                      </SelectItem>
                      <SelectItem value="urgent">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          Urgent
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="estimatedHours" className="text-sm font-medium">
                    Estimated Hours
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="estimatedHours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.estimatedHours}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: e.target.value }))}
                      placeholder="0"
                      className="glass-card hover:shadow-lg transition-all duration-300 pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border/20">
          <Button 
            type="button" 
            variant="outline" 
            className="glass-card hover:shadow-lg transition-all duration-300"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="glass-card hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0"
            disabled={isSubmitting || !formData.name.trim() || !formData.startDate || !formData.endDate}
          >
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </form>
    </div>
  );
}