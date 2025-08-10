<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

// Register meta fields for projects
function pulse2_register_meta() {
    $meta_keys = array('client','projectManager','artists','brief','externalLinks','startDate','endDate','priority','status','statusHistory','media','isArchived','videoUrl', 'createdAt', 'updatedAt');
    foreach ( $meta_keys as $key ) {
        register_post_meta( 'pulse2_project', $key, array('show_in_rest' => true, 'single' => true, 'type' => is_array($key) ? 'array' : 'string', 'auth_callback' => function() { return current_user_can('edit_posts'); }));
    }
}

// Register meta fields for notes
function pulse2_register_note_meta() {
    $note_meta_keys = array('project_id', 'assignee', 'tags', 'priority', 'isCompleted', 'color', 'createdAt', 'updatedAt', 'dueDate');
    foreach ($note_meta_keys as $key) {
        register_post_meta('pulse2_note', $key, array(
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'auth_callback' => function() { return current_user_can('edit_posts'); }
        ));
    }
}

// Register meta fields for activities
function pulse2_register_activity_meta() {
    $activity_meta_keys = array('project_id', 'activity_type', 'user_id', 'metadata', 'createdAt');
    foreach ($activity_meta_keys as $key) {
        register_post_meta('pulse2_activity', $key, array(
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'auth_callback' => function() { return current_user_can('edit_posts'); }
        ));
    }
}

// Hook meta registration
add_action( 'init', 'pulse2_register_meta' );
add_action( 'init', 'pulse2_register_note_meta' );
add_action( 'init', 'pulse2_register_activity_meta' );