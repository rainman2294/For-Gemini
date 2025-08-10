<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

// Main REST API registration function
if (!function_exists('pulse2_register_rest')) {
function pulse2_register_rest() {
    // Ensure JSON workspace routes are registered too (moodboard/whiteboard)
    if (function_exists('pulse2_register_workspace_json_routes')) {
        pulse2_register_workspace_json_routes();
    }
    
    // User management routes
    register_rest_route('pulse2/v1', '/me', array(
        'methods' => 'GET',
        'callback' => 'get_current_pulse2_user',
        'permission_callback' => function() { return is_user_logged_in(); }
    ));
    // Local login proxy ensures auth hits this WP site
    register_rest_route('pulse2/v1', '/login', array(
        'methods' => 'POST',
        'callback' => 'pulse2_login_proxy',
        'permission_callback' => '__return_true'
    ));
    
    register_rest_route('pulse2/v1', '/users', array(
        array('methods' => 'GET', 'callback' => 'get_pulse2_users', 'permission_callback' => function() { return current_user_can('list_users'); }),
        array('methods' => 'POST', 'callback' => 'create_pulse2_user', 'permission_callback' => function() { return current_user_can('create_users'); }),
    ));
    
    register_rest_route('pulse2/v1', '/users/(?P<id>\d+)', array(
        array('methods' => 'PUT', 'callback' => 'update_pulse2_user', 'permission_callback' => function() { return current_user_can('edit_users'); }),
        array('methods' => 'DELETE', 'callback' => 'delete_pulse2_user', 'permission_callback' => function() { return current_user_can('delete_users'); }),
    ));
    
    // Invitation routes
    register_rest_route('pulse2/v1', '/invitations', array(
        array('methods' => 'GET', 'callback' => 'get_pulse2_invitations', 'permission_callback' => function() { return current_user_can('manage_options'); }),
        array('methods' => 'POST', 'callback' => 'create_pulse2_invitation', 'permission_callback' => function() { return current_user_can('manage_options'); }),
    ));
    
    register_rest_route('pulse2/v1', '/invitations/(?P<id>[a-f0-9-]+)', array(
        array('methods' => 'PUT', 'callback' => 'update_pulse2_invitation', 'permission_callback' => function() { return current_user_can('manage_options'); }),
        array('methods' => 'DELETE', 'callback' => 'delete_pulse2_invitation', 'permission_callback' => function() { return current_user_can('manage_options'); }),
    ));
    
    // Password reset
    register_rest_route('pulse2/v1', '/password-reset', array(
        'methods' => 'POST',
        'callback' => 'request_pulse2_password_reset',
        'permission_callback' => '__return_true'
    ));
    
    // Notes routes
    register_rest_route('pulse2/v1', '/notes', array(
        array('methods' => 'GET', 'callback' => 'get_pulse2_notes', 'permission_callback' => '__return_true'),
        array('methods' => 'POST', 'callback' => 'create_pulse2_note', 'permission_callback' => function() { return current_user_can('edit_posts'); }),
    ));
    
    register_rest_route('pulse2/v1', '/notes/(?P<id>\d+)', array(
        array('methods' => 'PUT', 'callback' => 'update_pulse2_note', 'permission_callback' => function() { return current_user_can('edit_posts'); }),
        array('methods' => 'DELETE', 'callback' => 'delete_pulse2_note', 'permission_callback' => function() { return current_user_can('edit_posts'); }),
    ));
    
    // Activities routes
    register_rest_route('pulse2/v1', '/activities', array(
        array('methods' => 'GET', 'callback' => 'get_pulse2_activities', 'permission_callback' => '__return_true'),
        array('methods' => 'POST', 'callback' => 'create_pulse2_activity', 'permission_callback' => function() { return current_user_can('edit_posts'); }),
    ));
    
    // Settings routes
    register_rest_route('pulse2/v1', '/settings', array(
        array('methods' => 'GET', 'callback' => 'get_pulse2_settings', 'permission_callback' => function() { return current_user_can('manage_options'); }),
        array('methods' => 'PUT', 'callback' => 'update_pulse2_settings', 'permission_callback' => function() { return current_user_can('manage_options'); }),
    ));
    
    // Presence routes
    register_rest_route('pulse2/v1', '/presence', array(
        array('methods' => 'GET', 'callback' => 'get_pulse2_presence', 'permission_callback' => '__return_true'),
        array('methods' => 'PUT', 'callback' => 'update_pulse2_presence', 'permission_callback' => function() { return is_user_logged_in(); }),
    ));
    
    // Workspace management routes
    register_rest_route('pulse2/v1', '/workspaces', array(
        array('methods' => 'GET', 'callback' => 'get_pulse2_workspaces', 'permission_callback' => function() { return current_user_can('edit_posts'); }),
        array('methods' => 'POST', 'callback' => 'create_pulse2_workspace', 'permission_callback' => function() { return current_user_can('edit_posts'); }),
    ));
    
    register_rest_route('pulse2/v1', '/workspaces/(?P<id>[a-zA-Z0-9\-]+)', array(
        array('methods' => 'GET', 'callback' => 'get_pulse2_workspace', 'permission_callback' => function() { return current_user_can('edit_posts'); }),
        array('methods' => 'PUT', 'callback' => 'update_pulse2_workspace', 'permission_callback' => function() { return current_user_can('edit_posts'); }),
        array('methods' => 'DELETE', 'callback' => 'delete_pulse2_workspace', 'permission_callback' => function() { return current_user_can('edit_posts'); }),
    ));
    
    register_rest_route('pulse2/v1', '/workspaces/project/(?P<project_id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'get_pulse2_workspaces_by_project',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    // Workflow-specific routes
    register_rest_route('pulse2/v1', '/workspaces/(?P<workspace_id>[a-zA-Z0-9\-]+)/stages', array(
        array('methods' => 'GET', 'callback' => 'get_pulse2_workflow_stages', 'permission_callback' => function() { return current_user_can('edit_posts'); }),
        array('methods' => 'POST', 'callback' => 'create_pulse2_workflow_stage', 'permission_callback' => function() { return current_user_can('edit_posts'); }),
    ));
    
    register_rest_route('pulse2/v1', '/workspaces/(?P<workspace_id>[a-zA-Z0-9\-]+)/metrics', array(
        'methods' => 'GET',
        'callback' => 'get_pulse2_workflow_metrics',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workflow-templates', array(
        'methods' => 'GET',
        'callback' => 'get_pulse2_workflow_templates',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    // Analytics routes
    register_rest_route('pulse2/v1', '/analytics/summary', array(
        'methods' => 'GET',
        'callback' => 'get_pulse2_analytics_summary',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));

    // Project routes are registered in rest-projects.php
    if (function_exists('pulse2_register_rest_projects')) {
        pulse2_register_rest_projects();
    }
}
}

// Hook REST API registration
add_action('rest_api_init', 'pulse2_register_rest');