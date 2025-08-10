<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

// Pulse2 shortcode handler
function pulse2_shortcode() {
    // Ensure assets are registered
    if (function_exists('pulse2_enqueue_assets')) {
        pulse2_enqueue_assets();
    }
    // Enqueue now to force load only when shortcode is present
    if (wp_script_is('pulse2-vendor', 'registered')) {
        wp_enqueue_script('pulse2-vendor');
    }
    if (wp_script_is('pulse2-script', 'registered')) {
        wp_enqueue_script('pulse2-script');
    }
    if (wp_style_is('pulse2-style', 'registered')) {
        wp_enqueue_style('pulse2-style');
    }
    // React app expects #root inside #pulse2-root
    return '<div id="pulse2-root"><div id="root"></div></div>';
}

// Register shortcode
add_shortcode('pulse2', 'pulse2_shortcode');