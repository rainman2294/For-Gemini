<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

// Get settings
function get_pulse2_settings($request) {
    return new WP_REST_Response(get_pulse2_settings_data(), 200);
}

// Update settings
function update_pulse2_settings($request) {
    $params = $request->get_json_params();
    
    $allowed_settings = array(
        'app_url',
        'admin_email', 
        'invitation_email_subject',
        'invitation_email_template',
        'password_reset_email_subject',
        'password_reset_email_template',
        'activity_navigation_enabled',
        'activity_filters_enabled'
    );
    
    foreach ($allowed_settings as $setting) {
        if (isset($params[$setting])) {
            update_option('pulse2_' . $setting, sanitize_text_field($params[$setting]));
        }
    }
    
    return new WP_REST_Response(array(
        'message' => 'Settings updated successfully',
        'settings' => get_pulse2_settings_data()
    ), 200);
}

// Get user presence
function get_pulse2_presence($request) {
    global $wpdb;
    
    // Get all users with their last activity
    $users = get_users(array('fields' => array('ID', 'display_name', 'user_email')));
    $presence_data = array();
    
    foreach ($users as $user) {
        $last_activity = get_user_meta($user->ID, 'pulse2_last_activity', true);
        $is_online = false;
        
        if ($last_activity) {
            $last_activity_time = strtotime($last_activity);
            $current_time = time();
            // Consider user online if they were active in the last 2 minutes (more strict)
            $is_online = ($current_time - $last_activity_time) < 120;
        }
        
        $presence_data[] = array(
            'userId' => (string) $user->ID,
            'userName' => $user->display_name,
            'userEmail' => $user->user_email,
            'isOnline' => $is_online,
            'lastActivity' => $last_activity ? pulse2_sanitize_date_to_iso($last_activity) : null,
        );
    }
    
    return new WP_REST_Response($presence_data, 200);
}

// Update user presence
function update_pulse2_presence($request) {
    $user = wp_get_current_user();
    
    if (!$user->exists()) {
        return new WP_Error('unauthorized', 'User not authenticated', array('status' => 401));
    }
    
    // Update user's last activity with current timestamp
    $current_time = current_time('mysql');
    update_user_meta($user->ID, 'pulse2_last_activity', $current_time);
    
    // Also update the user's last_active field in the users table if it exists
    global $wpdb;
    $wpdb->update(
        $wpdb->users,
        array('user_registered' => $current_time), // Using user_registered as a fallback
        array('ID' => $user->ID)
    );
    
    return new WP_REST_Response(array(
        'message' => 'Presence updated successfully',
        'userId' => (string) $user->ID,
        'timestamp' => $current_time
    ), 200);
}