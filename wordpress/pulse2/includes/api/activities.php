<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

// Get activities
function get_pulse2_activities($request) {
    $project_id = $request->get_param('project_id');
    $user_id = $request->get_param('user_id');
    $limit = $request->get_param('limit') ?: 50;
    
    $args = array(
        'post_type' => 'pulse2_activity',
        'post_status' => 'publish',
        'posts_per_page' => $limit,
        'orderby' => 'date',
        'order' => 'DESC',
    );
    
    if ($project_id) {
        $args['meta_query'][] = array(
            'key' => 'project_id',
            'value' => $project_id,
            'compare' => '='
        );
    }
    
    if ($user_id) {
        $args['meta_query'][] = array(
            'key' => 'user_id',
            'value' => $user_id,
            'compare' => '='
        );
    }
    
    $posts = get_posts($args);
    $activities = array();
    
    foreach ($posts as $post) {
        $activities[] = format_activity_response($post);
    }
    
    return new WP_REST_Response($activities, 200);
}

// Create activity
function create_pulse2_activity($request) {
    $params = $request->get_json_params();
    $user = wp_get_current_user();
    
    if (!$user->exists()) {
        return new WP_Error('unauthorized', 'User not authenticated', array('status' => 401));
    }
    
    $post_id = wp_insert_post(array(
        'post_type' => 'pulse2_activity',
        'post_status' => 'publish',
        'post_title' => sanitize_text_field($params['title']),
        'post_content' => sanitize_textarea_field($params['description']),
        'post_author' => $user->ID,
    ));
    
    if (is_wp_error($post_id)) {
        return $post_id;
    }
    
    // Set activity meta
    update_post_meta($post_id, 'activity_type', sanitize_text_field($params['type']));
    update_post_meta($post_id, 'user_id', $user->ID);
    update_post_meta($post_id, 'user_name', $user->display_name);
    
    if (!empty($params['project_id'])) {
        update_post_meta($post_id, 'project_id', sanitize_text_field($params['project_id']));
    }
    
    if (!empty($params['project_name'])) {
        update_post_meta($post_id, 'project_name', sanitize_text_field($params['project_name']));
    }
    
    if (!empty($params['related_id'])) {
        update_post_meta($post_id, 'related_id', sanitize_text_field($params['related_id']));
    }
    
    $post = get_post($post_id);
    return new WP_REST_Response(format_activity_response($post), 201);
}

// Format activity response
function format_activity_response($post) {
    return array(
        'id' => (string) $post->ID,
        'type' => get_post_meta($post->ID, 'activity_type', true),
        'title' => $post->post_title,
        'description' => $post->post_content,
        'userId' => get_post_meta($post->ID, 'user_id', true),
        'userName' => get_post_meta($post->ID, 'user_name', true),
        'projectId' => get_post_meta($post->ID, 'project_id', true),
        'projectName' => get_post_meta($post->ID, 'project_name', true),
        'relatedId' => get_post_meta($post->ID, 'related_id', true),
        'createdAt' => pulse2_sanitize_date_to_iso($post->post_date),
    );
}