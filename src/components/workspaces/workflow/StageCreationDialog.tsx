import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Users, Clock, Calendar, Save, X, Plus, Star, AlertTriangle, CheckCircle, Target, Link, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowStage, WorkflowTemplate } from '@/types/workspace';
import { Project } from '@/types/project';
import { workspaceService } from '@/services/workspaceService';

interface StageCreationDialogProps {
  workspaceId: string;
  nextOrder: number;
  existingStages: WorkflowStage[];
  onStageCreated: (stage: WorkflowStage) => void;
  onClose: () => void;
  project?: Project; // Add project prop for real data
}

// Stage templates for quick creation
const stageTemplates = [
  {
    name: 'Initial Review',
    description: 'Review project requirements and initial concepts',
    estimatedHours: 4,
    category: 'review'
  },
  {
    name: 'Design Development',
    description: 'Create initial design concepts and iterations',
    estimatedHours: 8,
    category: 'design'
  },
  {
    name: 'Client Review',
    description: 'Present designs to client for feedback and approval',
    estimatedHours: 2,
    category: 'review'
  },
  {
    name: 'Final Delivery',
    description: 'Finalize assets and deliver to client',
    estimatedHours: 3,
    category: 'delivery'
  }
];

export default function StageCreationDialog({
  workspaceId,
  nextOrder,
  existingStages,
  onStageCreated,
  onClose,
  project
}: StageCreationDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isRequired: true,
    estimatedHours: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  });
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [creationMode, setCreationMode] = useState<'manual' | 'template'>('manual');

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

  // Load templates on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templatesData = await workspaceService.getWorkflowTemplates();
        setTemplates(templatesData);
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    };
    loadTemplates();
  }, []);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleUserAssignment = (userId: string) => {
    setAssignedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleDependency = (stageId: string) => {
    setDependencies(prev => 
      prev.includes(stageId)
        ? prev.filter(id => id !== stageId)
        : [...prev, stageId]
    );
  };

  const applyTemplateFromLibrary = (template: WorkflowTemplate) => {
    const templateStage = template.stages[0]; // Use first stage from template
    if (templateStage) {
      setFormData(prev => ({
        ...prev,
        name: templateStage.name,
        description: templateStage.description,
        estimatedHours: templateStage.estimatedHours.toString(),
        isRequired: templateStage.isRequired
      }));
      setSelectedTemplate(template.id);
    }
  };

  const applyTemplate = (template: typeof stageTemplates[0]) => {
    setFormData(prev => ({
      ...prev,
      name: template.name,
      description: template.description,
      estimatedHours: template.estimatedHours.toString()
    }));
    setSelectedTemplate(template.name);
  };

  const validateForm = () => {
    return formData.name.trim() && formData.description.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const newStage: WorkflowStage = {
        id: `stage-${Date.now()}`,
        workspaceId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: 'not_started',
        order: nextOrder,
        isRequired: formData.isRequired,
        assignedTo: assignedUsers,
        dependencies,
        estimatedHours: parseFloat(formData.estimatedHours) || 0,
        actualHours: 0,
        dueDate: formData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: formData.priority,
        templateId: selectedTemplate,
        checklistItems: [],
        completedAt: null,
        completedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Create the stage
      await workspaceService.createWorkflowStage(workspaceId, newStage);
      onStageCreated(newStage);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        isRequired: true,
        estimatedHours: '',
        dueDate: '',
        priority: 'medium'
      });
      setAssignedUsers([]);
      setDependencies([]);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to create stage:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Create New Workflow Stage
          </h2>
          <p className="text-muted-foreground mt-1">
            Add a new stage to your workflow pipeline with dependencies and templates.
          </p>
        </div>
        <Button variant="outline" onClick={onClose} size="sm" className="glass-card">
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Creation Mode Toggle */}
        <div className="glass-card p-4 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="font-medium">Creation Mode:</span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={creationMode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCreationMode('manual')}
                className="glass-card hover:shadow-lg transition-all duration-300"
              >
                Manual Setup
              </Button>
              <Button
                type="button"
                variant={creationMode === 'template' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCreationMode('template')}
                className="glass-card hover:shadow-lg transition-all duration-300"
              >
                <FileText className="h-4 w-4 mr-2" />
                From Template
              </Button>
            </div>
          </div>
        </div>

        {/* Template Selection */}
        {creationMode === 'template' && (
          <div className="glass-card border-dashed border-primary/30 p-6 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Workflow Templates</h3>
            </div>
            
            <Tabs defaultValue="quick" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 glass-card">
                <TabsTrigger value="quick">Quick Templates</TabsTrigger>
                <TabsTrigger value="library">Template Library</TabsTrigger>
              </TabsList>
              
              <TabsContent value="quick" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {stageTemplates.map((template) => (
                    <Button
                      key={template.name}
                      type="button"
                      variant={selectedTemplate === template.name ? "default" : "outline"}
                      className={cn(
                        "h-auto p-4 flex flex-col items-start text-left glass-card hover:shadow-lg transition-all duration-300",
                        selectedTemplate === template.name && "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                      )}
                      onClick={() => applyTemplate(template)}
                    >
                      <div className="font-semibold text-sm mb-1">{template.name}</div>
                      <div className="text-xs opacity-80 line-clamp-2 mb-2">
                        {template.description}
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        {template.estimatedHours}h
                      </div>
                    </Button>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="library" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <div 
                      key={template.id}
                      className={cn(
                        "glass-card cursor-pointer transition-all hover:shadow-lg p-4 rounded-lg",
                        selectedTemplate === template.id && "ring-2 ring-primary"
                      )}
                      onClick={() => applyTemplateFromLibrary(template)}
                    >
                      <div className="font-semibold text-base mb-2">{template.name}</div>
                      <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="secondary" className="glass-card">{template.category}</Badge>
                        <span className="text-muted-foreground">
                          {template.stages.length} stages
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Enhanced Form Tabs */}
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 glass-card">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
            <TabsTrigger value="assignment">Assignment</TabsTrigger>
            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="glass-card p-6 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Stage Details</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="stage-name">Stage Name *</Label>
                    <Input
                      id="stage-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="e.g., Design Development"
                      className="glass-card hover:shadow-lg transition-all duration-300"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="stage-description">Description *</Label>
                    <Textarea
                      id="stage-description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Describe what happens in this stage..."
                      rows={4}
                      className="glass-card hover:shadow-lg transition-all duration-300 resize-none"
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="required"
                      checked={formData.isRequired}
                      onCheckedChange={(checked) => 
                        handleInputChange('isRequired', checked as boolean)
                      }
                    />
                    <label 
                      htmlFor="required" 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      This stage is required
                    </label>
                  </div>
                </div>
              </div>

              {/* Planning & Assignment */}
              <div className="glass-card p-6 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Planning & Assignment</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Estimated Hours
                      </label>
                      <Input
                        type="number"
                        value={formData.estimatedHours}
                        onChange={(e) => handleInputChange('estimatedHours', e.target.value)}
                        placeholder="0"
                        min="0"
                        step="0.5"
                        className="glass-card hover:shadow-lg transition-all duration-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        Due Date
                      </label>
                      <Input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => handleInputChange('dueDate', e.target.value)}
                        className="glass-card hover:shadow-lg transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-3">
                      <Users className="h-4 w-4 inline mr-1" />
                      Assign Team Members
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                      {allUsers.map((user) => {
                        const userInfo = getUserDisplayInfo(user);
                        return (
                          <div
                            key={userInfo.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg glass-card cursor-pointer transition-all hover:shadow-lg",
                              assignedUsers.includes(userInfo.id) 
                                ? "bg-primary/10 border-primary/30" 
                                : "border-border hover:border-primary/30"
                            )}
                            onClick={() => toggleUserAssignment(userInfo.id)}
                          >
                            <Checkbox
                              checked={assignedUsers.includes(userInfo.id)}
                              onChange={() => toggleUserAssignment(userInfo.id)}
                            />
                            <div className="w-8 h-8 rounded-full glass-card flex items-center justify-center text-white text-xs font-medium bg-gradient-to-br from-blue-500 to-purple-600">
                              {userInfo.avatar}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{userInfo.name}</div>
                              <div className="text-xs text-muted-foreground">{userInfo.email}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {assignedUsers.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Selected Members</label>
                      <div className="flex flex-wrap gap-2">
                        {assignedUsers.map((userId) => {
                          const user = allUsers.find(u => u.id === userId);
                          if (!user) return null;
                          const userInfo = getUserDisplayInfo(user);
                          return (
                            <Badge 
                              key={userId} 
                              variant="secondary" 
                              className="glass-card"
                            >
                              {userInfo.name}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Other tab contents can be added here in the future */}
          <TabsContent value="scheduling" className="space-y-6">
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Scheduling features coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="assignment" className="space-y-6">
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Advanced assignment features coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="dependencies" className="space-y-6">
            <div className="text-center py-8 text-muted-foreground">
              <Link className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Dependency management coming soon</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-4 border-t border-border/20">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              // Reset form or close
              setFormData({
                name: '',
                description: '',
                isRequired: true,
                estimatedHours: '',
                dueDate: '',
                priority: 'medium'
              });
              setAssignedUsers([]);
              setSelectedTemplate(null);
            }}
            className="glass-card hover:shadow-lg transition-all duration-300"
          >
            <X className="h-4 w-4 mr-2" />
            Reset Form
          </Button>
          
          <Button
            type="submit"
            disabled={!validateForm() || isSubmitting}
            className="glass-card hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0"
          >
            {isSubmitting ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Stage
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}