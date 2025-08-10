<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

// Current user endpoint
function get_current_pulse2_user() {
    $user = wp_get_current_user();
    if ( 0 === $user->ID ) {
        return new WP_Error( 'not_logged_in', 'User is not logged in.', array( 'status' => 401 ) );
    }
    return new WP_REST_Response( array(
        'id' => $user->ID,
        'name' => $user->display_name,
        'email' => $user->user_email,
        'username' => $user->user_login,
        'role' => $user->roles[0] ?? 'subscriber',
        'bio' => get_user_meta($user->ID, 'bio', true),
        'timezone' => get_user_meta($user->ID, 'timezone', true) ?: 'UTC',
        'notifications_enabled' => get_user_meta($user->ID, 'notifications_enabled', true) ?: 'true',
        'status' => 'active',
        'created_at' => $user->user_registered,
        'last_active' => current_time('mysql'),
    ), 200 );
}

// Get all users
function get_pulse2_users($request) {
    $role = $request->get_param('role');
    $args = array('orderby' => 'display_name');
    if ($role) {
        $args['role'] = $role;
    }
    
    $users = get_users($args);
    $data = array();
    
    foreach ($users as $user) {
        $data[] = array(
            'id' => (string) $user->ID,
            'username' => $user->user_login,
            'email' => $user->user_email,
            'display_name' => $user->display_name,
            'role' => $user->roles[0] ?? 'subscriber',
            'bio' => get_user_meta($user->ID, 'bio', true),
            'timezone' => get_user_meta($user->ID, 'timezone', true) ?: 'UTC',
            'notifications_enabled' => get_user_meta($user->ID, 'notifications_enabled', true) ?: 'true',
            'status' => 'active',
            'created_at' => $user->user_registered,
            'last_active' => current_time('mysql'),
        );
    }
    
    return new WP_REST_Response($data, 200);
}

// Create new user
function create_pulse2_user($request) {
    $params = $request->get_json_params();
    
    // Validate required fields
    if (empty($params['email']) || empty($params['display_name'])) {
        return new WP_Error('missing_fields', 'Email and display name are required', array('status' => 400));
    }
    
    // Generate username and password
    $username = generate_username_from_email($params['email']);
    $password = generate_secure_password();
    
    // Create user
    $user_id = wp_create_user($username, $password, $params['email']);
    
    if (is_wp_error($user_id)) {
        return $user_id;
    }
    
    // Update display name
    wp_update_user(array(
        'ID' => $user_id,
        'display_name' => $params['display_name'],
    ));
    
    // Set role
    if (!empty($params['role'])) {
        $user = new WP_User($user_id);
        $user->set_role($params['role']);
    }
    
    // Set meta fields
    if (!empty($params['bio'])) {
        update_user_meta($user_id, 'bio', sanitize_textarea_field($params['bio']));
    }
    if (!empty($params['timezone'])) {
        update_user_meta($user_id, 'timezone', sanitize_text_field($params['timezone']));
    }
    if (isset($params['notifications_enabled'])) {
        update_user_meta($user_id, 'notifications_enabled', $params['notifications_enabled'] ? '1' : '0');
    }
    
    // Set created by
    $current_user = wp_get_current_user();
    if ($current_user->exists()) {
        update_user_meta($user_id, 'created_by', $current_user->ID);
    }
    
    // Return user data with credentials
    $user = get_user_by('ID', $user_id);
    return new WP_REST_Response(array(
        'user' => array(
            'id' => (string) $user->ID,
            'username' => $user->user_login,
            'email' => $user->user_email,
            'display_name' => $user->display_name,
            'role' => $user->roles[0] ?? 'subscriber',
        ),
        'credentials' => array(
            'username' => $username,
            'password' => $password,
        ),
    ), 201);
}

// Update user
function update_pulse2_user($request) {
    $user_id = $request['id'];
    $params = $request->get_json_params();
    
    $user = get_user_by('ID', $user_id);
    if (!$user) {
        return new WP_Error('user_not_found', 'User not found', array('status' => 404));
    }
    
    // Update user data
    $user_data = array('ID' => $user_id);
    
    if (!empty($params['display_name'])) {
        $user_data['display_name'] = $params['display_name'];
    }
    if (!empty($params['email'])) {
        $user_data['user_email'] = $params['email'];
    }
    
    $result = wp_update_user($user_data);
    
    if (is_wp_error($result)) {
        return $result;
    }
    
    // Update meta fields
    if (isset($params['bio'])) {
        update_user_meta($user_id, 'bio', sanitize_textarea_field($params['bio']));
    }
    if (isset($params['timezone'])) {
        update_user_meta($user_id, 'timezone', sanitize_text_field($params['timezone']));
    }
    if (isset($params['notifications_enabled'])) {
        update_user_meta($user_id, 'notifications_enabled', $params['notifications_enabled'] ? '1' : '0');
    }
    
    // Return updated user
    $updated_user = get_user_by('ID', $user_id);
    return new WP_REST_Response(array(
        'id' => (string) $updated_user->ID,
        'username' => $updated_user->user_login,
        'email' => $updated_user->user_email,
        'display_name' => $updated_user->display_name,
        'role' => $updated_user->roles[0] ?? 'subscriber',
        'bio' => get_user_meta($user_id, 'bio', true),
        'timezone' => get_user_meta($user_id, 'timezone', true) ?: 'UTC',
        'notifications_enabled' => get_user_meta($user_id, 'notifications_enabled', true) ?: 'true',
    ), 200);
}

// Delete user
function delete_pulse2_user($request) {
    $user_id = $request['id'];
    
    $user = get_user_by('ID', $user_id);
    if (!$user) {
        return new WP_Error('user_not_found', 'User not found', array('status' => 404));
    }
    
    // Don't allow deleting the current user
    if ($user_id == get_current_user_id()) {
        return new WP_Error('forbidden', 'Cannot delete your own account', array('status' => 403));
    }
    
    $result = wp_delete_user($user_id);
    
    if (!$result) {
        return new WP_Error('delete_failed', 'Failed to delete user', array('status' => 500));
    }
    
    return new WP_REST_Response(array('message' => 'User deleted successfully'), 200);
}

// Helper Functions
function generate_username_from_email($email) {
    $base_username = explode('@', $email)[0];
    $timestamp = substr(time(), -4);
    return $base_username . '_' . $timestamp;
}

function generate_secure_password() {
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    $password = '';
    for ($i = 0; $i < 12; $i++) {
        $password .= $chars[rand(0, strlen($chars) - 1)];
    }
    return $password;
}

// Local login proxy to guarantee auth hits this WP site
if (!function_exists('pulse2_login_proxy')) {
    function pulse2_login_proxy($request) {
        $params = $request->get_json_params();
        $username = isset($params['username']) ? $params['username'] : '';
        $password = isset($params['password']) ? $params['password'] : '';
        if ($username === '' || $password === '') {
            return new WP_Error('bad_request', 'Missing username or password', array('status' => 400));
        }
        $jwt_url = rest_url('jwt-auth/v1/token');
        $response = wp_remote_post($jwt_url, array(
            'headers' => array('Content-Type' => 'application/json'),
            'body' => wp_json_encode(array('username' => $username, 'password' => $password)),
            'timeout' => 15,
        ));
        if (!is_wp_error($response)) {
            $code = wp_remote_retrieve_response_code($response);
            $body = wp_remote_retrieve_body($response);
            $json = json_decode($body, true);
            if ($code >= 200 && $code < 300 && is_array($json)) {
                return new WP_REST_Response($json, 200);
            }
        }
        $user = wp_authenticate($username, $password);
        if (is_wp_error($user)) {
            return new WP_Error('invalid_credentials', 'Invalid username or password', array('status' => 401));
        }
        return new WP_REST_Response(array(
            'user_id' => $user->ID,
            'username' => $user->user_login,
            'message' => 'Authenticated on this site. JWT not available.',
        ), 200);
    }
}