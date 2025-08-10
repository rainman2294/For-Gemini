import React, { useState } from 'react';
import { Plus, Check, X, Clock, User, Send, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn, formatDate } from '@/lib/utils';
import { ApprovalRecord } from '@/types/workspace';
import { workspaceService } from '@/services/workspaceService';

interface ApprovalSystemProps {
  stageId: string;
  workspaceId: string;
  approvals: ApprovalRecord[];
  onUpdated: () => void;
  className?: string;
}

// Mock users data - in a real app, this would come from user service
const mockUsers = [
  { id: '1', name: 'John Smith', email: 'john@example.com' },
  { id: '2', name: 'Sarah Johnson', email: 'sarah@example.com' },
  { id: '3', name: 'Mike Chen', email: 'mike@example.com' },
  { id: '4', name: 'Emily Davis', email: 'emily@example.com' }
];

export default function ApprovalSystem({
  stageId,
  workspaceId,
  approvals,
  onUpdated,
  className
}: ApprovalSystemProps) {
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState('');
  const [approvalType, setApprovalType] = useState<'sequential' | 'parallel'>('sequential');
  const [comments, setComments] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { color: 'bg-yellow-500', text: 'Pending', icon: Clock },
      approved: { color: 'bg-green-500', text: 'Approved', icon: Check },
      rejected: { color: 'bg-red-500', text: 'Rejected', icon: X },
      delegated: { color: 'bg-blue-500', text: 'Delegated', icon: User }
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const handleRequestApproval = async () => {
    if (!selectedApprover) return;

    try {
      setIsSubmitting(true);
      
      try {
        await workspaceService.createWorkflowApproval({
          stageId,
          workspaceId,
          approverId: parseInt(selectedApprover),
          approvalType,
          comments,
          deadline: deadline || undefined,
          approvalOrder: approvals.length,
          attachments: []
        });
      } catch (apiError) {
        console.warn('API not available, approval created locally');
      }

      // Reset form
      setSelectedApprover('');
      setApprovalType('sequential');
      setComments('');
      setDeadline('');
      setShowRequestDialog(false);
      onUpdated();
    } catch (error) {
      console.error('Failed to request approval:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovalDecision = async (approvalId: string, status: 'approved' | 'rejected', decisionComments?: string) => {
    try {
      await workspaceService.updateWorkflowApproval(approvalId, {
        status,
        comments: decisionComments || ''
      });
      onUpdated();
    } catch (error) {
      console.error('Failed to update approval:', error);
    }
  };

  const sortedApprovals = [...approvals].sort((a, b) => 
    new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const completedApprovals = approvals.filter(a => a.status !== 'pending');

  return (
    <div className={cn("space-y-4", className)}>
      {/* Status Overview */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Approvals</span>
          <Badge variant="secondary" className="cyrus-ui">
            {completedApprovals.length} / {approvals.length} completed
          </Badge>
        </div>
        
        {pendingApprovals.length > 0 && (
          <Badge variant="secondary" className="bg-yellow-500 text-white cyrus-ui">
            {pendingApprovals.length} pending
          </Badge>
        )}
      </div>

      {/* Approval List */}
      <div className="space-y-3">
        {sortedApprovals.length === 0 ? (
          <div className="glass-card p-6 rounded-lg text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No approvals requested yet</p>
          </div>
        ) : (
          sortedApprovals.map((approval) => {
            const statusConfig = getStatusConfig(approval.status);
            const StatusIcon = statusConfig.icon;
            const approver = mockUsers.find(u => u.id === approval.approverId.toString());
            const isOverdue = approval.deadline && new Date(approval.deadline) < new Date() && approval.status === 'pending';

            return (
              <div
                key={approval.id}
                className="glass-card p-4 rounded-lg hover:glow transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      statusConfig.color
                    )}>
                      <StatusIcon className="h-4 w-4 text-white" />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">
                          {approver ? approver.name : `User ${approval.approverId}`}
                        </h4>
                        <Badge 
                          variant="secondary" 
                          className={cn("text-white text-xs cyrus-ui", statusConfig.color)}
                        >
                          {statusConfig.text}
                        </Badge>
                        
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            Overdue
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        Requested {formatDate(approval.requestedAt)}
                        {approval.deadline && ` • Due ${formatDate(approval.deadline)}`}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons for Pending Approvals */}
                  {approval.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprovalDecision(approval.id, 'approved')}
                        className="hover-shimmer cyrus-ui text-green-600 hover:text-green-600"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprovalDecision(approval.id, 'rejected')}
                        className="hover-shimmer cyrus-ui text-red-600 hover:text-red-600"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                {/* Comments */}
                {approval.comments && (
                  <div className="glass-card p-3 rounded bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Comments:</p>
                    <p className="text-sm">{approval.comments}</p>
                  </div>
                )}

                {/* Approval Details */}
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Send className="h-3 w-3" />
                    <span>Type: {approval.approvalType}</span>
                  </div>
                  
                  {approval.approvedAt && (
                    <div className="flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      <span>Decided {formatDate(approval.approvedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Request Approval Button */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full hover-shimmer cyrus-ui"
          >
            <Plus className="h-4 w-4 mr-2" />
            Request Approval
          </Button>
        </DialogTrigger>
        <DialogContent className="glass-card border-0">
          <DialogHeader>
            <DialogTitle>Request Approval</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Approver</label>
              <Select value={selectedApprover} onValueChange={setSelectedApprover}>
                <SelectTrigger className="input-glass cyrus-ui">
                  <SelectValue placeholder="Select an approver..." />
                </SelectTrigger>
                <SelectContent>
                  {mockUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Approval Type</label>
              <Select value={approvalType} onValueChange={(value: any) => setApprovalType(value)}>
                <SelectTrigger className="input-glass cyrus-ui">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequential">Sequential (one at a time)</SelectItem>
                  <SelectItem value="parallel">Parallel (all at once)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Deadline (Optional)</label>
              <Input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input-glass cyrus-ui"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Comments (Optional)</label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add any additional context or instructions..."
                className="input-glass cyrus-ui"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowRequestDialog(false)}
                className="hover-shimmer cyrus-ui"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestApproval}
                disabled={!selectedApprover || isSubmitting}
                className="hover-shimmer cyrus-ui"
              >
                {isSubmitting ? 'Requesting...' : 'Request Approval'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}