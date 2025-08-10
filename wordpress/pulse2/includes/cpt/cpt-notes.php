<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

function pulse2_register_note_cpt() {
    $labels = array(
        'name' => 'Notes', 
        'singular_name' => 'Note', 
        'menu_name' => 'Notes',
        'add_new' => 'Add Note',
        'add_new_item' => 'Add New Note',
        'edit_item' => 'Edit Note',
        'new_item' => 'New Note',
        'view_item' => 'View Note',
        'search_items' => 'Search Notes',
        'not_found' => 'No notes found',
        'not_found_in_trash' => 'No notes found in trash'
    );
    $args = array(
        'labels' => $labels, 
        'public' => false, 
        'show_ui' => true, 
        'supports' => array( 'editor' ), 
        'show_in_rest' => true,
        'show_in_menu' => false,
        'hierarchical' => false,
        'capability_type' => 'post'
    );
    register_post_type( 'pulse2_note', $args );
}

// end of file
