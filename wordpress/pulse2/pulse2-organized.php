<?php
/*
Plugin Name: Pulse 2
Plugin URI: https://example.com/pulse2
Description: A WordPress plugin that embeds a React-based project management app.
Version: 2.1.0
Author: Mehranfakhteh
Author URI: https://example.com
Text Domain: pulse2
Domain Path: /languages
*/

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('PULSE2_PLUGIN_URL', plugin_dir_url(__FILE__));
define('PULSE2_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('PULSE2_VERSION', '2.1.0');

// === CORE INCLUDES ===
// Load core functionality first
require_once PULSE2_PLUGIN_PATH . 'includes/core/helpers.php';
require_once PULSE2_PLUGIN_PATH . 'includes/core/activation.php';
require_once PULSE2_PLUGIN_PATH . 'includes/core/database.php';
require_once PULSE2_PLUGIN_PATH . 'includes/core/debug.php';

// === FRONTEND INCLUDES ===
// Load frontend functionality
require_once PULSE2_PLUGIN_PATH . 'includes/frontend/assets.php';
require_once PULSE2_PLUGIN_PATH . 'includes/frontend/shortcodes.php';

// === ADMIN INCLUDES ===
// Load admin functionality
require_once PULSE2_PLUGIN_PATH . 'includes/admin/admin-menus.php';
require_once PULSE2_PLUGIN_PATH . 'includes/admin/settings-page.php';

// === CUSTOM POST TYPES ===
// Load custom post types
require_once PULSE2_PLUGIN_PATH . 'includes/cpt/cpt-projects.php';
require_once PULSE2_PLUGIN_PATH . 'includes/cpt/cpt-notes.php';
require_once PULSE2_PLUGIN_PATH . 'includes/cpt/cpt-activities.php';
require_once PULSE2_PLUGIN_PATH . 'includes/cpt/cpt-workspaces.php';
add_action('init', 'pulse2_register_project_cpt');
add_action('init', 'pulse2_register_note_cpt');
add_action('init', 'pulse2_register_workspace_cpt');
add_action('init', 'pulse2_register_activity_cpt');

// === META FIELDS ===
// Load meta field registrations
require_once PULSE2_PLUGIN_PATH . 'includes/meta/meta-fields.php';

// === REST API ===
// Load REST API endpoints
require_once PULSE2_PLUGIN_PATH . 'includes/rest/rest-projects.php';
require_once PULSE2_PLUGIN_PATH . 'includes/rest/rest-routes.php';

// === API CALLBACKS ===
// Load API callback functions
require_once PULSE2_PLUGIN_PATH . 'includes/api/users.php';
require_once PULSE2_PLUGIN_PATH . 'includes/api/invitations.php';
require_once PULSE2_PLUGIN_PATH . 'includes/api/notes.php';
require_once PULSE2_PLUGIN_PATH . 'includes/api/activities.php';
require_once PULSE2_PLUGIN_PATH . 'includes/api/settings.php';
require_once PULSE2_PLUGIN_PATH . 'includes/api/projects.php';
require_once PULSE2_PLUGIN_PATH . 'includes/api/workspace-callbacks.php';

// === WORKSPACES ===
// Load workspace-specific functionality (keeping separate due to size)
if (file_exists(PULSE2_PLUGIN_PATH . 'includes/workspaces-json.php')) {
    require_once PULSE2_PLUGIN_PATH . 'includes/workspaces-json.php';
}

// === INITIALIZATION ===
// Ensure shutdown handler is registered early
if (function_exists('pulse2_register_shutdown_handler')) {
    pulse2_register_shutdown_handler();
}

// No need to hook a loader; routes are registered from rest-routes.php during rest_api_init

// === PLUGIN ACTIVATION ===
// Register activation hook
register_activation_hook(__FILE__, 'pulse2_activation_hook');

// === PLUGIN INFORMATION ===
// Add plugin version info for debugging
add_action('init', function() {
    pulse2_debug_log('Pulse 2 plugin loaded successfully, version: ' . PULSE2_VERSION);
}, 1);