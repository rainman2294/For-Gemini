<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

// ------- Helpers -------

if (!function_exists('pulse2_collect_project_meta')) {
    function pulse2_collect_project_meta(int $post_id): array {
        $meta_keys = array('client','projectManager','artists','brief','externalLinks','startDate','endDate','priority','status','statusHistory','media','isArchived','videoUrl','createdAt','updatedAt');
        $meta = array();
        foreach ($meta_keys as $key) {
            $value = get_post_meta($post_id, $key, true);
            // Attempt JSON decode where appropriate
            if (is_string($value) && ($key === 'statusHistory' || $key === 'media' || $key === 'artists' || $key === 'externalLinks')) {
                $decoded = json_decode($value, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $value = $decoded;
                }
            }
            $meta[$key] = $value;
        }
        return $meta;
    }
}

if (!function_exists('pulse2_format_project_response')) {
    function pulse2_format_project_response(WP_Post $post): array {
        $meta = pulse2_collect_project_meta($post->ID);
        return array(
            'id' => (string) $post->ID,
            'name' => $post->post_title,
            'description' => $post->post_content,
            'createdAt' => function_exists('pulse2_sanitize_date_to_iso') ? pulse2_sanitize_date_to_iso($post->post_date) : $post->post_date,
            'updatedAt' => function_exists('pulse2_sanitize_date_to_iso') ? pulse2_sanitize_date_to_iso($post->post_modified) : $post->post_modified,
        ) + $meta;
    }
}

if (!function_exists('pulse2_update_project_meta')) {
    function pulse2_update_project_meta(int $post_id, array $project): void {
        $allowed = array('client','projectManager','artists','brief','externalLinks','startDate','endDate','priority','status','statusHistory','media','isArchived','videoUrl','createdAt','updatedAt');
        foreach ($allowed as $key) {
            if (!array_key_exists($key, $project)) {
                continue;
            }
            $value = $project[$key];
            // Encode arrays/objects to JSON for storage
            if (is_array($value) || is_object($value)) {
                $value = wp_json_encode($value);
            }
            update_post_meta($post_id, $key, $value);
        }
    }
}

// ------- REST Callbacks -------

if (!function_exists('get_pulse2_projects')) {
    function get_pulse2_projects(WP_REST_Request $request) {
        $args = array(
            'post_type' => 'pulse2_project',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'orderby' => 'date',
            'order' => 'DESC',
        );
        $posts = get_posts($args);
        $projects = array();
        foreach ($posts as $post) {
            $projects[] = pulse2_format_project_response($post);
        }
        return new WP_REST_Response($projects, 200);
    }
}

if (!function_exists('get_pulse2_project')) {
    function get_pulse2_project(WP_REST_Request $request) {
        $post_id = intval($request['id']);
        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'pulse2_project') {
            return new WP_Error('not_found', 'Project not found', array('status' => 404));
        }
        return new WP_REST_Response(pulse2_format_project_response($post), 200);
    }
}

if (!function_exists('create_pulse2_project')) {
    function create_pulse2_project(WP_REST_Request $request) {
        $params = $request->get_json_params();
        $name = isset($params['name']) ? sanitize_text_field($params['name']) : '';
        if ($name === '') {
            return new WP_Error('bad_request', 'Project name is required', array('status' => 400));
        }
        $post_id = wp_insert_post(array(
            'post_type' => 'pulse2_project',
            'post_status' => 'publish',
            'post_title' => $name,
            'post_content' => isset($params['description']) ? wp_kses_post($params['description']) : '',
        ));
        if (is_wp_error($post_id)) {
            return $post_id;
        }
        pulse2_update_project_meta($post_id, $params);
        $post = get_post($post_id);
        return new WP_REST_Response(pulse2_format_project_response($post), 201);
    }
}

if (!function_exists('update_pulse2_project')) {
    function update_pulse2_project(WP_REST_Request $request) {
        $post_id = intval($request['id']);
        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'pulse2_project') {
            return new WP_Error('not_found', 'Project not found', array('status' => 404));
        }
        $params = $request->get_json_params();
        $update = array('ID' => $post_id);
        if (isset($params['name'])) {
            $update['post_title'] = sanitize_text_field($params['name']);
        }
        if (isset($params['description'])) {
            $update['post_content'] = wp_kses_post($params['description']);
        }
        if (count($update) > 1) {
            $result = wp_update_post($update, true);
            if (is_wp_error($result)) {
                return $result;
            }
        }
        pulse2_update_project_meta($post_id, $params);
        $updated = get_post($post_id);
        return new WP_REST_Response(pulse2_format_project_response($updated), 200);
    }
}

if (!function_exists('delete_pulse2_project')) {
    function delete_pulse2_project(WP_REST_Request $request) {
        $post_id = intval($request['id']);
        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'pulse2_project') {
            return new WP_Error('not_found', 'Project not found', array('status' => 404));
        }
        $deleted = wp_delete_post($post_id, true);
        if (!$deleted) {
            return new WP_Error('delete_failed', 'Failed to delete project', array('status' => 500));
        }
        return new WP_REST_Response(array('message' => 'Project deleted'), 200);
    }
}

if (!function_exists('import_pulse2_projects')) {
    function import_pulse2_projects(WP_REST_Request $request) {
        $data = $request->get_json_params();
        $projects = is_array($data) ? $data : ($data['projects'] ?? array());
        $imported = 0;
        $errors = array();
        foreach ($projects as $project) {
            if (!is_array($project)) { continue; }
            $name = isset($project['name']) ? sanitize_text_field($project['name']) : '';
            if ($name === '') { $errors[] = 'Missing name'; continue; }
            $post_id = wp_insert_post(array(
                'post_type' => 'pulse2_project',
                'post_status' => 'publish',
                'post_title' => $name,
                'post_content' => isset($project['description']) ? wp_kses_post($project['description']) : '',
            ));
            if (is_wp_error($post_id)) { $errors[] = $post_id->get_error_message(); continue; }
            pulse2_update_project_meta($post_id, $project);
            $imported++;
        }
        return new WP_REST_Response(array('imported' => $imported, 'errors' => $errors), 200);
    }
}


