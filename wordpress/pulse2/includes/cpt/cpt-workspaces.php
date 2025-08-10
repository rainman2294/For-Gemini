<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

function pulse2_register_workspace_cpt() {
    $labels = array(
        'name' => 'Workspaces',
        'singular_name' => 'Workspace',
        'add_new' => 'Add New',
        'add_new_item' => 'Add New Workspace',
        'edit_item' => 'Edit Workspace',
        'new_item' => 'New Workspace',
        'view_item' => 'View Workspace',
        'search_items' => 'Search Workspaces',
        'not_found' => 'No workspaces found',
        'not_found_in_trash' => 'No workspaces found in trash'
    );
    $args = array(
        'labels' => $labels,
        'public' => false,
        'show_ui' => true,
        'show_in_menu' => 'edit.php?post_type=pulse2_project',
        'supports' => array('title'),
        'show_in_rest' => true,
        'hierarchical' => false,
        'capability_type' => 'post'
    );
    register_post_type('pulse2_workspace', $args);
}


