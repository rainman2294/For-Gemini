import { useState, useEffect, useCallback } from 'react';
import { Note } from '@/types/project';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { notesService } from '@/services/notesService';

interface UseNotesResult {
  notes: Note[];
  noteInput: string;
  setNoteInput: (value: string) => void;
  handleAddNote: () => void;
  handleEditNote: (noteId: string) => void;
  handleConfirmDelete: () => void;
  handleReply: (noteId: string) => void;
  replyTo: string | null;
  setReplyTo: (id: string | null) => void;
  replyInput: string;
  setReplyInput: (value: string) => void;
  editingNoteId: string | null;
  setEditingNoteId: (id: string | null) => void;
  editInput: string;
  setEditInput: (value: string) => void;
  noteIdToDelete: string | null;
  setNoteIdToDelete: (id: string | null) => void;
}

export function useNotes(projectId: string): UseNotesResult {
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [noteIdToDelete, setNoteIdToDelete] = useState<string | null>(null);
  const activityLogger = useActivityLogger();

  const userId = localStorage.getItem('userId') || 'demo-user';
  const userName = localStorage.getItem('userDisplayName') || 'Demo User';

  const fetchNotes = useCallback(async () => {
    try {
      const apiConfig = typeof window !== 'undefined' && window.pulse2 ? window.pulse2 : null;
      if (apiConfig) {
        const data = await notesService.getNotesByProject(projectId);
        setNotes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      setNotes([]);
    }
  }, [projectId]);

  useEffect(() => {
    fetchNotes();
    const interval = setInterval(fetchNotes, 5000);
    return () => clearInterval(interval);
  }, [fetchNotes]);

  const handleAddNote = async () => {
    if (!noteInput.trim() || !projectId) return;

    try {
      const created = await notesService.createNote({ projectId, content: noteInput });
      setNotes(prev => [...prev, created as any]);
      setNoteInput('');
      activityLogger.logNoteAdded(projectId, (created as any).id, noteInput);
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleReply = async (parentNoteId: string) => {
    if (!replyInput.trim() || !projectId) return;

    try {
      const created = await notesService.createNote({ projectId, content: replyInput, parentId: parentNoteId });
      setNotes(prev => prev.map(n => n.id === parentNoteId ? { ...n, replies: [...(n.replies || []), created as any] } : n));
      setReplyTo(null);
      setReplyInput('');
      activityLogger.logNoteAdded(projectId, (created as any).id, replyInput, true, parentNoteId);
    } catch (error) {
      console.error('Failed to reply to note:', error);
    }
  };

  const handleEditNote = async (noteId: string) => {
    if (!editInput.trim() || !projectId) return;

    try {
      const oldNote = notes.find(n => n.id === noteId);
      const oldContent = oldNote?.content || '';
      const updated = await notesService.updateNote(noteId, { content: editInput });
      setNotes(prev => prev.map(n => n.id === noteId ? updated as any : n));
      setEditingNoteId(null);
      setEditInput('');
      activityLogger.logNoteEdited(projectId, noteId, editInput, oldContent);
    } catch (error) {
      console.error('Failed to edit note:', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!noteIdToDelete || !projectId) return;
    const noteToDelete = notes.find(n => n.id === noteIdToDelete);
    if (noteToDelete) {
      try {
        await notesService.deleteNote(noteIdToDelete);
        setNotes(prev => prev.filter(n => n.id !== noteIdToDelete));
        activityLogger.logNoteDeleted(projectId, noteIdToDelete, noteToDelete.content);
      } catch (error) {
        console.error('Failed to delete note:', error);
      }
    }
    setNoteIdToDelete(null);
  };

  return {
    notes,
    noteInput,
    setNoteInput,
    replyTo,
    setReplyTo,
    replyInput,
    setReplyInput,
    editingNoteId,
    setEditingNoteId,
    editInput,
    setEditInput,
    noteIdToDelete,
    setNoteIdToDelete,
    handleAddNote,
    handleReply,
    handleEditNote,
    handleConfirmDelete,
  };
} 