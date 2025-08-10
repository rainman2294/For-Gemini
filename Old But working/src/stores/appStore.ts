import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Project, ViewMode, FilterMode, ProjectStatus } from '@/types/project';
import { User } from '@/types/user';
import { Activity } from '@/types/activity';
import { BaseWorkspace } from '@/types/workspace';

// Define the app state interface
export interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  jwtToken: string | null;
  userDisplayName: string | null;

  // UI state
  currentView: 'list' | 'detail' | 'form';
  selectedProjectId: string | null;
  editingProject: Project | null;
  viewMode: ViewMode;
  isCompact: boolean;
  isInFocusMode: boolean;
  
  // Modal states
  isLoginModalOpen: boolean;
  isHamburgerMenuOpen: boolean;
  showPinnedSidebar: boolean;
  showNotifications: boolean;
  showSearchResults: boolean;
  
  // Search and filters
  globalSearchTerm: string;
  isSearchingGlobally: boolean;
  searchScope: 'current' | 'global';
  filterMode: FilterMode;
  statusFilter: ProjectStatus | 'all';
  sortMode: 'newest' | 'oldest' | 'name' | 'status' | 'priority' | 'deadline';
  
  // Data state
  projects: Project[];
  workspaces: BaseWorkspace[];
  activities: Activity[];
  
  // Pinned groups
  pinnedGroups: Array<{
    id: string;
    name: string;
    projectIds: string[];
    expanded: boolean;
  }>;
  editingGroupId: string | null;
  editingGroupName: string;
  pinningProjectId: string | null;
  
  // Notifications
  notificationCount: number;
  autoRefresh: boolean;
  
  // User preferences (persisted)
  preferences: {
    theme: 'light' | 'dark' | 'system';
    defaultView: ViewMode;
    compactMode: boolean;
    autoRefresh: boolean;
    notificationsEnabled: boolean;
    focusModeEnabled: boolean;
  };
}

// Define the actions interface
export interface AppActions {
  // User actions
  setUser: (user: User | null) => void;
  setAuthToken: (token: string | null) => void;
  setUserDisplayName: (name: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  
  // UI actions
  setCurrentView: (view: 'list' | 'detail' | 'form') => void;
  setSelectedProjectId: (id: string | null) => void;
  setEditingProject: (project: Project | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setIsCompact: (compact: boolean) => void;
  toggleFocusMode: () => void;
  
  // Modal actions
  setLoginModalOpen: (open: boolean) => void;
  setHamburgerMenuOpen: (open: boolean) => void;
  setShowPinnedSidebar: (show: boolean) => void;
  setShowNotifications: (show: boolean) => void;
  setShowSearchResults: (show: boolean) => void;
  
  // Search and filter actions
  setGlobalSearchTerm: (term: string) => void;
  setIsSearchingGlobally: (searching: boolean) => void;
  setSearchScope: (scope: 'current' | 'global') => void;
  setFilterMode: (mode: FilterMode) => void;
  setStatusFilter: (status: ProjectStatus | 'all') => void;
  setSortMode: (mode: 'newest' | 'oldest' | 'name' | 'status' | 'priority' | 'deadline') => void;
  
  // Data actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setWorkspaces: (workspaces: BaseWorkspace[]) => void;
  setActivities: (activities: Activity[]) => void;
  addActivity: (activity: Activity) => void;
  
  // Pinned groups actions
  setPinnedGroups: (groups: AppState['pinnedGroups']) => void;
  addPinnedGroup: (group: { id: string; name: string; projectIds: string[]; expanded: boolean }) => void;
  updatePinnedGroup: (id: string, updates: Partial<AppState['pinnedGroups'][0]>) => void;
  removePinnedGroup: (id: string) => void;
  setEditingGroupId: (id: string | null) => void;
  setEditingGroupName: (name: string) => void;
  setPinningProjectId: (id: string | null) => void;
  
  // Notification actions
  setNotificationCount: (count: number) => void;
  setAutoRefresh: (enabled: boolean) => void;
  
  // Preference actions
  updatePreferences: (updates: Partial<AppState['preferences']>) => void;
  resetPreferences: () => void;
  
  // Utility actions
  resetState: () => void;
}

// Default preferences
const defaultPreferences: AppState['preferences'] = {
  theme: 'system',
  defaultView: 'list',
  compactMode: false,
  autoRefresh: false,
  notificationsEnabled: true,
  focusModeEnabled: false,
};

// Initial state
const initialState: Omit<AppState, keyof AppActions> = {
  // User state
  user: null,
  isAuthenticated: false,
  jwtToken: null,
  userDisplayName: null,

  // UI state
  currentView: 'list',
  selectedProjectId: null,
  editingProject: null,
  viewMode: 'list',
  isCompact: false,
  isInFocusMode: false,
  
  // Modal states
  isLoginModalOpen: false,
  isHamburgerMenuOpen: false,
  showPinnedSidebar: false,
  showNotifications: false,
  showSearchResults: false,
  
  // Search and filters
  globalSearchTerm: '',
  isSearchingGlobally: false,
  searchScope: 'current',
  filterMode: 'active',
  statusFilter: 'all',
  sortMode: 'newest',
  
  // Data state
  projects: [],
  workspaces: [],
  activities: [],
  
  // Pinned groups
  pinnedGroups: [
    { id: '1', name: 'Priority', projectIds: [], expanded: true }
  ],
  editingGroupId: null,
  editingGroupName: '',
  pinningProjectId: null,
  
  // Notifications
  notificationCount: 0,
  autoRefresh: false,
  
  // User preferences
  preferences: defaultPreferences,
};

// Create the store with persistence for preferences and user data
export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // User actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAuthToken: (token) => set({ jwtToken: token, isAuthenticated: !!token }),
      setUserDisplayName: (name) => set({ userDisplayName: name }),
      login: (user, token) => set({ 
        user, 
        jwtToken: token, 
        isAuthenticated: true, 
        userDisplayName: user.displayName || user.name || user.email 
      }),
      logout: () => set({ 
        user: null, 
        jwtToken: null, 
        isAuthenticated: false, 
        userDisplayName: null,
        isLoginModalOpen: false 
      }),
      
      // UI actions
      setCurrentView: (view) => set({ currentView: view }),
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),
      setEditingProject: (project) => set({ editingProject: project }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setIsCompact: (compact) => set({ isCompact: compact }),
      toggleFocusMode: () => set((state) => ({ isInFocusMode: !state.isInFocusMode })),
      
      // Modal actions
      setLoginModalOpen: (open) => set({ isLoginModalOpen: open }),
      setHamburgerMenuOpen: (open) => set({ isHamburgerMenuOpen: open }),
      setShowPinnedSidebar: (show) => set({ showPinnedSidebar: show }),
      setShowNotifications: (show) => set({ showNotifications: show }),
      setShowSearchResults: (show) => set({ showSearchResults: show }),
      
      // Search and filter actions
      setGlobalSearchTerm: (term) => set({ globalSearchTerm: term }),
      setIsSearchingGlobally: (searching) => set({ isSearchingGlobally: searching }),
      setSearchScope: (scope) => set({ searchScope: scope }),
      setFilterMode: (mode) => set({ filterMode: mode }),
      setStatusFilter: (status) => set({ statusFilter: status }),
      setSortMode: (mode) => set({ sortMode: mode }),
      
      // Data actions
      setProjects: (projects) => set({ projects }),
      addProject: (project) => set((state) => ({ 
        projects: [...state.projects, project] 
      })),
      updateProject: (id, updates) => set((state) => ({
        projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p)
      })),
      removeProject: (id) => set((state) => ({
        projects: state.projects.filter(p => p.id !== id)
      })),
      setWorkspaces: (workspaces) => set({ workspaces }),
      setActivities: (activities) => set({ activities }),
      addActivity: (activity) => set((state) => ({
        activities: [activity, ...state.activities]
      })),
      
      // Pinned groups actions
      setPinnedGroups: (groups) => set({ pinnedGroups: groups }),
      addPinnedGroup: (group) => set((state) => ({
        pinnedGroups: [...state.pinnedGroups, group]
      })),
      updatePinnedGroup: (id, updates) => set((state) => ({
        pinnedGroups: state.pinnedGroups.map(g => g.id === id ? { ...g, ...updates } : g)
      })),
      removePinnedGroup: (id) => set((state) => ({
        pinnedGroups: state.pinnedGroups.filter(g => g.id !== id)
      })),
      setEditingGroupId: (id) => set({ editingGroupId: id }),
      setEditingGroupName: (name) => set({ editingGroupName: name }),
      setPinningProjectId: (id) => set({ pinningProjectId: id }),
      
      // Notification actions
      setNotificationCount: (count) => set({ notificationCount: count }),
      setAutoRefresh: (enabled) => set({ autoRefresh: enabled }),
      
      // Preference actions
      updatePreferences: (updates) => set((state) => ({
        preferences: { ...state.preferences, ...updates }
      })),
      resetPreferences: () => set({ preferences: defaultPreferences }),
      
      // Utility actions
      resetState: () => set(initialState),
    }),
    {
      name: 'pulse2-app-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist user data and preferences
        jwtToken: state.jwtToken,
        userDisplayName: state.userDisplayName,
        preferences: state.preferences,
        pinnedGroups: state.pinnedGroups,
        viewMode: state.viewMode,
        isCompact: state.isCompact,
        filterMode: state.filterMode,
        statusFilter: state.statusFilter,
        sortMode: state.sortMode,
      }),
    }
  )
);

// Selectors for common state combinations
export const useAuthState = () => useAppStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  jwtToken: state.jwtToken,
  userDisplayName: state.userDisplayName,
}));

export const useUIState = () => useAppStore((state) => ({
  currentView: state.currentView,
  selectedProjectId: state.selectedProjectId,
  editingProject: state.editingProject,
  viewMode: state.viewMode,
  isCompact: state.isCompact,
  isInFocusMode: state.isInFocusMode,
}));

export const useModalState = () => useAppStore((state) => ({
  isLoginModalOpen: state.isLoginModalOpen,
  isHamburgerMenuOpen: state.isHamburgerMenuOpen,
  showPinnedSidebar: state.showPinnedSidebar,
  showNotifications: state.showNotifications,
  showSearchResults: state.showSearchResults,
}));

export const useSearchState = () => useAppStore((state) => ({
  globalSearchTerm: state.globalSearchTerm,
  isSearchingGlobally: state.isSearchingGlobally,
  searchScope: state.searchScope,
  filterMode: state.filterMode,
  statusFilter: state.statusFilter,
  sortMode: state.sortMode,
}));

export const useDataState = () => useAppStore((state) => ({
  projects: state.projects,
  workspaces: state.workspaces,
  activities: state.activities,
}));