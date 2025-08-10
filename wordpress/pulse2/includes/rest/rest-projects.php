<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

// Project REST registration
if (!function_exists('pulse2_register_rest_projects')) {
    function pulse2_register_rest_projects() {
        // Ensure callbacks exist (defined in includes/api/projects.php)
        register_rest_route( 'pulse2/v1', '/projects', array(
            array('methods' => WP_REST_Server::READABLE, 'callback' => 'get_pulse2_projects', 'permission_callback' => '__return_true'),
            array('methods' => WP_REST_Server::CREATABLE, 'callback' => 'create_pulse2_project', 'permission_callback' => function() { return current_user_can('edit_posts'); }),
        ));
        register_rest_route( 'pulse2/v1', '/projects/(?P<id>\d+)', array(
            array('methods' => WP_REST_Server::READABLE, 'callback' => 'get_pulse2_project', 'permission_callback' => '__return_true'),
            array('methods' => WP_REST_Server::EDITABLE, 'callback' => 'update_pulse2_project', 'permission_callback' => function() { return current_user_can('edit_posts'); }),
            array('methods' => WP_REST_Server::DELETABLE, 'callback' => 'delete_pulse2_project', 'permission_callback' => function() { return current_user_can('edit_posts'); }),
        ));
        register_rest_route( 'pulse2/v1', '/projects/import', array(
            array('methods' => WP_REST_Server::CREATABLE, 'callback' => 'import_pulse2_projects', 'permission_callback' => function() { return current_user_can('edit_posts'); }),
        ));
    }
}


