# Pulse 2 WordPress Plugin

## Installation

1. Upload the `pulse2` folder to your `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. The plugin will automatically create the required database tables

## Usage

Add the shortcode `[pulse2]` to any page or post where you want the Pulse 2 app to appear.

## Features

- Complete project management system
- Workspace types: Moodboards, Whiteboards, Workflows, Timelines
- Image upload and annotation
- Pin-based feedback system
- Real-time activity tracking
- Collaborative workspace management

## Database Tables

The plugin creates the following tables:
- `wp_pulse2_workspaces` - Main workspace data
- `wp_pulse2_workspace_categories` - Workspace categories
- `wp_pulse2_workspace_images` - Image uploads
- `wp_pulse2_workspace_pins` - Pin annotations
- `wp_pulse2_workspace_comments` - Comments and feedback
- `wp_pulse2_workspace_activities` - Activity logging

## API Endpoints

All endpoints are available under `/wp-json/pulse2/v1/`:
- Workspaces: `/workspaces`
- Categories: `/workspaces/{id}/categories`
- Images: `/workspaces/{id}/images`
- Pins: `/workspace-images/{id}/pins`
- Comments: `/workspaces/{id}/comments`
- Activities: `/workspace-activities`

## Version

2.1.0 - Built on 2025-07-28T17:35:11.577Z

## Assets

- Main JS: index-TJ86AjPB.js
- Main CSS: index-DnjAW5WZ.css
- Vendor JS: vendor-CayYuqk8.js
- UI JS: ui-BDws76LY.js
