<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

// Register frontend assets; enqueue happens in the shortcode
function pulse2_enqueue_assets() {
    pulse2_debug_log('pulse2_enqueue_assets function called');
    try {
            $plugin_url = defined('PULSE2_PLUGIN_URL') ? PULSE2_PLUGIN_URL : plugin_dir_url( dirname( dirname( __FILE__ ) ) );
            $build_dir = (defined('PULSE2_PLUGIN_PATH') ? PULSE2_PLUGIN_PATH : plugin_dir_path( dirname( dirname( __FILE__ ) ) )) . 'build/assets/';
            
            // Find the main JS file (starts with 'index-')
            $js_files = glob( $build_dir . 'index-*.js' );
            $css_files = glob( $build_dir . 'index-*.css' );
            pulse2_debug_log('Found JS files', $js_files);
            pulse2_debug_log('Found CSS files', $css_files);
        
        if ( !empty( $js_files ) ) {
            $js_file = basename( $js_files[0] );

            // Register vendor chunk first if present
            $vendor_files = glob( $build_dir . 'vendor-*.js' );
            if ( !empty( $vendor_files ) ) {
                $vendor_file = basename( $vendor_files[0] );
                wp_register_script(
                    'pulse2-vendor',
                    $plugin_url . 'build/assets/' . $vendor_file,
                    array(),
                    '2.1.0',
                    true
                );
            }

            // Register main app bundle, depending on vendor if available
            $deps = array('wp-element');
            if ( !empty( $vendor_files ) ) { $deps[] = 'pulse2-vendor'; }
            wp_register_script(
                'pulse2-script',
                $plugin_url . 'build/assets/' . $js_file,
                $deps,
                '2.1.0',
                true
            );
            // Localize script with WordPress API configuration (force clean /wp-json base)
            $site_base = rtrim( get_site_url(), '/' );
            wp_localize_script( 'pulse2-script', 'pulse2', array(
                'apiUrl' => $site_base . '/wp-json/pulse2/v1',
                'mediaUrl' => $site_base . '/wp-json/wp/v2/media',
                'jwtUrl' => $site_base . '/wp-json/jwt-auth/v1/token',
                'nonce' => wp_create_nonce( 'wp_rest' ),
                'currentUser' => array(
                    'id' => get_current_user_id(),
                    'name' => wp_get_current_user()->display_name,
                    'email' => wp_get_current_user()->user_email,
                    'avatar' => get_avatar_url( get_current_user_id() ),
                    'capabilities' => array(
                        'canEdit' => current_user_can( 'edit_posts' ),
                        'canUpload' => current_user_can( 'upload_files' ),
                        'canManage' => current_user_can( 'manage_options' )
                    )
                ),
                'siteInfo' => array(
                    'name' => get_bloginfo( 'name' ),
                    'url' => get_site_url(),
                    'adminEmail' => get_option( 'admin_email' )
                )
            ) );
        }
        
        // Enqueue CSS if exists
        if ( !empty( $css_files ) ) {
            $css_file = basename( $css_files[0] );
            wp_register_style(
                'pulse2-style',
                $plugin_url . 'build/assets/' . $css_file,
                array(),
                '2.1.0'
            );
        }
        
        // Add module type attribute for React scripts
        add_filter( 'script_loader_tag', 'pulse2_add_type_attribute', 10, 3 );
        
        pulse2_debug_log('Assets registered successfully');
    } catch (Exception $e) {
        pulse2_debug_log('Error enqueuing assets: ' . $e->getMessage());
    }
}

// Add type="module" attribute to React scripts
function pulse2_add_type_attribute($tag, $handle, $src) {
    if ('pulse2-script' === $handle || 'pulse2-vendor' === $handle) {
        $tag = '<script type="module" src="' . esc_url($src) . '" id="' . $handle . '-js"></script>';
    }
    return $tag;
}

// Hook asset registration early
add_action( 'wp_enqueue_scripts', 'pulse2_enqueue_assets', 5 );