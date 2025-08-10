import { useState, useMemo } from 'react';
import { Project, ProjectStatus, FilterMode } from '@/types/project';

export type SortMode = 'newest' | 'oldest' | 'name' | 'status' | 'priority' | 'deadline';

interface UseProjectFiltersProps {
  projects: Project[];
  searchTerm?: string;
  statusFilter?: ProjectStatus | 'all';
  sortMode?: SortMode;
  filterMode?: FilterMode;
}

export function useProjectFilters(projects: Project[]) {
  const [filterMode, setFilterMode] = useState<FilterMode>('active');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAndSortedProjects = useMemo(() => {
    // Ensure projects is always an array
    if (!Array.isArray(projects)) {
      return [];
    }

    const getDate = (dateString: string): Date | null => {
      try {
        return new Date(dateString);
      } catch {
        return null;
      }
    };

    return projects
      .filter(project => {
        if (filterMode === 'archived') return project.isArchived;
        if (filterMode === 'active') return !project.isArchived;
        return true; // 'all'
      })
      .filter(project => {
        if (statusFilter === 'all') return true;
        return project.status === statusFilter;
      })
      .filter(project => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
          project.name.toLowerCase().includes(search) ||
          project.client.toLowerCase().includes(search) ||
          project.projectManager.toLowerCase().includes(search) ||
          project.brief.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        switch (sortMode) {
          case 'newest':
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          case 'oldest':
            return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          case 'name':
            return a.name.localeCompare(b.name);
          case 'status':
            return a.status.localeCompare(b.status);
          case 'priority':
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          case 'deadline':
            const aDate = getDate(a.endDate);
            const bDate = getDate(b.endDate);
            if (!aDate && !bDate) return 0;
            if (!aDate) return 1;
            if (!bDate) return -1;
            return aDate.getTime() - bDate.getTime();
          default:
            return 0;
        }
      });
  }, [projects, filterMode, sortMode, statusFilter, searchTerm]);

  return {
    filteredAndSortedProjects,
    filterMode,
    setFilterMode,
    sortMode,
    setSortMode,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
  };
} 