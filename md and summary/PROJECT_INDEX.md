# Pulse 2 - Project Index

## Overview
Pulse 2 is a modern project management tool for creative studios, built with React, TypeScript, and Tailwind CSS. It provides multiple view options for managing projects with features like status tracking, timeline progress, priority management, and team collaboration.

## Technology Stack
- **Frontend**: React 18.3.1, TypeScript 5.5.3
- **Build Tool**: Vite 5.4.1
- **Styling**: Tailwind CSS 3.4.11
- **UI Components**: Radix UI primitives
- **State Management**: TanStack Query (React Query) 5.56.2
- **Routing**: React Router DOM 6.30.1
- **Forms**: React Hook Form 7.53.0 with Zod validation
- **Charts**: Recharts 2.12.7
- **Icons**: Lucide React 0.462.0
- **Date Handling**: date-fns 3.6.0

## Project Structure

### Root Files
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Vite configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `README.md` - Project documentation
- `index.html` - Entry HTML file

### Source Code (`src/`)

#### Core Application Files
- `main.tsx` - Application entry point
- `App.tsx` - Root component with providers and routing
- `index.css` - Global styles
- `App.css` - Application-specific styles

#### Pages (`src/pages/`)
- `Index.tsx` - Main application page (893 lines)
  - Handles project management, filtering, sorting
  - Multiple view modes (list, calendar, Monday, activity, profile)
  - Project CRUD operations
  - User authentication
  - Import/export functionality
- `NotFound.tsx` - 404 error page

#### Components (`src/components/`)

**Core Project Components:**
- `ProjectCard.tsx` (246 lines) - Individual project card display
- `ProjectForm.tsx` (416 lines) - Create/edit project form
- `ProjectDetail.tsx` (29 lines) - Project detail wrapper
- `ProjectDetailsContent.tsx` (344 lines) - Detailed project view
- `ProjectDetailModal.tsx` (30 lines) - Modal for project details

**View Components:**
- `MondayView.tsx` (313 lines) - Monday.com-style table view
- `CalendarView.tsx` (183 lines) - Calendar-based project view
- `Timeline.tsx` (154 lines) - Project timeline visualization

**Activity & Collaboration:**
- `ActivityFeed.tsx` (421 lines) - Activity logging and display
- `ProfileTab.tsx` (922 lines) - User profile management
- `LoginModal.tsx` (158 lines) - User authentication modal

**Media Management:**
- `MediaUploader.tsx` (97 lines) - File upload functionality
- `MediaLibraryModal.tsx` (111 lines) - Media library interface
- `ImageSlider.tsx` (91 lines) - Image carousel component
- `LightboxModal.tsx` (135 lines) - Full-screen image viewer

**Analytics:**
- `AnalyticsDashboard.tsx` (391 lines) - Project analytics and reporting

**UI Components (`src/components/ui/`):**
Comprehensive set of reusable UI components built with Radix UI:
- Form components (input, select, textarea, etc.)
- Layout components (card, dialog, sidebar, etc.)
- Navigation components (breadcrumb, navigation-menu, etc.)
- Feedback components (toast, alert, progress, etc.)
- Data display components (table, tabs, accordion, etc.)

#### Types (`src/types/`)
- `project.ts` (72 lines) - Project-related type definitions
- `user.ts` (312 lines) - User management types
- `activity.ts` (70 lines) - Activity logging types
- `analytics.ts` (118 lines) - Analytics data types

#### Hooks (`src/hooks/`)
- `useProjectFilters.ts` (62 lines) - Project filtering and sorting logic
- `useActivityLogger.ts` (409 lines) - Activity logging functionality
- `useNotes.ts` (174 lines) - Note management
- `useUserManagement.ts` (519 lines) - User authentication and management
- `use-toast.ts` (192 lines) - Toast notification system
- `use-mobile.tsx` (20 lines) - Mobile device detection

#### Data & Utilities (`src/data/`, `src/lib/`)
- `data/sampleProjects.ts` - Sample project data
- `lib/mockApi.ts` - Mock API for development
- `lib/statuses.ts` - Project status definitions
- `lib/theme-provider.tsx` - Theme management
- `lib/utils.ts` - Utility functions

## Key Features

### 1. Multiple View Modes
- **List View**: Traditional project cards
- **Calendar View**: Projects displayed on a calendar
- **Monday View**: Monday.com-style table layout
- **Activity View**: Activity feed and logging
- **Profile View**: User profile management

### 2. Project Management
- Create, edit, and delete projects
- Status tracking with history
- Priority management (high, medium, low)
- Timeline progress visualization
- Client and artist assignment
- External links integration

### 3. Media Management
- File upload and organization
- Image gallery with lightbox
- Media categorization (Final Render, Clay Render, etc.)
- Video URL support

### 4. Collaboration Features
- Activity logging and feed
- Note system with replies
- User authentication
- Team member management

### 5. Analytics & Reporting
- Project analytics dashboard
- Status distribution charts
- Timeline analysis
- Performance metrics

### 6. Advanced Features
- Import/export functionality
- Project archiving
- Search and filtering
- Sorting options
- Pinned project groups
- Responsive design

## Data Models

### Project
```typescript
interface Project {
  id: string;
  name: string;
  client: string;
  projectManager: string;
  artists: Artist[];
  brief: string;
  externalLinks: ExternalLink[];
  startDate: string;
  endDate: string;
  priority: ProjectPriority;
  status: ProjectStatus;
  statusHistory: StatusHistoryEntry[];
  media: ProjectMedia[];
  videoUrl?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### User
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatar?: string;
  permissions: Permission[];
  preferences: UserPreferences;
}
```

### Activity
```typescript
interface Activity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  projectId: string;
  projectName: string;
  timestamp: string;
  type: ActivityType;
  details: ActivityDetails;
  context: ActivityContext;
  metadata: ActivityMetadata;
}
```

## API Integration

The application supports both mock API (for development) and WordPress backend integration:
- Mock API for development and testing
- WordPress REST API integration
- JWT authentication
- CRUD operations for projects, users, and activities

## Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run build:dev    # Build for development
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

## File Size Summary

**Largest Components:**
1. `ProfileTab.tsx` - 35KB (922 lines)
2. `Index.tsx` - 32KB (893 lines)
3. `useUserManagement.ts` - 16KB (519 lines)
4. `ProjectForm.tsx` - 16KB (416 lines)
5. `ProjectDetailsContent.tsx` - 16KB (344 lines)
6. `useActivityLogger.ts` - 15KB (409 lines)
7. `ActivityFeed.tsx` - 15KB (421 lines)
8. `AnalyticsDashboard.tsx` - 14KB (391 lines)
9. `MondayView.tsx` - 14KB (313 lines)
10. `user.ts` - 7.8KB (312 lines)

## Architecture Patterns

1. **Component-Based Architecture**: Modular React components
2. **Custom Hooks**: Business logic separation
3. **TypeScript**: Type safety throughout
4. **React Query**: Server state management
5. **Radix UI**: Accessible component primitives
6. **Tailwind CSS**: Utility-first styling
7. **Form Validation**: React Hook Form + Zod
8. **Theme System**: Dark/light mode support

## Dependencies Summary

**Core Dependencies (84 total):**
- React ecosystem: 4 packages
- Radix UI components: 25 packages
- Styling & UI: 8 packages
- Forms & validation: 3 packages
- Data fetching: 1 package
- Routing: 1 package
- Charts: 1 package
- Utilities: 41 packages

This comprehensive index provides a complete overview of the Pulse 2 project structure, features, and architecture for easy navigation and understanding. 

## To-Do List for Improvements and Debugging

### Debugging
- High: Audit and Fix API Error Handling (Completed)
- High: Resolve Potential Routing Conflicts (Resolved: HashRouter is appropriate for WordPress embedding and standalone mode; no conflicts found)
- Medium: Fix Typos and Inconsistencies

### Improvements
- High: Refactor Large Files (In Progress: Extracted profile section from ProfileTab.tsx)
- High: Add Tests (Completed: Installed Vitest, configured, added sample setup)
- Medium: Enhance Accessibility (Completed: Added ARIA attributes and keyboard support to ProjectCard.tsx)
- Medium: Optimize Performance (Completed: Added virtualization to MondayView.tsx using react-window)
- Low: Expand Analytics Exports (Completed: Added CSV and PDF export options to AnalyticsDashboard.tsx)
- Low: Improve Documentation (Completed: Added JSDoc to useUserManagement.ts)
- Low: Set Up CI/CD (Completed: Created GitHub Actions workflow for CI) 