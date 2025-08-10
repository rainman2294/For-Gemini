<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

if (!function_exists('pulse2_activation_hook')) {
    function pulse2_activation_hook() {
        pulse2_debug_log('Plugin activation started');
        try {
            pulse2_debug_log('WordPress Version: ' . (function_exists('get_bloginfo') ? get_bloginfo('version') : 'Unknown'));
            pulse2_debug_log('PHP Version: ' . phpversion());
            pulse2_debug_log('WordPress Debug Status: ' . (defined('WP_DEBUG') && WP_DEBUG ? 'ON' : 'OFF'));
            pulse2_debug_log('Plugin activation completed successfully');
        } catch (Throwable $e) {
            pulse2_debug_log('Activation error: ' . $e->getMessage());
            throw $e;
        }
    }
}

if (!function_exists('pulse2_plugin_activation')) {
    function pulse2_plugin_activation() {
        // Flush rewrites after CPT registration
        flush_rewrite_rules();
        error_log('Pulse 2 activated and rewrite rules flushed.');
    }
}

if (!function_exists('pulse2_plugin_deactivation')) {
    function pulse2_plugin_deactivation() {
        flush_rewrite_rules();
        error_log('Pulse 2 deactivated and rewrite rules flushed.');
    }
}


