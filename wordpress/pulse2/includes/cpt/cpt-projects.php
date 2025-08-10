<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

function pulse2_register_project_cpt() {
    $labels = array(
        'name' => 'Projects',
        'singular_name' => 'Project',
        'menu_name' => 'Pulse 2',
        'add_new' => 'Add Project',
        'add_new_item' => 'Add New Project',
        'edit_item' => 'Edit Project',
        'new_item' => 'New Project',
        'view_item' => 'View Project',
        'search_items' => 'Search Projects',
        'not_found' => 'No projects found',
        'not_found_in_trash' => 'No projects found in trash'
    );
    $args = array(
        'labels' => $labels,
        'public' => true,
        'show_ui' => true,
        'supports' => array('title'),
        'show_in_rest' => true,
        'menu_icon' => 'dashicons-chart-bar',
        'hierarchical' => false,
        'capability_type' => 'post'
    );
    register_post_type('pulse2_project', $args);
}


