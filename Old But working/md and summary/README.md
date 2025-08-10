# Pulse 2

A modern project management tool for creative studios, built with React, TypeScript, and Tailwind CSS.

## Features

- **Multiple View Options**: 
  - **List View**: Traditional project cards
  - **Calendar View**: Projects displayed on a calendar
  - **Monday View**: Projects organized in a Monday.com-style table layout
- **Project Organization**: Group projects by deadline (This month, Next month, Future, Past)
- **Visual Status Updates**: Color-coded status indicators
- **Timeline Progress**: Visual progress bars for each project
- **Priority Management**: Star-based priority system
- **Filtering & Sorting**: Filter by status, sort by various criteria

## Project Structure

The application is built with React, TypeScript, and uses Tailwind CSS for styling. The main components include:

- `ProjectCard.tsx`: Card view for individual projects
- `CalendarView.tsx`: Calendar-based view for projects
- `MondayView.tsx`: Table-based view similar to Monday.com
- `ProjectForm.tsx`: Form for creating and editing projects

## Getting Started

1. Install dependencies:

```bash
npm install
# or
yarn install
```

2. Run the development server:

```bash
npm run dev
# or
yarn dev
```

3. Build for production:

```bash
npm run build
# or
yarn build
```

## How to Use the Monday View

The Monday view provides a compact, table-based layout similar to Monday.com:

1. Click the table icon in the view options to switch to Monday view
2. Projects are automatically organized by their deadlines into groups:
   - This month
   - Next month
   - Future
   - Past
3. Click on a group header to expand/collapse it
4. Each row shows key project information:
   - Project name and client
   - Project owner
   - Current status
   - Timeline progress
   - Due date
   - Priority level
5. Click on any row to edit the project details

The Monday view is especially useful for getting a high-level overview of many projects at once.
