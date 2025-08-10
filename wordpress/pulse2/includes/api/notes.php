<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

// Get notes for a project
function get_pulse2_notes($request) {
    $project_id = $request->get_param('project_id');
    if (empty($project_id)) {
        return new WP_Error('bad_request', 'Project ID is required.', array('status' => 400));
    }
    
    $posts = get_posts(array(
        'post_type' => 'pulse2_note',
        'post_status' => 'publish',
        'posts_per_page' => -1,
        'meta_query' => array(
            array('key' => 'project_id', 'value' => $project_id, 'compare' => '=')
        )
    ));

    $notes = array();
    foreach ($posts as $post) {
        $notes[] = format_note_response($post);
    }
    
    // Simple hierarchy build
    $nested_notes = array();
    $notes_by_id = array();
    foreach($notes as $note) {
        $notes_by_id[$note['id']] = $note;
    }
    foreach($notes as $note) {
        if (!empty($note['parentNoteId']) && isset($notes_by_id[$note['parentNoteId']])) {
            $notes_by_id[$note['parentNoteId']]['replies'][] = $note;
        } else {
            $nested_notes[] = $note;
        }
    }

    return new WP_REST_Response($nested_notes, 200);
}

// Format note response
function format_note_response($post) {
    return array(
        'id' => (string) $post->ID,
        'projectId' => get_post_meta($post->ID, 'project_id', true),
        'authorId' => get_post_meta($post->ID, 'author_id', true),
        'authorName' => get_post_meta($post->ID, 'author_name', true),
        'content' => $post->post_content,
        'createdAt' => pulse2_sanitize_date_to_iso($post->post_date),
        'updatedAt' => pulse2_sanitize_date_to_iso($post->post_modified),
        'parentNoteId' => get_post_meta($post->ID, 'parent_note_id', true),
        'replies' => [], // Replies will be nested in the get_pulse2_notes function
    );
}

// Create note
function create_pulse2_note($request) {
    $params = $request->get_json_params();
    $user = wp_get_current_user();

    $post_id = wp_insert_post(array(
        'post_type' => 'pulse2_note',
        'post_status' => 'publish',
        'post_content' => sanitize_textarea_field($params['content']),
        'post_author' => $user->ID,
    ));

    if (is_wp_error($post_id)) return $post_id;

    update_post_meta($post_id, 'project_id', sanitize_text_field($params['project_id']));
    update_post_meta($post_id, 'author_id', $user->ID);
    update_post_meta($post_id, 'author_name', $user->display_name);
    if (!empty($params['parent_note_id'])) {
        update_post_meta($post_id, 'parent_note_id', sanitize_text_field($params['parent_note_id']));
    }

    $post = get_post($post_id);
    return new WP_REST_Response(format_note_response($post), 201);
}

// Update note
function update_pulse2_note($request) {
    $post_id = $request['id'];
    $params = $request->get_json_params();

    // Verify ownership or administrator rights
    $post = get_post($post_id);
    if ($post->post_author != get_current_user_id() && !current_user_can('manage_options')) {
        return new WP_Error('forbidden', 'You do not have permission to edit this note.', array('status' => 403));
    }
    
    wp_update_post(array(
        'ID' => $post_id,
        'post_content' => sanitize_textarea_field($params['content']),
    ));
    
    $updated_post = get_post($post_id);
    return new WP_REST_Response(format_note_response($updated_post), 200);
}

// Delete note
function delete_pulse2_note($request) {
    $post_id = $request['id'];

    // Verify ownership or administrator rights
    $post = get_post($post_id);
    if ($post->post_author != get_current_user_id() && !current_user_can('manage_options')) {
        return new WP_Error('forbidden', 'You do not have permission to delete this note.', array('status' => 403));
    }

    $result = wp_delete_post($post_id, true);
    if (!$result) {
        return new WP_Error('delete_failed', 'Failed to delete note.', array('status' => 500));
    }
    return new WP_REST_Response(array('message' => 'Note deleted successfully'), 200);
}