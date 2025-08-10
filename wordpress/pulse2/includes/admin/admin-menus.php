<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

// Add submenu items for notes and activities under Projects
function pulse2_add_admin_submenus() {
    // Add Notes submenu
    add_submenu_page(
        'edit.php?post_type=pulse2_project', // Parent slug (Projects)
        'Notes', // Page title
        'Notes', // Menu title
        'edit_posts', // Capability
        'edit.php?post_type=pulse2_note' // Menu slug
    );
    
    // Add Activities submenu
    add_submenu_page(
        'edit.php?post_type=pulse2_project', // Parent slug (Projects)
        'Activities', // Page title
        'Activities', // Menu title
        'edit_posts', // Capability
        'edit.php?post_type=pulse2_activity' // Menu slug
    );
}

// Add Settings submenu
function pulse2_add_settings_submenu() {
    add_submenu_page(
        'edit.php?post_type=pulse2_project', // Parent slug (Projects)
        'Pulse 2 Settings', // Page title
        'Settings', // Menu title
        'manage_options', // Capability (admin only)
        'pulse2-settings', // Menu slug
        'pulse2_settings_page' // Callback function
    );
}

// Hook admin menu functions
add_action('admin_menu', 'pulse2_add_admin_submenus');
add_action('admin_menu', 'pulse2_add_settings_submenu');