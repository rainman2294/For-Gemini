<?php
// Safe guard to prevent direct access
if (!defined('ABSPATH')) { exit; }

// Lightweight debug helper (falls back to error_log)
if (!function_exists('pulse2_debug_log')) {
    function pulse2_debug_log($message, $data = null) {
        $log = '[PULSE2 JSON] ' . $message;
        if ($data !== null) {
            $log .= ' | Data: ' . print_r($data, true);
        }
        error_log($log);
    }
}

// Polyfill for wp_generate_uuid4 on very old installs
if (!function_exists('wp_generate_uuid4')) {
    function wp_generate_uuid4() {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40); // version 4
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80); // variant
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}

// Note when this file is loaded (optional)
if (function_exists('pulse2_debug_log')) { pulse2_debug_log('workspaces-json.php included'); }

// Meta key for JSON storage
if (!defined('PULSE2_WORKSPACE_JSON_META')) {
    define('PULSE2_WORKSPACE_JSON_META', 'pulse2_workspace_json');
}

// Find workspace post ID by UUID stored as meta or post_name
function pulse2_json_find_workspace_post_id_by_uuid($uuid) {
    $query = new WP_Query(array(
        'post_type' => 'pulse2_workspace',
        'posts_per_page' => 1,
        'meta_key' => 'pulse2_workspace_uuid',
        'meta_value' => $uuid,
        'fields' => 'ids'
    ));
    if (!empty($query->posts)) {
        return intval($query->posts[0]);
    }
    // Fallback by slug
    $post = get_page_by_path($uuid, OBJECT, 'pulse2_workspace');
    return $post ? intval($post->ID) : 0;
}

function pulse2_get_workspace_json($workspace_uuid) {
    $post_id = pulse2_json_find_workspace_post_id_by_uuid($workspace_uuid);
    if (!$post_id) return array('categories'=>array(), 'images'=>array(), 'pins'=>array(), 'comments'=>array());
    $raw = get_post_meta($post_id, PULSE2_WORKSPACE_JSON_META, true);
    if (empty($raw)) return array('categories'=>array(), 'images'=>array(), 'pins'=>array(), 'comments'=>array());
    $decoded = is_array($raw) ? $raw : json_decode($raw, true);
    if (!is_array($decoded)) $decoded = array();
    $decoded['categories'] = isset($decoded['categories']) && is_array($decoded['categories']) ? $decoded['categories'] : array();
    $decoded['images'] = isset($decoded['images']) && is_array($decoded['images']) ? $decoded['images'] : array();
    $decoded['pins'] = isset($decoded['pins']) && is_array($decoded['pins']) ? $decoded['pins'] : array();
    $decoded['comments'] = isset($decoded['comments']) && is_array($decoded['comments']) ? $decoded['comments'] : array();
    return $decoded;
}

function pulse2_save_workspace_json($workspace_uuid, $data) {
    $post_id = pulse2_json_find_workspace_post_id_by_uuid($workspace_uuid);
    if (!$post_id) return false;
    update_post_meta($post_id, PULSE2_WORKSPACE_JSON_META, wp_json_encode($data));
    return true;
}

function pulse2_register_workspace_json_routes() {
    pulse2_debug_log('Registering workspace JSON routes');
    $ns = 'pulse2/v1';

    // Categories
    register_rest_route($ns, '/workspaces-json/(?P<workspace_id>[a-zA-Z0-9\-]+)/categories', array(
        'methods' => 'GET',
        'callback' => 'pulse2_json_get_categories',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    register_rest_route($ns, '/workspaces-json/(?P<workspace_id>[a-zA-Z0-9\-]+)/categories', array(
        'methods' => 'POST',
        'callback' => 'pulse2_json_create_category',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));

    // Images
    register_rest_route($ns, '/workspaces-json/(?P<workspace_id>[a-zA-Z0-9\-]+)/images', array(
        'methods' => 'GET',
        'callback' => 'pulse2_json_get_images',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    register_rest_route($ns, '/workspaces-json/(?P<workspace_id>[a-zA-Z0-9\-]+)/images', array(
        'methods' => 'POST',
        'callback' => 'pulse2_json_upload_image',
        'permission_callback' => function() { return current_user_can('upload_files'); }
    ));
    register_rest_route($ns, '/workspaces-json/(?P<workspace_id>[a-zA-Z0-9\-]+)/images/attach', array(
        'methods' => 'POST',
        'callback' => 'pulse2_json_attach_image',
        'permission_callback' => function() { return current_user_can('upload_files'); }
    ));

    // Pins
    register_rest_route($ns, '/workspaces-json/image/(?P<image_id>[a-zA-Z0-9\-]+)/pins', array(
        'methods' => 'GET',
        'callback' => 'pulse2_json_get_pins_for_image',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    register_rest_route($ns, '/workspaces-json/image/(?P<image_id>[a-zA-Z0-9\-]+)/pins', array(
        'methods' => 'POST',
        'callback' => 'pulse2_json_create_pin',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    register_rest_route($ns, '/workspaces-json/pins/(?P<pin_id>[a-zA-Z0-9\-]+)', array(
        'methods' => 'PUT',
        'callback' => 'pulse2_json_update_pin',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));

    // Comments
    register_rest_route($ns, '/workspaces-json/(?P<workspace_id>[a-zA-Z0-9\-]+)/comments', array(
        'methods' => 'GET',
        'callback' => 'pulse2_json_get_comments',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    register_rest_route($ns, '/workspaces-json/(?P<workspace_id>[a-zA-Z0-9\-]+)/comments', array(
        'methods' => 'POST',
        'callback' => 'pulse2_json_create_comment',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    pulse2_debug_log('Workspace JSON routes registered');
}

// Handlers
function pulse2_json_get_categories($request) {
    $workspace_id = $request->get_param('workspace_id');
    $wb = pulse2_get_workspace_json($workspace_id);
    $out = array();
    foreach ($wb['categories'] as $cat) {
        $out[] = array(
            'id' => $cat['id'],
            'workspaceId' => $workspace_id,
            'name' => $cat['name'],
            'color' => isset($cat['color']) ? $cat['color'] : '#3b82f6',
            'createdAt' => isset($cat['createdAt']) ? $cat['createdAt'] : null,
        );
    }
    return rest_ensure_response($out);
}

function pulse2_json_create_category($request) {
    $workspace_id = $request->get_param('workspace_id');
    $data = $request->get_json_params();
    $wb = pulse2_get_workspace_json($workspace_id);
    $category_id = wp_generate_uuid4();
    $wb['categories'][] = array(
        'id' => $category_id,
        'name' => sanitize_text_field($data['name']),
        'color' => sanitize_hex_color(isset($data['color']) ? $data['color'] : '#3b82f6'),
        'createdAt' => current_time('c'),
    );
    pulse2_save_workspace_json($workspace_id, $wb);
    return rest_ensure_response(array(
        'id' => $category_id,
        'workspaceId' => $workspace_id,
        'name' => $data['name'],
        'color' => $data['color'] ?? '#3b82f6',
        'createdAt' => current_time('c'),
    ));
}

function pulse2_json_get_images($request) {
    $workspace_id = $request->get_param('workspace_id');
    $wb = pulse2_get_workspace_json($workspace_id);
    $out = array();
    foreach ($wb['images'] as $im) {
        // Get pins for this image
        $image_pins = array();
        foreach ($wb['pins'] as $pin) {
            if ($pin['imageId'] === $im['id']) {
                $image_pins[] = array(
                    'id' => $pin['id'],
                    'x' => floatval($pin['x']),
                    'y' => floatval($pin['y']),
                    'note' => isset($pin['note']) ? $pin['note'] : '',
                    'isResolved' => !empty($pin['isResolved']),
                    'createdBy' => isset($pin['createdBy']) ? $pin['createdBy'] : get_current_user_id(),
                    'createdAt' => isset($pin['createdAt']) ? $pin['createdAt'] : current_time('c')
                );
            }
        }
        
        $out[] = array(
            'id' => $im['id'],
            'workspaceId' => $workspace_id,
            'categoryId' => isset($im['categoryId']) ? $im['categoryId'] : '',
            'mediaId' => isset($im['mediaId']) ? intval($im['mediaId']) : null,
            'filename' => isset($im['filename']) ? $im['filename'] : '',
            'url' => $im['url'],
            'uploadedBy' => isset($im['uploadedBy']) ? intval($im['uploadedBy']) : 0,
            'uploadedAt' => isset($im['uploadedAt']) ? $im['uploadedAt'] : null,
            'pins' => $image_pins,
            'comments' => array() // Add empty comments array for compatibility
        );
    }
    return rest_ensure_response($out);
}

function pulse2_json_upload_image($request) {
    $workspace_id = $request->get_param('workspace_id');
    $category_id = $request->get_param('category_id');

    if (!function_exists('wp_handle_upload')) {
        require_once(ABSPATH . 'wp-admin/includes/file.php');
    }
    $uploaded_file = $_FILES['file'] ?? null;
    if (!$uploaded_file) {
        return new WP_Error('no_file', 'No file uploaded', array('status' => 400));
    }
    $movefile = wp_handle_upload($uploaded_file, array('test_form' => false));
    if ($movefile && !isset($movefile['error'])) {
        $attachment = array(
            'post_mime_type' => $movefile['type'],
            'post_title' => sanitize_file_name($uploaded_file['name']),
            'post_content' => '',
            'post_status' => 'inherit'
        );
        $attachment_id = wp_insert_attachment($attachment, $movefile['file']);
        if (!is_wp_error($attachment_id)) {
            require_once(ABSPATH . 'wp-admin/includes/image.php');
            $attachment_data = wp_generate_attachment_metadata($attachment_id, $movefile['file']);
            wp_update_attachment_metadata($attachment_id, $attachment_data);

            $image_id = wp_generate_uuid4();
            $wb = pulse2_get_workspace_json($workspace_id);
            $wb['images'][] = array(
                'id' => $image_id,
                'categoryId' => $category_id,
                'mediaId' => $attachment_id,
                'filename' => sanitize_file_name($uploaded_file['name']),
                'url' => $movefile['url'],
                'uploadedBy' => get_current_user_id(),
                'uploadedAt' => current_time('c')
            );
            pulse2_save_workspace_json($workspace_id, $wb);

            return rest_ensure_response(array(
                'id' => $image_id,
                'workspaceId' => $workspace_id,
                'categoryId' => $category_id,
                'mediaId' => $attachment_id,
                'filename' => $uploaded_file['name'],
                'url' => $movefile['url'],
                'uploadedBy' => get_current_user_id(),
                'uploadedAt' => current_time('c')
            ));
        }
    }
    return new WP_Error('upload_failed', 'Failed to upload image', array('status' => 500));
}

function pulse2_json_attach_image($request) {
    $workspace_id = $request->get_param('workspace_id');
    $data = $request->get_json_params();
    $attachment_id = isset($data['attachment_id']) ? intval($data['attachment_id']) : 0;
    $category_id = isset($data['category_id']) ? sanitize_text_field($data['category_id']) : '';
    if (!$workspace_id || !$attachment_id) {
        return new WP_Error('invalid_params', 'Missing workspace_id or attachment_id', array('status' => 400));
    }
    $src = wp_get_attachment_image_src($attachment_id, 'full');
    $url = is_array($src) ? $src[0] : wp_get_attachment_url($attachment_id);
    $filename = get_the_title($attachment_id);
    if (!$url) {
        return new WP_Error('not_found', 'Attachment not found', array('status' => 404));
    }
    $image_id = wp_generate_uuid4();
    $wb = pulse2_get_workspace_json($workspace_id);
    $wb['images'][] = array(
        'id' => $image_id,
        'workspaceId' => $workspace_id,
        'categoryId' => $category_id,
        'mediaId' => $attachment_id,
        'filename' => $filename,
        'url' => $url,
        'uploadedBy' => get_current_user_id(),
        'uploadedAt' => current_time('c')
    );
    pulse2_save_workspace_json($workspace_id, $wb);
    return rest_ensure_response(array(
        'id' => $image_id,
        'imageUrl' => $url,
        'filename' => $filename,
        'attachmentId' => $attachment_id
    ));
}

function pulse2_json_get_pins_for_image($request) {
    $image_id = $request->get_param('image_id');
    $workspace_id = isset($_GET['workspace_id']) ? sanitize_text_field($_GET['workspace_id']) : '';
    if (!$workspace_id) return rest_ensure_response(array());
    $wb = pulse2_get_workspace_json($workspace_id);
    $out = array();
    foreach ($wb['pins'] as $pin) {
        if ($pin['imageId'] === $image_id) {
            $out[] = array(
                'id' => $pin['id'],
                'imageId' => $pin['imageId'],
                'x' => floatval($pin['x']),
                'y' => floatval($pin['y']),
                'note' => isset($pin['note']) ? $pin['note'] : '',
                'isResolved' => !empty($pin['isResolved']),
                'createdBy' => isset($pin['createdBy']) ? $pin['createdBy'] : get_current_user_id(),
                'createdAt' => isset($pin['createdAt']) ? $pin['createdAt'] : current_time('c')
            );
        }
    }
    return rest_ensure_response($out);
}

function pulse2_json_create_pin($request) {
    $image_id = $request->get_param('image_id');
    $data = $request->get_json_params();
    $workspace_id = isset($data['workspaceId']) ? sanitize_text_field($data['workspaceId']) : '';
    if (!$workspace_id) return new WP_Error('invalid_params', 'workspaceId is required', array('status' => 400));
    $pin_id = wp_generate_uuid4();
    $wb = pulse2_get_workspace_json($workspace_id);
    $wb['pins'][] = array(
        'id' => $pin_id,
        'imageId' => $image_id,
        'x' => floatval($data['x']),
        'y' => floatval($data['y']),
        'note' => isset($data['note']) ? sanitize_textarea_field($data['note']) : '',
        'isResolved' => false,
        'createdAt' => current_time('c'),
        'createdBy' => get_current_user_id()
    );
    pulse2_save_workspace_json($workspace_id, $wb);
    return rest_ensure_response(array(
        'id' => $pin_id,
        'imageId' => $image_id,
        'x' => floatval($data['x']),
        'y' => floatval($data['y']),
        'note' => isset($data['note']) ? $data['note'] : '',
        'createdBy' => get_current_user_id(),
        'createdAt' => current_time('c'),
        'isResolved' => false
    ));
}

function pulse2_json_update_pin($request) {
    $pin_id = $request->get_param('pin_id');
    $data = $request->get_json_params();
    $workspace_id = isset($data['workspaceId']) ? sanitize_text_field($data['workspaceId']) : '';
    if (!$workspace_id) return new WP_Error('invalid_params', 'workspaceId is required', array('status' => 400));
    $wb = pulse2_get_workspace_json($workspace_id);
    foreach ($wb['pins'] as &$pin) {
        if ($pin['id'] === $pin_id) {
            if (isset($data['note'])) $pin['note'] = sanitize_textarea_field($data['note']);
            if (isset($data['isResolved'])) $pin['isResolved'] = $data['isResolved'] ? true : false;
        }
    }
    pulse2_save_workspace_json($workspace_id, $wb);
    return rest_ensure_response(array('success' => true));
}

function pulse2_json_get_comments($request) {
    $workspace_id = $request->get_param('workspace_id');
    $wb = pulse2_get_workspace_json($workspace_id);
    $out = array();
    foreach ($wb['comments'] as $c) {
        $out[] = array(
            'id' => $c['id'],
            'workspaceId' => $workspace_id,
            'imageId' => isset($c['imageId']) ? $c['imageId'] : '',
            'pinId' => isset($c['pinId']) ? $c['pinId'] : '',
            'text' => $c['text'],
            'createdBy' => isset($c['createdBy']) ? intval($c['createdBy']) : 0,
            'createdAt' => isset($c['createdAt']) ? $c['createdAt'] : current_time('c')
        );
    }
    return rest_ensure_response($out);
}

function pulse2_json_create_comment($request) {
    $workspace_id = $request->get_param('workspace_id');
    $data = $request->get_json_params();
    $comment_id = wp_generate_uuid4();
    $wb = pulse2_get_workspace_json($workspace_id);
    $wb['comments'][] = array(
        'id' => $comment_id,
        'workspaceId' => $workspace_id,
        'imageId' => isset($data['imageId']) ? sanitize_text_field($data['imageId']) : '',
        'pinId' => isset($data['pinId']) ? sanitize_text_field($data['pinId']) : '',
        'text' => sanitize_textarea_field($data['text']),
        'createdBy' => get_current_user_id(),
        'createdAt' => current_time('c')
    );
    pulse2_save_workspace_json($workspace_id, $wb);
    return rest_ensure_response(array(
        'id' => $comment_id,
        'workspaceId' => $workspace_id,
        'imageId' => $data['imageId'] ?? '',
        'pinId' => $data['pinId'] ?? '',
        'text' => $data['text'],
        'createdBy' => get_current_user_id(),
        'createdAt' => current_time('c')
    ));
}