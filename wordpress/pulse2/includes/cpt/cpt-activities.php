<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

function pulse2_register_activity_cpt() {
    $labels = array(
        'name' => 'Activities',
        'singular_name' => 'Activity',
        'add_new' => 'Add New Activity',
        'add_new_item' => 'Add New Activity',
        'edit_item' => 'Edit Activity',
        'new_item' => 'New Activity',
        'view_item' => 'View Activity',
        'search_items' => 'Search Activities',
        'not_found' => 'No activities found',
        'not_found_in_trash' => 'No activities found in trash'
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
    register_post_type('pulse2_activity', $args);
}


