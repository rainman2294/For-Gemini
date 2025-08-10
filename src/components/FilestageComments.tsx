import React, { useState, useRef } from 'react';
import { MessageCircle, Send, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNotes } from '@/hooks/useNotes';
import { Note } from '@/types/project';

interface ImageComment {
  id: string;
  x: number; // Percentage position
  y: number; // Percentage position
  content: string;
  authorName: string;
  authorId: string;
  createdAt: string;
  resolved: boolean;
}

interface FilestageCommentsProps {
  imageUrl: string;
  imageAlt: string;
  projectId: string;
  mediaId: string;
  userId: string;
  userName: string;
  comments?: ImageComment[];
  onAddComment?: (comment: Omit<ImageComment, 'id' | 'createdAt'>) => void;
  onResolveComment?: (commentId: string) => void;
  className?: string;
}

export function FilestageComments({
  imageUrl,
  imageAlt,
  projectId,
  mediaId,
  userId,
  userName,
  comments = [],
  onAddComment,
  onResolveComment,
  className
}: FilestageCommentsProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [showingComments, setShowingComments] = useState(true);
  const [newComment, setNewComment] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);

  const notesState = useNotes(projectId);
  const {
    notes,
    noteInput,
    setNoteInput,
    handleAddNote,
    // Add other needed states/handlers
  } = notesState;

  // Convert ImageComment to Note format if needed
  const convertToNote = (comment: ImageComment): Note => ({
    id: comment.id,
    projectId,
    authorId: comment.authorId,
    authorName: comment.authorName,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.createdAt, // Use createdAt if updatedAt not available
    // Add any other required fields
  });

  // When adding a comment, use the hook's handleAddNote
  const handleSaveComment = () => {
    if (!newComment || !newComment.content.trim()) return;
    
    setNoteInput(newComment.content);
    handleAddNote();
    setNewComment(null);
  };

  const handleCancelComment = () => {
    setNewComment(null);
  };

  const handleResolve = (commentId: string) => {
    onResolveComment?.(commentId);
  };

  // Add back handleImageClick
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (newComment) return; // Don't create new comment if one is already being created
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setNewComment({ x, y, content: '' });
  };

  return (
    <div className={cn("relative", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium">
            Comments ({comments.filter(c => !c.resolved).length})
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowingComments(!showingComments)}
          className="text-xs"
        >
          {showingComments ? 'Hide' : 'Show'} Comments
        </Button>
      </div>

      {/* Image Container */}
      <div className="relative glass-card p-2 rounded-lg">
        <img
          ref={imageRef}
          src={imageUrl}
          alt={imageAlt}
          className="w-full h-auto rounded cursor-crosshair"
          onClick={handleImageClick}
        />
        
        {/* Comment Pins */}
        {showingComments && comments.map((comment) => (
          <CommentPin
            key={comment.id}
            comment={comment}
            onResolve={() => handleResolve(comment.id)}
            currentUserId={userId}
          />
        ))}
        
        {/* New Comment Input */}
        {newComment && (
          <div
            className="absolute z-20"
            style={{
              left: `${newComment.x}%`,
              top: `${newComment.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <NewCommentInput
              value={newComment.content}
              onChange={(content) => setNewComment({ ...newComment, content })}
              onSave={handleSaveComment}
              onCancel={handleCancelComment}
            />
          </div>
        )}
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Click anywhere on the image to add a comment
      </p>
    </div>
  );
}

interface CommentPinProps {
  comment: ImageComment;
  onResolve: () => void;
  currentUserId: string;
}

function CommentPin({ comment, onResolve, currentUserId }: CommentPinProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isAuthor = comment.authorId === currentUserId;

  return (
    <>
      {/* Pin */}
      <button
        className={cn(
          "absolute w-6 h-6 rounded-full border-2 border-white shadow-lg transition-all duration-200 z-10",
          comment.resolved 
            ? "bg-green-500 hover:bg-green-600" 
            : "bg-blue-500 hover:bg-blue-600",
          isExpanded && "scale-110"
        )}
        style={{
          left: `${comment.x}%`,
          top: `${comment.y}%`,
          transform: 'translate(-50%, -50%)'
        }}
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
      >
        <MessageCircle className="w-3 h-3 text-white mx-auto" />
      </button>
      
      {/* Comment Tooltip */}
      {isExpanded && (
        <div
          className="absolute z-20 min-w-[250px] max-w-[300px]"
          style={{
            left: `${comment.x}%`,
            top: `${comment.y}%`,
            transform: 'translate(-50%, calc(-100% - 10px))'
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{comment.authorName}</span>
                {comment.resolved && (
                  <Badge variant="secondary" className="text-xs">
                    Resolved
                  </Badge>
                )}
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              {comment.content}
            </p>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
              
              {!comment.resolved && isAuthor && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onResolve}
                  className="text-xs h-6"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Resolve
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface NewCommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

function NewCommentInput({ value, onChange, onSave, onCancel }: NewCommentInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-3 min-w-[250px]">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add your comment..."
        className="min-h-[60px] mb-2 text-sm"
        onKeyDown={handleKeyDown}
        autoFocus
      />
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={!value.trim()}>
          <Send className="w-3 h-3 mr-1" />
          Comment
        </Button>
      </div>
    </div>
  );
}