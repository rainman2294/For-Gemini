<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

// Get invitations
function get_pulse2_invitations($request) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_invitations';
    
    // Create table if it doesn't exist
    create_invitations_table_if_not_exists();
    
    $status = $request->get_param('status');
    $where = '';
    if ($status) {
        $where = $wpdb->prepare('WHERE status = %s', $status);
    }
    
    $invitations = $wpdb->get_results(
        "SELECT * FROM $table_name $where ORDER BY created_at DESC"
    );
    
    return new WP_REST_Response($invitations, 200);
}

// Create invitation
function create_pulse2_invitation($request) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_invitations';
    
    // Create table if it doesn't exist
    create_invitations_table_if_not_exists();
    
    $params = $request->get_json_params();
    $invitation_id = wp_generate_uuid4();
    
    $result = $wpdb->insert(
        $table_name,
        array(
            'id' => $invitation_id,
            'email' => $params['email'],
            'username' => $params['username'] ?? null,
            'invited_by' => $params['invited_by'],
            'invited_by_name' => $params['invited_by_name'],
            'project_id' => $params['project_id'] ?? null,
            'project_name' => $params['project_name'] ?? null,
            'role' => $params['role'],
            'permissions' => json_encode($params['permissions'] ?? array()),
            'status' => $params['status'] ?? 'pending',
            'expires_at' => $params['expires_at'],
            'created_at' => current_time('mysql'),
        ),
        array('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s')
    );
    
    if ($result === false) {
        return new WP_Error('insert_failed', 'Failed to create invitation', array('status' => 500));
    }
    
    // Send invitation email
    $email_sent = send_invitation_email($params['email'], $params['invited_by_name'], $params['role'], $invitation_id);
    
    $invitation = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE id = %s", $invitation_id));
    return new WP_REST_Response(array(
        'invitation' => $invitation,
        'email_sent' => $email_sent
    ), 201);
}

// Update invitation
function update_pulse2_invitation($request) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_invitations';
    
    $invitation_id = $request['id'];
    $params = $request->get_json_params();
    
    $result = $wpdb->update(
        $table_name,
        $params,
        array('id' => $invitation_id)
    );
    
    if ($result === false) {
        return new WP_Error('update_failed', 'Failed to update invitation', array('status' => 500));
    }
    
    $invitation = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE id = %s", $invitation_id));
    return new WP_REST_Response($invitation, 200);
}

// Delete invitation
function delete_pulse2_invitation($request) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_invitations';
    
    $invitation_id = $request['id'];
    
    $result = $wpdb->delete($table_name, array('id' => $invitation_id));
    
    if ($result === false) {
        return new WP_Error('delete_failed', 'Failed to delete invitation', array('status' => 500));
    }
    
    return new WP_REST_Response(array('message' => 'Invitation deleted successfully'), 200);
}

// Password reset request
function request_pulse2_password_reset($request) {
    $params = $request->get_json_params();
    $email = $params['email'];
    
    $user = get_user_by('email', $email);
    if (!$user) {
        // Don't reveal if email exists or not
        return new WP_REST_Response(array('message' => 'If an account exists, a reset link has been sent'), 200);
    }
    
    // Generate reset token
    $token = wp_generate_password(32, false);
    $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));
    
    // Store reset request
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_password_resets';
    
    // Create table if it doesn't exist
    create_password_resets_table_if_not_exists();
    
    $wpdb->insert(
        $table_name,
        array(
            'user_id' => $user->ID,
            'user_email' => $email,
            'token' => $token,
            'expires_at' => $expires,
            'status' => 'pending',
            'created_at' => current_time('mysql'),
        )
    );
    
    // Send reset email
    $email_sent = send_password_reset_email($email, $token);
    
    return new WP_REST_Response(array(
        'message' => 'Password reset link sent',
        'email_sent' => $email_sent
    ), 200);
}

// Create database tables
function create_invitations_table_if_not_exists() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_invitations';
    
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id varchar(36) NOT NULL,
            email varchar(100) NOT NULL,
            username varchar(50),
            invited_by varchar(50) NOT NULL,
            invited_by_name varchar(100) NOT NULL,
            project_id varchar(50),
            project_name varchar(100),
            role varchar(20) NOT NULL,
            permissions longtext,
            status varchar(20) NOT NULL DEFAULT 'pending',
            expires_at datetime NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

function create_password_resets_table_if_not_exists() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_password_resets';
    
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            user_email varchar(100) NOT NULL,
            token varchar(64) NOT NULL,
            expires_at datetime NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'pending',
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY token (token)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

// Send invitation email
function send_invitation_email($email, $invited_by_name, $role, $invitation_id) {
    $settings = get_pulse2_settings_data();
    $site_name = get_bloginfo('name');
    $site_url = $settings['app_url'] ?: get_site_url();
    $admin_email = $settings['admin_email'] ?: get_option('admin_email');
    
    $subject = $settings['invitation_email_subject'] ?: sprintf('[%s] You have been invited to join our team', $site_name);
    
    $message_template = $settings['invitation_email_template'] ?: 'Hello,

You have been invited by {invited_by_name} to join the {site_name} team as a {role}.

Please visit {site_url} to get started.

If you have any questions, contact us at {admin_email}.

Best regards,
{site_name} Team';
    
    // Replace placeholders
    $message = str_replace(
        array('{invited_by_name}', '{site_name}', '{role}', '{site_url}', '{admin_email}'),
        array($invited_by_name, $site_name, $role, $site_url, $admin_email),
        $message_template
    );
    
    $headers = array('Content-Type: text/html; charset=UTF-8');
    
    return wp_mail($email, $subject, nl2br($message), $headers);
}

// Send password reset email
function send_password_reset_email($email, $token) {
    $settings = get_pulse2_settings_data();
    $site_name = get_bloginfo('name');
    $site_url = $settings['app_url'] ?: get_site_url();
    $reset_url = $site_url . '/reset-password?token=' . $token;
    
    $subject = sprintf('[%s] Password Reset Request', $site_name);
    
    $message = sprintf(
        'Hello,

You have requested a password reset for your %s account.

Click the following link to reset your password:
%s

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email.

Best regards,
%s Team',
        $site_name,
        $reset_url,
        $site_name
    );
    
    $headers = array('Content-Type: text/html; charset=UTF-8');
    
    return wp_mail($email, $subject, nl2br($message), $headers);
}