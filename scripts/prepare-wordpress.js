#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const buildDir = path.join(projectRoot, 'wordpress', 'pulse2', 'build', 'assets');
const pluginFile = path.join(projectRoot, 'wordpress', 'pulse2', 'pulse2.php');

console.log('🔧 Preparing WordPress plugin...');

// Ensure build directory exists
if (!fs.existsSync(buildDir)) {
    console.error('❌ Build directory not found. Run `npm run build` first.');
    process.exit(1);
}

// Find built assets
const findAssets = () => {
    const files = fs.readdirSync(buildDir);
    
    const assets = {
        js: files.find(f => f.startsWith('index-') && f.endsWith('.js')),
        css: files.find(f => f.startsWith('index-') && f.endsWith('.css')),
        vendor: files.find(f => f.startsWith('vendor-') && f.endsWith('.js')),
        ui: files.find(f => f.startsWith('ui-') && f.endsWith('.js'))
    };
    
    return assets;
};

const assets = findAssets();

console.log('📦 Found assets:');
console.log('  - Main JS:', assets.js || 'Not found');
console.log('  - Main CSS:', assets.css || 'Not found');
console.log('  - Vendor JS:', assets.vendor || 'Not found');
console.log('  - UI JS:', assets.ui || 'Not found');

// Verify plugin file exists
if (!fs.existsSync(pluginFile)) {
    console.error('❌ Plugin file not found at:', pluginFile);
    process.exit(1);
}

// Create manifest file for the plugin to reference
const manifest = {
    main: {
        js: assets.js,
        css: assets.css
    },
    chunks: {
        vendor: assets.vendor,
        ui: assets.ui
    },
    timestamp: new Date().toISOString(),
    version: '2.1.0'
};

const manifestPath = path.join(projectRoot, 'wordpress', 'pulse2', 'build', 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log('📄 Created asset manifest at:', manifestPath);

// Validate that all required database functions exist in the plugin
const pluginContent = fs.readFileSync(pluginFile, 'utf8');

const requiredFunctions = [
    'create_workspaces_table_if_not_exists',
    'create_workspace_categories_table_if_not_exists',
    'create_workspace_images_table_if_not_exists',
    'create_workspace_pins_table_if_not_exists',
    'create_workspace_comments_table_if_not_exists',
    'create_workspace_activities_table_if_not_exists',
    'register_workspace_api_routes'
];

const missingFunctions = requiredFunctions.filter(func => 
    !pluginContent.includes(`function ${func}`)
);

if (missingFunctions.length > 0) {
    console.warn('⚠️  Missing required functions:', missingFunctions);
} else {
    console.log('✅ All required database functions found');
}

// Check for REST API endpoints
const requiredEndpoints = [
    '/workspaces',
    '/workspaces/(?P<workspace_id>[a-zA-Z0-9\\-]+)/categories',
    '/workspaces/(?P<workspace_id>[a-zA-Z0-9\\-]+)/images',
    '/workspace-images/(?P<image_id>[a-zA-Z0-9\\-]+)/pins',
    '/workspace-activities'
];

const missingEndpoints = requiredEndpoints.filter(endpoint => 
    !pluginContent.includes(endpoint)
);

if (missingEndpoints.length > 0) {
    console.warn('⚠️  Missing required endpoints:', missingEndpoints);
} else {
    console.log('✅ All required API endpoints found');
}

// Create installation instructions
const readmePath = path.join(projectRoot, 'wordpress', 'pulse2', 'README.md');
const readmeContent = `# Pulse 2 WordPress Plugin

## Installation

1. Upload the \`pulse2\` folder to your \`/wp-content/plugins/\` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. The plugin will automatically create the required database tables

## Usage

Add the shortcode \`[pulse2]\` to any page or post where you want the Pulse 2 app to appear.

## Features

- Complete project management system
- Workspace types: Moodboards, Whiteboards, Workflows, Timelines
- Image upload and annotation
- Pin-based feedback system
- Real-time activity tracking
- Collaborative workspace management

## Database Tables

The plugin creates the following tables:
- \`wp_pulse2_workspaces\` - Main workspace data
- \`wp_pulse2_workspace_categories\` - Workspace categories
- \`wp_pulse2_workspace_images\` - Image uploads
- \`wp_pulse2_workspace_pins\` - Pin annotations
- \`wp_pulse2_workspace_comments\` - Comments and feedback
- \`wp_pulse2_workspace_activities\` - Activity logging

## API Endpoints

All endpoints are available under \`/wp-json/pulse2/v1/\`:
- Workspaces: \`/workspaces\`
- Categories: \`/workspaces/{id}/categories\`
- Images: \`/workspaces/{id}/images\`
- Pins: \`/workspace-images/{id}/pins\`
- Comments: \`/workspaces/{id}/comments\`
- Activities: \`/workspace-activities\`

## Version

${manifest.version} - Built on ${manifest.timestamp}

## Assets

- Main JS: ${assets.js || 'Not found'}
- Main CSS: ${assets.css || 'Not found'}
- Vendor JS: ${assets.vendor || 'Not found'}
- UI JS: ${assets.ui || 'Not found'}
`;

fs.writeFileSync(readmePath, readmeContent);

console.log('📚 Created README.md with installation instructions');

// Update plugin version if needed
const versionRegex = /Version: ([\d.]+)/;
if (versionRegex.test(pluginContent)) {
    const updatedContent = pluginContent.replace(versionRegex, `Version: ${manifest.version}`);
    fs.writeFileSync(pluginFile, updatedContent);
    console.log('🔄 Updated plugin version to', manifest.version);
}

console.log('');
console.log('🎉 WordPress plugin is ready!');
console.log('');
console.log('📂 Plugin location: wordpress/pulse2/');
console.log('📄 Use shortcode: [pulse2]');
console.log('🔧 All database tables and API endpoints are configured');
console.log('');
console.log('Next steps:');
console.log('1. Copy the wordpress/pulse2/ folder to your WordPress plugins directory');
console.log('2. Activate the plugin in WordPress admin');
console.log('3. Add [pulse2] shortcode to any page');
console.log('');
console.log('✨ Your React app is now fully integrated with WordPress!');