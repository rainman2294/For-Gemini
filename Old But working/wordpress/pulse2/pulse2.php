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

// Helper function to safely sanitize a date string to ISO 8601 format or null
function pulse2_sanitize_date_to_iso($date_string) {
    if (empty($date_string) || $date_string === '0000-00-00 00:00:00') {
        return null;
    }
    try {
        // Handle timestamps that might be passed
        if (is_numeric($date_string) && strlen($date_string) >= 10) {
             $date = new DateTime('@' . substr($date_string, 0, 10));
        } else {
             $date = new DateTime($date_string);
        }
        return $date->format('c'); // 'c' is ISO 8601 format (e.g., 2004-02-12T15:19:21+00:00)
    } catch (Exception $e) {
        // If parsing fails for any reason, return null to prevent frontend errors
        return null;
    }
}

// --- Enqueue, Shortcode, CPT, and Meta Registration (Updated for dynamic asset loading) ---
function pulse2_enqueue_assets() {
    global $post;
    if ( is_a( $post, 'WP_Post' ) && has_shortcode( $post->post_content, 'pulse2' ) ) {
        $plugin_url = plugin_dir_url( __FILE__ );
        $build_dir = plugin_dir_path( __FILE__ ) . 'build/assets/';
        
        // Find the main JS file (starts with 'index-')
        $js_files = glob( $build_dir . 'index-*.js' );
        $css_files = glob( $build_dir . 'index-*.css' );
        
        if ( !empty( $js_files ) ) {
            $js_file = basename( $js_files[0] );
            wp_enqueue_script( 
                'pulse2-script', 
                $plugin_url . 'build/assets/' . $js_file, 
                array('wp-element'), 
                '2.1.0', 
                true 
            );
            
            // Localize script with WordPress API configuration
            wp_localize_script( 'pulse2-script', 'pulse2', array(
                'apiUrl' => rest_url( 'pulse2/v1' ),
                'mediaUrl' => rest_url( 'wp/v2/media' ),
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
            wp_enqueue_style( 
                'pulse2-style', 
                $plugin_url . 'build/assets/' . $css_file, 
                array(), 
                '2.1.0' 
            );
        }
        
        // Also enqueue vendor chunk if it exists
        $vendor_files = glob( $build_dir . 'vendor-*.js' );
        if ( !empty( $vendor_files ) ) {
            $vendor_file = basename( $vendor_files[0] );
            wp_enqueue_script( 
                'pulse2-vendor', 
                $plugin_url . 'build/assets/' . $vendor_file, 
                array(), 
                '2.1.0', 
                true 
            );
        }
        
        // Enqueue UI chunk if it exists
        $ui_files = glob( $build_dir . 'ui-*.js' );
        if ( !empty( $ui_files ) ) {
            $ui_file = basename( $ui_files[0] );
            wp_enqueue_script( 
                'pulse2-ui', 
                $plugin_url . 'build/assets/' . $ui_file, 
                array('pulse2-vendor'), 
                '2.1.0', 
                true 
            );
        }
    }
}
add_action( 'wp_enqueue_scripts', 'pulse2_enqueue_assets' );

function pulse2_add_type_attribute($tag, $handle, $src) {
    // Add module type for modern JS
    if ( strpos( $handle, 'pulse2' ) === 0 ) {
        $tag = str_replace( '<script', '<script type="module"', $tag );
    }
    return $tag;
}
add_filter( 'script_loader_tag', 'pulse2_add_type_attribute', 10, 3 );

function pulse2_shortcode() {
    return '<div id="pulse2-root" class="pulse2-container"><div id="root"></div></div>';
}
add_shortcode( 'pulse2', 'pulse2_shortcode' );

function pulse2_register_cpt() {
    $labels = array(
        'name' => 'Projects', 
        'singular_name' => 'Project', 
        'menu_name' => 'Pulse 2',
        'add_new' => 'Add Project',
        'add_new_item' => 'Add New Project',
        'edit_item' => 'Edit Project',
        'new_item' => 'New Project',
        'view_item' => 'View Project',
        'search_items' => 'Search Projects',
        'not_found' => 'No projects found',
        'not_found_in_trash' => 'No projects found in trash'
    );
    $args = array(
        'labels' => $labels, 
        'public' => true, 
        'show_ui' => true, 
        'supports' => array( 'title' ), 
        'show_in_rest' => true, 
        'menu_icon' => 'dashicons-chart-bar',
        'hierarchical' => false,
        'capability_type' => 'post'
    );
    register_post_type( 'pulse2_project', $args );
}
add_action( 'init', 'pulse2_register_cpt' );

// Add submenu items for notes and activities under Projects
function pulse2_add_admin_submenus() {
    // Add Notes submenu
    add_submenu_page(
        'edit.php?post_type=pulse2_project', // Parent slug (Projects)
        'Notes', // Page title
        'Notes', // Menu title
        'edit_posts', // Capability
        'edit.php?post_type=pulse2_note' // Menu slug
    );
    
    // Add Activities submenu
    add_submenu_page(
        'edit.php?post_type=pulse2_project', // Parent slug (Projects)
        'Activities', // Page title
        'Activities', // Menu title
        'edit_posts', // Capability
        'edit.php?post_type=pulse2_activity' // Menu slug
    );
}
add_action('admin_menu', 'pulse2_add_admin_submenus');

// Add Settings submenu
function pulse2_add_settings_submenu() {
    add_submenu_page(
        'edit.php?post_type=pulse2_project', // Parent slug (Projects)
        'Pulse 2 Settings', // Page title
        'Settings', // Menu title
        'manage_options', // Capability (admin only)
        'pulse2-settings', // Menu slug
        'pulse2_settings_page' // Callback function
    );
}
add_action('admin_menu', 'pulse2_add_settings_submenu');

// Settings page callback
function pulse2_settings_page() {
    // Save settings if form is submitted
    if (isset($_POST['pulse2_save_settings']) && wp_verify_nonce($_POST['pulse2_settings_nonce'], 'pulse2_settings')) {
        update_option('pulse2_app_url', sanitize_text_field($_POST['app_url']));
        update_option('pulse2_admin_email', sanitize_email($_POST['admin_email']));
        update_option('pulse2_invitation_email_subject', sanitize_text_field($_POST['invitation_email_subject']));
        update_option('pulse2_invitation_email_template', sanitize_textarea_field($_POST['invitation_email_template']));
        echo '<div class="notice notice-success"><p>Settings saved successfully!</p></div>';
    }
    
    $settings = get_pulse2_settings_data();
    ?>
    <div class="wrap">
        <h1>Pulse 2 Settings</h1>
        <form method="post" action="">
            <?php wp_nonce_field('pulse2_settings', 'pulse2_settings_nonce'); ?>
            
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="app_url">App URL</label>
                    </th>
                    <td>
                        <input type="url" id="app_url" name="app_url" value="<?php echo esc_attr($settings['app_url']); ?>" class="regular-text" />
                        <p class="description">The URL where your Pulse 2 app is hosted (e.g., https://yourdomain.com)</p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="admin_email">Admin Email</label>
                    </th>
                    <td>
                        <input type="email" id="admin_email" name="admin_email" value="<?php echo esc_attr($settings['admin_email']); ?>" class="regular-text" />
                        <p class="description">Email address for admin communications</p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="invitation_email_subject">Invitation Email Subject</label>
                    </th>
                    <td>
                        <input type="text" id="invitation_email_subject" name="invitation_email_subject" value="<?php echo esc_attr($settings['invitation_email_subject']); ?>" class="regular-text" />
                        <p class="description">Subject line for invitation emails</p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="invitation_email_template">Invitation Email Template</label>
                    </th>
                    <td>
                        <textarea id="invitation_email_template" name="invitation_email_template" rows="15" cols="50" class="large-text"><?php echo esc_textarea($settings['invitation_email_template']); ?></textarea>
                        <p class="description">
                            Available placeholders: {invited_by_name}, {site_name}, {role}, {site_url}, {admin_email}
                        </p>
                    </td>
                </tr>
            </table>
            
            <p class="submit">
                <input type="submit" name="pulse2_save_settings" class="button-primary" value="Save Settings" />
            </p>
        </form>
    </div>
    <?php
}

function pulse2_register_meta() {
    $meta_keys = array('client','projectManager','artists','brief','externalLinks','startDate','endDate','priority','status','statusHistory','media','isArchived','videoUrl', 'createdAt', 'updatedAt');
    foreach ( $meta_keys as $key ) {
        register_post_meta( 'pulse2_project', $key, array('show_in_rest' => true, 'single' => true, 'type' => is_array($key) ? 'array' : 'string', 'auth_callback' => function() { return current_user_can('edit_posts'); }));
    }
}
add_action( 'init', 'pulse2_register_meta' );


// --- REST API Endpoints (REWRITTEN FOR ROBUSTNESS) ---
function pulse2_register_rest() {
    // Projects Endpoint
    register_rest_route( 'pulse2/v1', '/projects', array(
        array(
            'methods' => WP_REST_Server::READABLE, 
            'callback' => 'get_pulse2_projects', 
            'permission_callback' => '__return_true',
        ),
        array(
            'methods' => WP_REST_Server::CREATABLE, 
            'callback' => 'create_pulse2_project', 
            'permission_callback' => function() { return current_user_can('edit_posts'); },
        ),
    ));
    
    // Single Project Endpoint
    register_rest_route( 'pulse2/v1', '/projects/(?P<id>\d+)', array(
        array(
            'methods' => WP_REST_Server::READABLE, 
            'callback' => 'get_pulse2_project', 
            'permission_callback' => '__return_true',
        ),
        array(
            'methods' => WP_REST_Server::EDITABLE, 
            'callback' => 'update_pulse2_project', 
            'permission_callback' => function() { return current_user_can('edit_posts'); },
        ),
        array(
            'methods' => WP_REST_Server::DELETABLE, 
            'callback' => 'delete_pulse2_project', 
            'permission_callback' => function() { return current_user_can('edit_posts'); },
        ),
    ));
    
    // Import Endpoint
    register_rest_route( 'pulse2/v1', '/projects/import', array(
        array(
            'methods' => WP_REST_Server::CREATABLE, 
            'callback' => 'import_pulse2_projects', 
            'permission_callback' => function() { return current_user_can('edit_posts'); },
        ),
    ));

    // Notes Endpoint
    register_rest_route( 'pulse2/v1', '/notes', array(
        array(
            'methods' => WP_REST_Server::READABLE, 
            'callback' => 'get_pulse2_notes', 
            'permission_callback' => '__return_true',
        ),
        array(
            'methods' => WP_REST_Server::CREATABLE, 
            'callback' => 'create_pulse2_note', 
            'permission_callback' => function() { return current_user_can('edit_posts'); },
        ),
    ));

    // Single Note Endpoint
    register_rest_route( 'pulse2/v1', '/notes/(?P<id>\d+)', array(
        array(
            'methods' => WP_REST_Server::EDITABLE, 
            'callback' => 'update_pulse2_note', 
            'permission_callback' => function() { return current_user_can('edit_posts'); },
        ),
        array(
            'methods' => WP_REST_Server::DELETABLE, 
            'callback' => 'delete_pulse2_note', 
            'permission_callback' => function() { return current_user_can('edit_posts'); },
        ),
    ));

    // User "me" endpoint
    register_rest_route( 'pulse2/v1', '/me', array(
        'methods' => WP_REST_Server::READABLE,
        'callback' => 'get_current_pulse2_user',
        'permission_callback' => function () {
            return is_user_logged_in();
        }
    ));

    // User Management Endpoints
    register_rest_route( 'pulse2/v1', '/users', array(
        array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => 'get_pulse2_users',
            'permission_callback' => function() { return current_user_can('edit_posts'); },
        ),
        array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => 'create_pulse2_user',
            'permission_callback' => function() { return current_user_can('edit_posts'); },
        ),
    ));

    register_rest_route( 'pulse2/v1', '/users/(?P<id>\d+)', array(
        array(
            'methods' => WP_REST_Server::EDITABLE,
            'callback' => 'update_pulse2_user',
            'permission_callback' => function() { return current_user_can('edit_posts'); },
        ),
        array(
            'methods' => WP_REST_Server::DELETABLE,
            'callback' => 'delete_pulse2_user',
            'permission_callback' => function() { return current_user_can('delete_posts'); },
        ),
    ));

    // Invitations Endpoints
    register_rest_route( 'pulse2/v1', '/invitations', array(
        array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => 'get_pulse2_invitations',
            'permission_callback' => function() { return current_user_can('edit_posts'); },
        ),
        array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => 'create_pulse2_invitation',
            'permission_callback' => function() { return current_user_can('edit_posts'); },
        ),
    ));

        register_rest_route( 'pulse2/v1', '/invitations/(?P<id>[a-zA-Z0-9-]+)', array(
        array(
            'methods' => WP_REST_Server::EDITABLE,
            'callback' => 'update_pulse2_invitation',
            'permission_callback' => function() { return current_user_can('edit_posts'); },
        ),
        array(
            'methods' => WP_REST_Server::DELETABLE,
            'callback' => 'delete_pulse2_invitation',
            'permission_callback' => function() { return current_user_can('edit_posts'); },
        ),
    ));

    // Password Reset Endpoints
    register_rest_route( 'pulse2/v1', '/password-reset', array(
        array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => 'request_pulse2_password_reset',
            'permission_callback' => '__return_true',
        ),
    ));

    register_rest_route( 'pulse2/v1', '/password-reset/(?P<token>[a-zA-Z0-9-]+)', array(
        array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => 'reset_pulse2_password',
            'permission_callback' => '__return_true',
        ),
    ));

    // Activities Endpoint
    register_rest_route( 'pulse2/v1', '/activities', array(
        array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => 'get_pulse2_activities',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => 'create_pulse2_activity',
            'permission_callback' => function() { return current_user_can('edit_posts'); },
        ),
    ));

    // Settings Endpoint
    register_rest_route( 'pulse2/v1', '/settings', array(
        array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => 'get_pulse2_settings',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods' => WP_REST_Server::EDITABLE,
            'callback' => 'update_pulse2_settings',
            'permission_callback' => function() { return current_user_can('manage_options'); },
        ),
    ));

    // User Presence Endpoints
    register_rest_route( 'pulse2/v1', '/presence', array(
        array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => 'get_pulse2_presence',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => 'update_pulse2_presence',
            'permission_callback' => function() { return is_user_logged_in(); },
        ),
    ));

    // Password Reset Endpoints
    register_rest_route( 'pulse2/v1', '/password-reset', array(
        array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => 'request_pulse2_password_reset',
            'permission_callback' => '__return_true',
        ),
    ));

    register_rest_route( 'pulse2/v1', '/password-reset/(?P<token>[a-zA-Z0-9-]+)', array(
        array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => 'reset_pulse2_password',
            'permission_callback' => '__return_true',
        ),
    ));
}
add_action( 'rest_api_init', 'pulse2_register_rest' );

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

// User Management Functions
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

// Invitation Functions
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

// Password Reset Functions
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

// Email Functions
function send_invitation_email($email, $invited_by_name, $role, $invitation_id) {
    $settings = get_pulse2_settings_data();
    $site_name = get_bloginfo('name');
    $site_url = $settings['app_url'] ?: get_site_url();
    $admin_email = $settings['admin_email'] ?: get_option('admin_email');
    
    $subject = $settings['invitation_email_subject'] ?: sprintf('[%s] You have been invited to join our team', $site_name);
    
    $message_template = $settings['invitation_email_template'] ?: 'Hello,

You have been invited by {invited_by_name} to join the {site_name} team as a {role}.

To accept this invitation, please visit:
{site_url}

This invitation will expire in 7 days.

If you have any questions, please contact us at {admin_email}.

Best regards,
The {site_name} Team';
    
    $message = str_replace(
        array('{invited_by_name}', '{site_name}', '{role}', '{site_url}', '{admin_email}'),
        array($invited_by_name, $site_name, str_replace('_', ' ', $role), $site_url, $admin_email),
        $message_template
    );
    
    $headers = array(
        'Content-Type: text/plain; charset=UTF-8',
        'From: ' . $site_name . ' <' . $admin_email . '>'
    );
    
    return wp_mail($email, $subject, $message, $headers);
}

function send_password_reset_email($email, $token) {
    $site_name = get_bloginfo('name');
    $site_url = get_site_url();
    $reset_url = add_query_arg(array(
        'action' => 'reset_password',
        'token' => $token
    ), $site_url);
    
    $subject = sprintf('[%s] Password Reset Request', $site_name);
    
    $message = sprintf(
        'Hello,

You have requested a password reset for your account on %s.

To reset your password, please click the following link:
%s

This link will expire in 1 hour.

If you did not request this reset, please ignore this email.

Best regards,
The %s Team',
        $site_name,
        $reset_url,
        $site_name
    );
    
    $headers = array(
        'Content-Type: text/plain; charset=UTF-8',
        'From: ' . $site_name . ' <' . get_option('admin_email') . '>'
    );
    
    return wp_mail($email, $subject, $message, $headers);
}

function get_pulse2_projects( $request ) {
    $posts = get_posts(array('post_type' => 'pulse2_project', 'post_status' => 'publish', 'posts_per_page' => -1));
    $data = array();
    foreach ( $posts as $post ) {
        $data[] = format_project_response($post);
    }
    return new WP_REST_Response($data, 200);
}

function get_pulse2_project( $request ) {
    $post = get_post( $request['id'] );
    if ( ! $post || $post->post_type !== 'pulse2_project' ) {
        return new WP_Error( 'not_found', 'Project not found', array( 'status' => 404 ) );
    }
    return new WP_REST_Response(format_project_response($post), 200);
}

// Centralized Project Data Formatter
function format_project_response($post) {
    $meta = get_post_meta($post->ID);
    
    // Function to safely get meta value
    $get_meta = function($key) use ($meta) {
        return isset($meta[$key][0]) ? maybe_unserialize($meta[$key][0]) : null;
    };

    $status_history = $get_meta('statusHistory') ?: [];
    if (is_array($status_history)) {
        foreach($status_history as &$entry) {
            if(isset($entry['date'])) {
                $entry['date'] = pulse2_sanitize_date_to_iso($entry['date']);
            }
        }
    }

    return array(
        'id' => (string) $post->ID,
        'name' => $post->post_title,
        'client' => $get_meta('client'),
        'projectManager' => $get_meta('projectManager'),
        'artists' => $get_meta('artists') ?: [],
        'brief' => $get_meta('brief'),
        'externalLinks' => $get_meta('externalLinks') ?: [],
        'startDate' => pulse2_sanitize_date_to_iso($get_meta('startDate')),
        'endDate' => pulse2_sanitize_date_to_iso($get_meta('endDate')),
        'priority' => $get_meta('priority') ?: 'medium',
        'status' => $get_meta('status') ?: 'planning',
        'statusHistory' => $status_history,
        'media' => $get_meta('media') ?: [],
        'videoUrl' => $get_meta('videoUrl'),
        'isArchived' => (bool) $get_meta('isArchived'),
        'createdAt' => pulse2_sanitize_date_to_iso($post->post_date),
        'updatedAt' => pulse2_sanitize_date_to_iso($post->post_modified),
    );
}

function create_pulse2_project( $request ) {
    $params = $request->get_json_params();
    $post_id = wp_insert_post( array(
        'post_title' => sanitize_text_field($params['name']),
        'post_type' => 'pulse2_project',
        'post_status' => 'publish',
    ) );
    if ( is_wp_error( $post_id ) ) return $post_id;
    
    update_project_meta($post_id, $params);
    
    $post = get_post($post_id);
    return new WP_REST_Response(format_project_response($post), 201);
}

function update_pulse2_project( $request ) {
    $post_id = $request['id'];
    $params = $request->get_json_params();
    wp_update_post(array('ID' => $post_id, 'post_title' => sanitize_text_field($params['name'])));
    
    update_project_meta($post_id, $params);

    $post = get_post($post_id);
    return new WP_REST_Response(format_project_response($post), 200);
}

function update_project_meta($post_id, $params) {
    $meta_keys = array('client','projectManager','artists','brief','externalLinks','startDate','endDate','priority','status','statusHistory','media','isArchived','videoUrl');
    foreach ( $meta_keys as $key ) {
        if ( isset( $params[$key] ) ) {
            // Sanitize dates before updating meta
            if ($key === 'startDate' || $key === 'endDate') {
                update_post_meta($post_id, $key, pulse2_sanitize_date_to_iso($params[$key]));
            } else if ($key === 'statusHistory' && is_array($params[$key])) {
                $sanitized_history = $params[$key];
                foreach($sanitized_history as &$entry) {
                    if (isset($entry['date'])) {
                        $entry['date'] = pulse2_sanitize_date_to_iso($entry['date']);
                    }
                }
                update_post_meta($post_id, $key, $sanitized_history);
            }
            else {
                update_post_meta($post_id, $key, $params[$key]);
            }
        }
    }
}

function delete_pulse2_project( $request ) {
    $post_id = $request['id'];

    // Explicit permission check for added security
    if (!current_user_can('delete_post', $post_id)) {
        return new WP_Error('forbidden', 'You do not have permission to delete this project.', array('status' => 403));
    }

    $result = wp_delete_post( $post_id, true );
    if ( ! $result ) {
        return new WP_Error( 'delete_failed', 'Failed to delete project.', array( 'status' => 500 ) );
    }
    return new WP_REST_Response( array( 'message' => 'Project deleted successfully' ), 200 );
}

function import_pulse2_projects( $request ) {
    $projects = $request->get_json_params();
    $imported = 0;
    $errors = array();
    
    foreach ( $projects as $project ) {
        // Sanitize all date fields in the project object before insertion
        $project['startDate'] = pulse2_sanitize_date_to_iso($project['startDate'] ?? null);
        $project['endDate'] = pulse2_sanitize_date_to_iso($project['endDate'] ?? null);
        $project['createdAt'] = pulse2_sanitize_date_to_iso($project['createdAt'] ?? null);
        $project['updatedAt'] = pulse2_sanitize_date_to_iso($project['updatedAt'] ?? null);

        if (isset($project['statusHistory']) && is_array($project['statusHistory'])) {
            foreach ($project['statusHistory'] as &$entry) {
                $entry['date'] = pulse2_sanitize_date_to_iso($entry['date'] ?? null);
            }
        }
        
        $post_id = wp_insert_post( array(
            'post_title' => sanitize_text_field($project['name']),
            'post_type' => 'pulse2_project',
            'post_status' => 'publish',
            'post_date' => $project['createdAt'] ?? null,
            'post_modified' => $project['updatedAt'] ?? null,
        ) );
        
        if ( ! is_wp_error( $post_id ) ) {
            update_project_meta($post_id, $project);
            $imported++;
        } else {
            $errors[] = "Failed to create project '{$project['name']}': " . $post_id->get_error_message();
        }
    }
    
    return new WP_REST_Response( array('imported' => $imported, 'errors' => $errors), 200 );
}

// --- Notes CPT and Meta ---
function pulse2_register_note_cpt() {
    $labels = array(
        'name' => 'Notes', 
        'singular_name' => 'Note', 
        'menu_name' => 'Notes',
        'add_new' => 'Add Note',
        'add_new_item' => 'Add New Note',
        'edit_item' => 'Edit Note',
        'new_item' => 'New Note',
        'view_item' => 'View Note',
        'search_items' => 'Search Notes',
        'not_found' => 'No notes found',
        'not_found_in_trash' => 'No notes found in trash'
    );
    $args = array(
        'labels' => $labels, 
        'public' => false, 
        'show_ui' => true, 
        'supports' => array( 'editor' ), 
        'show_in_rest' => true,
        'show_in_menu' => false, // Hide from main menu
        'hierarchical' => false,
        'capability_type' => 'post'
    );
    register_post_type( 'pulse2_note', $args );
}
add_action( 'init', 'pulse2_register_note_cpt' );

function pulse2_register_note_meta() {
    $meta_keys = array('project_id', 'author_id', 'author_name', 'parent_note_id');
    foreach ( $meta_keys as $key ) {
        register_post_meta( 'pulse2_note', $key, array('show_in_rest' => true, 'single' => true, 'type' => 'string'));
    }
}
add_action( 'init', 'pulse2_register_note_meta' );

// --- Notes API Callbacks ---
function get_pulse2_notes($request) {
    $project_id = $request->get_param('project_id');
    if (empty($project_id)) {
        return new WP_Error('bad_request', 'Project ID is required.', array('status' => 400));
    }
    
    $posts = get_posts(array(
        'post_type' => 'pulse2_note',
        'post_status' => 'publish',
        'posts_per_page' => -1,
        'meta_query' => array(
            array('key' => 'project_id', 'value' => $project_id, 'compare' => '=')
        )
    ));

    $notes = array();
    foreach ($posts as $post) {
        $notes[] = format_note_response($post);
    }
    
    // Simple hierarchy build
    $nested_notes = array();
    $notes_by_id = array();
    foreach($notes as $note) {
        $notes_by_id[$note['id']] = $note;
    }
    foreach($notes as $note) {
        if (!empty($note['parentNoteId']) && isset($notes_by_id[$note['parentNoteId']])) {
            $notes_by_id[$note['parentNoteId']]['replies'][] = $note;
        } else {
            $nested_notes[] = $note;
        }
    }

    return new WP_REST_Response($nested_notes, 200);
}

function format_note_response($post) {
    return array(
        'id' => (string) $post->ID,
        'projectId' => get_post_meta($post->ID, 'project_id', true),
        'authorId' => get_post_meta($post->ID, 'author_id', true),
        'authorName' => get_post_meta($post->ID, 'author_name', true),
        'content' => $post->post_content,
        'createdAt' => pulse2_sanitize_date_to_iso($post->post_date),
        'updatedAt' => pulse2_sanitize_date_to_iso($post->post_modified),
        'parentNoteId' => get_post_meta($post->ID, 'parent_note_id', true),
        'replies' => [], // Replies will be nested in the get_pulse2_notes function
    );
}

function create_pulse2_note($request) {
    $params = $request->get_json_params();
    $user = wp_get_current_user();

    $post_id = wp_insert_post(array(
        'post_type' => 'pulse2_note',
        'post_status' => 'publish',
        'post_content' => sanitize_textarea_field($params['content']),
        'post_author' => $user->ID,
    ));

    if (is_wp_error($post_id)) return $post_id;

    update_post_meta($post_id, 'project_id', sanitize_text_field($params['project_id']));
    update_post_meta($post_id, 'author_id', $user->ID);
    update_post_meta($post_id, 'author_name', $user->display_name);
    if (!empty($params['parent_note_id'])) {
        update_post_meta($post_id, 'parent_note_id', sanitize_text_field($params['parent_note_id']));
    }

    $post = get_post($post_id);
    return new WP_REST_Response(format_note_response($post), 201);
}

function update_pulse2_note($request) {
    $post_id = $request['id'];
    $params = $request->get_json_params();

    // Verify ownership or administrator rights
    $post = get_post($post_id);
    if ($post->post_author != get_current_user_id() && !current_user_can('manage_options')) {
        return new WP_Error('forbidden', 'You do not have permission to edit this note.', array('status' => 403));
    }
    
    wp_update_post(array(
        'ID' => $post_id,
        'post_content' => sanitize_textarea_field($params['content']),
    ));
    
    $updated_post = get_post($post_id);
    return new WP_REST_Response(format_note_response($updated_post), 200);
}

function delete_pulse2_note($request) {
    $post_id = $request['id'];

    // Verify ownership or administrator rights
    $post = get_post($post_id);
    if ($post->post_author != get_current_user_id() && !current_user_can('manage_options')) {
        return new WP_Error('forbidden', 'You do not have permission to delete this note.', array('status' => 403));
    }

    $result = wp_delete_post($post_id, true);
    if (!$result) {
        return new WP_Error('delete_failed', 'Failed to delete note.', array('status' => 500));
    }
    return new WP_REST_Response(array('message' => 'Note deleted successfully'), 200);
}

// --- Activation / Deactivation Hooks ---
function pulse2_plugin_activation() {
    pulse2_register_cpt(); // Ensure CPT is registered before flushing
    pulse2_register_note_cpt(); // Ensure Note CPT is registered
    pulse2_register_activity_cpt(); // Ensure Activity CPT is registered
    flush_rewrite_rules();
    error_log('Pulse 2 activated and rewrite rules flushed.');
}
register_activation_hook(__FILE__, 'pulse2_plugin_activation');

function pulse2_plugin_deactivation() {
    flush_rewrite_rules();
    error_log('Pulse 2 deactivated and rewrite rules flushed.');
}
register_deactivation_hook(__FILE__, 'pulse2_plugin_deactivation');

// --- Activity Logging Functions ---
function get_pulse2_activities($request) {
    $project_id = $request->get_param('project_id');
    $user_id = $request->get_param('user_id');
    $limit = $request->get_param('limit') ?: 50;
    
    $args = array(
        'post_type' => 'pulse2_activity',
        'post_status' => 'publish',
        'posts_per_page' => $limit,
        'orderby' => 'date',
        'order' => 'DESC',
    );
    
    if ($project_id) {
        $args['meta_query'][] = array(
            'key' => 'project_id',
            'value' => $project_id,
            'compare' => '='
        );
    }
    
    if ($user_id) {
        $args['meta_query'][] = array(
            'key' => 'user_id',
            'value' => $user_id,
            'compare' => '='
        );
    }
    
    $posts = get_posts($args);
    $activities = array();
    
    foreach ($posts as $post) {
        $activities[] = format_activity_response($post);
    }
    
    return new WP_REST_Response($activities, 200);
}

function create_pulse2_activity($request) {
    $params = $request->get_json_params();
    $user = wp_get_current_user();
    
    if (!$user->exists()) {
        return new WP_Error('unauthorized', 'User not authenticated', array('status' => 401));
    }
    
    $post_id = wp_insert_post(array(
        'post_type' => 'pulse2_activity',
        'post_status' => 'publish',
        'post_title' => sanitize_text_field($params['title']),
        'post_content' => sanitize_textarea_field($params['description']),
        'post_author' => $user->ID,
    ));
    
    if (is_wp_error($post_id)) {
        return $post_id;
    }
    
    // Set activity meta
    update_post_meta($post_id, 'activity_type', sanitize_text_field($params['type']));
    update_post_meta($post_id, 'user_id', $user->ID);
    update_post_meta($post_id, 'user_name', $user->display_name);
    
    if (!empty($params['project_id'])) {
        update_post_meta($post_id, 'project_id', sanitize_text_field($params['project_id']));
    }
    
    if (!empty($params['project_name'])) {
        update_post_meta($post_id, 'project_name', sanitize_text_field($params['project_name']));
    }
    
    if (!empty($params['related_id'])) {
        update_post_meta($post_id, 'related_id', sanitize_text_field($params['related_id']));
    }
    
    $post = get_post($post_id);
    return new WP_REST_Response(format_activity_response($post), 201);
}

function format_activity_response($post) {
    return array(
        'id' => (string) $post->ID,
        'type' => get_post_meta($post->ID, 'activity_type', true),
        'title' => $post->post_title,
        'description' => $post->post_content,
        'userId' => get_post_meta($post->ID, 'user_id', true),
        'userName' => get_post_meta($post->ID, 'user_name', true),
        'projectId' => get_post_meta($post->ID, 'project_id', true),
        'projectName' => get_post_meta($post->ID, 'project_name', true),
        'relatedId' => get_post_meta($post->ID, 'related_id', true),
        'createdAt' => pulse2_sanitize_date_to_iso($post->post_date),
    );
}

// Register Activity CPT
function pulse2_register_activity_cpt() {
    $labels = array(
        'name' => 'Activities',
        'singular_name' => 'Activity',
        'menu_name' => 'Activities',
        'add_new' => 'Add Activity',
        'add_new_item' => 'Add New Activity',
        'edit_item' => 'Edit Activity',
        'new_item' => 'New Activity',
        'view_item' => 'View Activity',
        'search_items' => 'Search Activities',
        'not_found' => 'No activities found',
        'not_found_in_trash' => 'No activities found in trash'
    );
    $args = array(
        'labels' => $labels,
        'public' => false,
        'show_ui' => true,
        'supports' => array('title', 'editor'),
        'show_in_rest' => true,
        'show_in_menu' => false, // Hide from main menu
        'hierarchical' => false,
        'capability_type' => 'post',
    );
    register_post_type('pulse2_activity', $args);
}
add_action('init', 'pulse2_register_activity_cpt');

// Register Activity Meta
function pulse2_register_activity_meta() {
    $meta_keys = array('activity_type', 'user_id', 'user_name', 'project_id', 'project_name', 'related_id');
    foreach ($meta_keys as $key) {
        register_post_meta('pulse2_activity', $key, array(
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string'
        ));
    }
}
add_action('init', 'pulse2_register_activity_meta');

// Settings Functions
function get_pulse2_settings_data() {
    return array(
        'app_url' => get_option('pulse2_app_url', ''),
        'admin_email' => get_option('pulse2_admin_email', get_option('admin_email')),
        'invitation_email_subject' => get_option('pulse2_invitation_email_subject', ''),
        'invitation_email_template' => get_option('pulse2_invitation_email_template', ''),
        'password_reset_email_subject' => get_option('pulse2_password_reset_email_subject', ''),
        'password_reset_email_template' => get_option('pulse2_password_reset_email_template', ''),
        'activity_navigation_enabled' => get_option('pulse2_activity_navigation_enabled', true),
        'activity_filters_enabled' => get_option('pulse2_activity_filters_enabled', true),
    );
}

function get_pulse2_settings($request) {
    return new WP_REST_Response(get_pulse2_settings_data(), 200);
}

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

// User Presence Functions
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

// === WORKSPACE SYSTEM DATABASE TABLES ===

// Create workspaces table
function create_workspaces_table_if_not_exists() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_workspaces';
    
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id varchar(36) NOT NULL,
            project_id varchar(50) NOT NULL,
            name varchar(255) NOT NULL,
            type enum('moodboard', 'whiteboard', 'workflow', 'timeline') NOT NULL,
            description text,
            created_by bigint(20) NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            is_archived tinyint(1) DEFAULT 0,
            collaborators longtext,
            settings longtext,
            PRIMARY KEY (id),
            KEY project_id (project_id),
            KEY created_by (created_by),
            KEY type (type)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

// Create workspace categories table
function create_workspace_categories_table_if_not_exists() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_workspace_categories';
    
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id varchar(36) NOT NULL,
            workspace_id varchar(36) NOT NULL,
            name varchar(255) NOT NULL,
            color varchar(7) DEFAULT '#3b82f6',
            sort_order int DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY workspace_id (workspace_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

// Create workspace images table
function create_workspace_images_table_if_not_exists() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_workspace_images';
    
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id varchar(36) NOT NULL,
            workspace_id varchar(36) NOT NULL,
            category_id varchar(36),
            media_id bigint(20) NOT NULL,
            filename varchar(255) NOT NULL,
            url varchar(500) NOT NULL,
            label varchar(255),
            uploaded_by bigint(20) NOT NULL,
            uploaded_at datetime DEFAULT CURRENT_TIMESTAMP,
            sort_order int DEFAULT 0,
            PRIMARY KEY (id),
            KEY workspace_id (workspace_id),
            KEY category_id (category_id),
            KEY media_id (media_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

// Create workspace pins table
function create_workspace_pins_table_if_not_exists() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_workspace_pins';
    
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id varchar(36) NOT NULL,
            image_id varchar(36) NOT NULL,
            x_position decimal(5,2) NOT NULL,
            y_position decimal(5,2) NOT NULL,
            note text,
            created_by bigint(20) NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            is_resolved tinyint(1) DEFAULT 0,
            resolved_by bigint(20) NULL,
            resolved_at datetime NULL,
            PRIMARY KEY (id),
            KEY image_id (image_id),
            KEY created_by (created_by)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

// Create workspace comments table
function create_workspace_comments_table_if_not_exists() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_workspace_comments';
    
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id varchar(36) NOT NULL,
            workspace_id varchar(36) NOT NULL,
            image_id varchar(36),
            pin_id varchar(36),
            comment text NOT NULL,
            created_by bigint(20) NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            parent_id varchar(36) NULL,
            PRIMARY KEY (id),
            KEY workspace_id (workspace_id),
            KEY image_id (image_id),
            KEY pin_id (pin_id),
            KEY created_by (created_by),
            KEY parent_id (parent_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

// Create workspace activities table
function create_workspace_activities_table_if_not_exists() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_workspace_activities';
    
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id varchar(36) NOT NULL,
            workspace_id varchar(36) NOT NULL,
            project_id varchar(50) NOT NULL,
            type varchar(50) NOT NULL,
            user_id bigint(20) NOT NULL,
            user_name varchar(100) NOT NULL,
            details longtext,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY workspace_id (workspace_id),
            KEY project_id (project_id),
            KEY type (type),
            KEY user_id (user_id),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

// === WORKFLOW SYSTEM DATABASE TABLES ===

// Create workflow stages table
function create_workflow_stages_table_if_not_exists() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_workflow_stages';
    
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id varchar(36) NOT NULL,
            workspace_id varchar(36) NOT NULL,
            name varchar(255) NOT NULL,
            description text,
            stage_order int NOT NULL DEFAULT 0,
            is_required tinyint(1) DEFAULT 1,
            assigned_to longtext,
            status enum('pending', 'in_progress', 'completed', 'skipped') DEFAULT 'pending',
            completed_at datetime NULL,
            completed_by bigint(20) NULL,
            estimated_hours decimal(5,2) DEFAULT 0,
            actual_hours decimal(5,2) DEFAULT 0,
            due_date datetime NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY workspace_id (workspace_id),
            KEY status (status),
            KEY stage_order (stage_order)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

// Create workflow checklist items table
function create_workflow_checklist_items_table_if_not_exists() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_workflow_checklist_items';
    
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id varchar(36) NOT NULL,
            stage_id varchar(36) NOT NULL,
            text text NOT NULL,
            description text,
            is_completed tinyint(1) DEFAULT 0,
            completed_by bigint(20) NULL,
            completed_at datetime NULL,
            estimated_hours decimal(5,2) DEFAULT 0,
            actual_hours decimal(5,2) DEFAULT 0,
            priority enum('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
            item_order int DEFAULT 0,
            attachments longtext,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY stage_id (stage_id),
            KEY is_completed (is_completed),
            KEY priority (priority)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

// Create workflow approvals table
function create_workflow_approvals_table_if_not_exists() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_workflow_approvals';
    
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id varchar(36) NOT NULL,
            stage_id varchar(36) NOT NULL,
            workspace_id varchar(36) NOT NULL,
            requested_by bigint(20) NOT NULL,
            requested_at datetime DEFAULT CURRENT_TIMESTAMP,
            approver_id bigint(20) NOT NULL,
            approval_type enum('sequential', 'parallel') DEFAULT 'sequential',
            status enum('pending', 'approved', 'rejected', 'delegated') DEFAULT 'pending',
            approved_at datetime NULL,
            comments text,
            attachments longtext,
            delegated_to bigint(20) NULL,
            deadline datetime NULL,
            approval_order int DEFAULT 0,
            PRIMARY KEY (id),
            KEY stage_id (stage_id),
            KEY workspace_id (workspace_id),
            KEY approver_id (approver_id),
            KEY status (status)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

// === TIMELINE SYSTEM DATABASE TABLES ===

// Create timeline tasks table
function create_timeline_tasks_table_if_not_exists() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_timeline_tasks';
    
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id varchar(36) NOT NULL,
            workspace_id varchar(36) NOT NULL,
            name varchar(255) NOT NULL,
            description text,
            start_date datetime NOT NULL,
            end_date datetime NOT NULL,
            status enum('not_started', 'in_progress', 'completed', 'on_hold', 'cancelled') DEFAULT 'not_started',
            priority enum('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
            progress_percentage int DEFAULT 0,
            estimated_hours decimal(8,2) DEFAULT 0,
            actual_hours decimal(8,2) DEFAULT 0,
            parent_task_id varchar(36) NULL,
            created_by bigint(20) NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY workspace_id (workspace_id),
            KEY status (status),
            KEY parent_task_id (parent_task_id),
            KEY start_date (start_date),
            KEY end_date (end_date)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

// Create timeline assignments table
function create_timeline_assignments_table_if_not_exists() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_timeline_assignments';
    
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id varchar(36) NOT NULL,
            task_id varchar(36) NOT NULL,
            user_id bigint(20) NOT NULL,
            role enum('owner', 'assignee', 'reviewer', 'observer') DEFAULT 'assignee',
            allocation_percentage int DEFAULT 100,
            assigned_at datetime DEFAULT CURRENT_TIMESTAMP,
            assigned_by bigint(20) NOT NULL,
            PRIMARY KEY (id),
            KEY task_id (task_id),
            KEY user_id (user_id),
            UNIQUE KEY unique_task_user_role (task_id, user_id, role)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

// Create timeline milestones table
function create_timeline_milestones_table_if_not_exists() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_timeline_milestones';
    
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id varchar(36) NOT NULL,
            workspace_id varchar(36) NOT NULL,
            name varchar(255) NOT NULL,
            description text,
            due_date datetime NOT NULL,
            status enum('pending', 'achieved', 'missed', 'cancelled') DEFAULT 'pending',
            color varchar(7) DEFAULT '#3b82f6',
            is_critical tinyint(1) DEFAULT 0,
            completion_percentage int DEFAULT 0,
            achieved_at datetime NULL,
            achieved_by bigint(20) NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY workspace_id (workspace_id),
            KEY due_date (due_date),
            KEY status (status)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

// Create timeline dependencies table
function create_timeline_dependencies_table_if_not_exists() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_timeline_dependencies';
    
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id varchar(36) NOT NULL,
            predecessor_task_id varchar(36) NOT NULL,
            successor_task_id varchar(36) NOT NULL,
            dependency_type enum('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish') DEFAULT 'finish_to_start',
            lag_hours decimal(8,2) DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY predecessor_task_id (predecessor_task_id),
            KEY successor_task_id (successor_task_id),
            UNIQUE KEY unique_dependency (predecessor_task_id, successor_task_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

// Initialize all workspace tables
function init_workspace_tables() {
    create_workspaces_table_if_not_exists();
    create_workspace_categories_table_if_not_exists();
    create_workspace_images_table_if_not_exists();
    create_workspace_pins_table_if_not_exists();
    create_workspace_comments_table_if_not_exists();
    create_workspace_activities_table_if_not_exists();
    
    // Initialize workflow tables
    create_workflow_stages_table_if_not_exists();
    create_workflow_checklist_items_table_if_not_exists();
    create_workflow_approvals_table_if_not_exists();
    
    // Initialize timeline tables
    create_timeline_tasks_table_if_not_exists();
    create_timeline_assignments_table_if_not_exists();
    create_timeline_milestones_table_if_not_exists();
    create_timeline_dependencies_table_if_not_exists();
}

// Hook table creation to activation
register_activation_hook(__FILE__, 'init_workspace_tables');

// === WORKSPACE API ENDPOINTS ===

// Register workspace REST API routes
function register_workspace_api_routes() {
    // Workspaces
    register_rest_route('pulse2/v1', '/workspaces', array(
        'methods' => 'GET',
        'callback' => 'get_workspaces',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workspaces', array(
        'methods' => 'POST',
        'callback' => 'create_workspace',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workspaces/(?P<id>[a-zA-Z0-9\-]+)', array(
        'methods' => 'GET',
        'callback' => 'get_workspace',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workspaces/(?P<id>[a-zA-Z0-9\-]+)', array(
        'methods' => 'PUT',
        'callback' => 'update_workspace',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workspaces/(?P<id>[a-zA-Z0-9\-]+)', array(
        'methods' => 'DELETE',
        'callback' => 'delete_workspace',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workspaces/project/(?P<project_id>[a-zA-Z0-9\-]+)', array(
        'methods' => 'GET',
        'callback' => 'get_workspaces_by_project',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));

    // Categories
    register_rest_route('pulse2/v1', '/workspaces/(?P<workspace_id>[a-zA-Z0-9\-]+)/categories', array(
        'methods' => 'GET',
        'callback' => 'get_workspace_categories',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workspaces/(?P<workspace_id>[a-zA-Z0-9\-]+)/categories', array(
        'methods' => 'POST',
        'callback' => 'create_workspace_category',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));

    // Images
    register_rest_route('pulse2/v1', '/workspaces/(?P<workspace_id>[a-zA-Z0-9\-]+)/images', array(
        'methods' => 'GET',
        'callback' => 'get_workspace_images',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workspaces/(?P<workspace_id>[a-zA-Z0-9\-]+)/images', array(
        'methods' => 'POST',
        'callback' => 'upload_workspace_image',
        'permission_callback' => function() { return current_user_can('upload_files'); }
    ));

    // Pins
    register_rest_route('pulse2/v1', '/workspace-images/(?P<image_id>[a-zA-Z0-9\-]+)/pins', array(
        'methods' => 'GET',
        'callback' => 'get_image_pins',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workspace-images/(?P<image_id>[a-zA-Z0-9\-]+)/pins', array(
        'methods' => 'POST',
        'callback' => 'create_image_pin',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workspace-pins/(?P<pin_id>[a-zA-Z0-9\-]+)', array(
        'methods' => 'PUT',
        'callback' => 'update_workspace_pin',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workspace-pins/(?P<pin_id>[a-zA-Z0-9\-]+)', array(
        'methods' => 'DELETE',
        'callback' => 'delete_workspace_pin',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));

    // Comments
    register_rest_route('pulse2/v1', '/workspaces/(?P<workspace_id>[a-zA-Z0-9\-]+)/comments', array(
        'methods' => 'GET',
        'callback' => 'get_workspace_comments',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workspaces/(?P<workspace_id>[a-zA-Z0-9\-]+)/comments', array(
        'methods' => 'POST',
        'callback' => 'create_workspace_comment',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));

    // Activities
    register_rest_route('pulse2/v1', '/workspace-activities', array(
        'methods' => 'POST',
        'callback' => 'create_workspace_activity',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workspace-activities/project/(?P<project_id>[a-zA-Z0-9\-]+)', array(
        'methods' => 'GET',
        'callback' => 'get_workspace_activities_by_project',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));

    // === WORKFLOW API ENDPOINTS ===
    
    // Workflow Stages
    register_rest_route('pulse2/v1', '/workspaces/(?P<workspace_id>[a-zA-Z0-9\-]+)/stages', array(
        'methods' => 'GET',
        'callback' => 'get_workflow_stages',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workspaces/(?P<workspace_id>[a-zA-Z0-9\-]+)/stages', array(
        'methods' => 'POST',
        'callback' => 'create_workflow_stage',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workflow-stages/(?P<stage_id>[a-zA-Z0-9\-]+)', array(
        'methods' => 'PUT',
        'callback' => 'update_workflow_stage',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workflow-stages/(?P<stage_id>[a-zA-Z0-9\-]+)', array(
        'methods' => 'DELETE',
        'callback' => 'delete_workflow_stage',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workflow-stages/(?P<stage_id>[a-zA-Z0-9\-]+)/complete', array(
        'methods' => 'POST',
        'callback' => 'complete_workflow_stage',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    // Workflow Checklist Items
    register_rest_route('pulse2/v1', '/workflow-stages/(?P<stage_id>[a-zA-Z0-9\-]+)/checklist', array(
        'methods' => 'GET',
        'callback' => 'get_stage_checklist_items',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workflow-stages/(?P<stage_id>[a-zA-Z0-9\-]+)/checklist', array(
        'methods' => 'POST',
        'callback' => 'create_checklist_item',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workflow-checklist/(?P<item_id>[a-zA-Z0-9\-]+)', array(
        'methods' => 'PUT',
        'callback' => 'update_checklist_item',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workflow-checklist/(?P<item_id>[a-zA-Z0-9\-]+)', array(
        'methods' => 'DELETE',
        'callback' => 'delete_checklist_item',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    // Workflow Approvals
    register_rest_route('pulse2/v1', '/workflow-approvals', array(
        'methods' => 'GET',
        'callback' => 'get_workflow_approvals',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workflow-approvals', array(
        'methods' => 'POST',
        'callback' => 'create_workflow_approval',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workflow-approvals/(?P<approval_id>[a-zA-Z0-9\-]+)', array(
        'methods' => 'PUT',
        'callback' => 'update_workflow_approval',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));

    // === TIMELINE API ENDPOINTS ===
    
    // Timeline Tasks
    register_rest_route('pulse2/v1', '/workspaces/(?P<workspace_id>[a-zA-Z0-9\-]+)/timeline-tasks', array(
        'methods' => 'GET',
        'callback' => 'get_timeline_tasks',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workspaces/(?P<workspace_id>[a-zA-Z0-9\-]+)/timeline-tasks', array(
        'methods' => 'POST',
        'callback' => 'create_timeline_task',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/timeline-tasks/(?P<task_id>[a-zA-Z0-9\-]+)', array(
        'methods' => 'PUT',
        'callback' => 'update_timeline_task',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/timeline-tasks/(?P<task_id>[a-zA-Z0-9\-]+)', array(
        'methods' => 'DELETE',
        'callback' => 'delete_timeline_task',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    // Timeline Assignments
    register_rest_route('pulse2/v1', '/timeline-assignments', array(
        'methods' => 'GET',
        'callback' => 'get_timeline_assignments',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/timeline-assignments', array(
        'methods' => 'POST',
        'callback' => 'create_timeline_assignment',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    // Timeline Milestones
    register_rest_route('pulse2/v1', '/workspaces/(?P<workspace_id>[a-zA-Z0-9\-]+)/milestones', array(
        'methods' => 'GET',
        'callback' => 'get_timeline_milestones',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/workspaces/(?P<workspace_id>[a-zA-Z0-9\-]+)/milestones', array(
        'methods' => 'POST',
        'callback' => 'create_timeline_milestone',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    // Timeline Dependencies
    register_rest_route('pulse2/v1', '/timeline-dependencies', array(
        'methods' => 'GET',
        'callback' => 'get_timeline_dependencies',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));
    
    register_rest_route('pulse2/v1', '/timeline-dependencies', array(
        'methods' => 'POST',
        'callback' => 'create_timeline_dependency',
        'permission_callback' => function() { return current_user_can('edit_posts'); }
    ));

    // Attach image
    register_rest_route('pulse2/v1', '/workspaces/(?P<workspace_id>[a-zA-Z0-9\-]+)/images/attach', array(
        'methods' => 'POST',
        'callback' => 'attach_workspace_image',
        'permission_callback' => function() { return current_user_can('upload_files'); }
    ));
}
add_action('rest_api_init', 'register_workspace_api_routes');

// === WORKSPACE API FUNCTIONS ===

// Generate UUID
function generate_uuid() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// Workspaces (CPT-backed)
function get_workspaces($request) {
    $project_id = $request->get_param('project_id');
    $args = array(
        'post_type' => 'pulse2_workspace',
        'posts_per_page' => -1,
        'orderby' => 'date',
        'order' => 'DESC',
        'meta_query' => array()
    );
    if ($project_id) {
        $args['meta_query'][] = array(
            'key' => 'pulse2_project_id',
            'value' => $project_id,
            'compare' => '='
        );
    }
    $query = new WP_Query($args);
    $workspaces = array();
    foreach ($query->posts as $post) {
        $workspaces[] = pulse2_workspace_post_to_array($post);
    }
    return rest_ensure_response($workspaces);
}

function get_workspaces_by_project($request) {
    $project_id = $request->get_param('project_id');
    $args = array(
        'post_type' => 'pulse2_workspace',
        'posts_per_page' => -1,
        'orderby' => 'date',
        'order' => 'DESC',
        'meta_query' => array(
            array(
                'key' => 'pulse2_project_id',
                'value' => $project_id,
                'compare' => '='
            )
        )
    );
    $query = new WP_Query($args);
    $workspaces = array();
    foreach ($query->posts as $post) {
        $workspaces[] = pulse2_workspace_post_to_array($post);
    }
    return rest_ensure_response($workspaces);
}

function create_workspace($request) {
    global $wpdb;
    $data = $request->get_json_params();
    $workspace_id = generate_uuid();
    $current_user = wp_get_current_user();

    // Create CPT post
    $post_id = wp_insert_post(array(
        'post_type' => 'pulse2_workspace',
        'post_title' => sanitize_text_field($data['name']),
        'post_status' => 'publish',
        'post_author' => $current_user->ID,
        'post_name' => $workspace_id
    ));
    if (is_wp_error($post_id)) {
        return new WP_Error('creation_failed', 'Failed to create workspace', array('status' => 500));
    }
    // Save meta
    update_post_meta($post_id, 'pulse2_workspace_uuid', $workspace_id);
    update_post_meta($post_id, 'pulse2_project_id', sanitize_text_field($data['projectId']));
    update_post_meta($post_id, 'pulse2_workspace_type', sanitize_text_field($data['type']));
    update_post_meta($post_id, 'pulse2_description', sanitize_textarea_field($data['description'] ?? ''));
    update_post_meta($post_id, 'pulse2_is_archived', 0);
    update_post_meta($post_id, 'pulse2_collaborators', json_encode($data['collaborators'] ?? array()));
    update_post_meta($post_id, 'pulse2_settings', json_encode($data['settings'] ?? array()));

    // Sync to legacy table (compat)
    $table_name = $wpdb->prefix . 'pulse2_workspaces';
    $wpdb->insert(
        $table_name,
        array(
            'id' => $workspace_id,
            'project_id' => sanitize_text_field($data['projectId']),
            'name' => sanitize_text_field($data['name']),
            'type' => sanitize_text_field($data['type']),
            'description' => sanitize_textarea_field($data['description'] ?? ''),
            'created_by' => $current_user->ID,
            'collaborators' => json_encode($data['collaborators'] ?? array()),
            'settings' => json_encode($data['settings'] ?? array())
        )
    );

    // Log activity
    log_workspace_activity($workspace_id, $data['projectId'], 'workspace_created', $current_user->ID, $current_user->display_name, array(
        'workspaceName' => $data['name'],
        'workspaceType' => $data['type']
    ));

    return rest_ensure_response(array(
        'id' => $workspace_id,
        'projectId' => $data['projectId'],
        'name' => $data['name'],
        'type' => $data['type'],
        'description' => $data['description'] ?? '',
        'createdBy' => $current_user->ID,
        'createdAt' => current_time('c'),
        'updatedAt' => current_time('c'),
        'isArchived' => false,
        'collaborators' => $data['collaborators'] ?? array(),
        'settings' => $data['settings'] ?? array()
    ));
}

function pulse2_find_workspace_post_id_by_uuid($uuid) {
    $query = new WP_Query(array(
        'post_type' => 'pulse2_workspace',
        'posts_per_page' => 1,
        'meta_key' => 'pulse2_workspace_uuid',
        'meta_value' => $uuid
    ));
    if (!empty($query->posts)) {
        return $query->posts[0]->ID;
    }
    return 0;
}

function get_workspace($request) {
    $id = $request->get_param('id');
    $post_id = pulse2_find_workspace_post_id_by_uuid($id);
    if (!$post_id) {
        return new WP_Error('not_found', 'Workspace not found', array('status' => 404));
    }
    $post = get_post($post_id);
    return rest_ensure_response(pulse2_workspace_post_to_array($post));
}

function update_workspace($request) {
    global $wpdb;
    $id = $request->get_param('id');
    $data = $request->get_json_params();

    $post_id = pulse2_find_workspace_post_id_by_uuid($id);
    if (!$post_id) {
        return new WP_Error('not_found', 'Workspace not found', array('status' => 404));
    }

    if (isset($data['name'])) {
        wp_update_post(array('ID' => $post_id, 'post_title' => sanitize_text_field($data['name'])));
    }
    if (isset($data['description'])) {
        update_post_meta($post_id, 'pulse2_description', sanitize_textarea_field($data['description']));
    }
    if (isset($data['isArchived'])) {
        update_post_meta($post_id, 'pulse2_is_archived', intval($data['isArchived']) ? 1 : 0);
    }
    if (isset($data['collaborators'])) {
        update_post_meta($post_id, 'pulse2_collaborators', json_encode($data['collaborators']));
    }
    if (isset($data['settings'])) {
        update_post_meta($post_id, 'pulse2_settings', json_encode($data['settings']));
    }

    // Sync to legacy table (best-effort)
    $table_name = $wpdb->prefix . 'pulse2_workspaces';
    $fields = array();
    $formats = array();
    if (isset($data['name'])) { $fields['name'] = sanitize_text_field($data['name']); $formats[] = '%s'; }
    if (isset($data['description'])) { $fields['description'] = sanitize_textarea_field($data['description']); $formats[] = '%s'; }
    if (isset($data['isArchived'])) { $fields['is_archived'] = intval($data['isArchived']) ? 1 : 0; $formats[] = '%d'; }
    if (isset($data['collaborators'])) { $fields['collaborators'] = json_encode($data['collaborators']); $formats[] = '%s'; }
    if (isset($data['settings'])) { $fields['settings'] = json_encode($data['settings']); $formats[] = '%s'; }
    if (!empty($fields)) {
        $wpdb->update($table_name, $fields, array('id' => $id), $formats, array('%s'));
    }

    $post = get_post($post_id);
    return rest_ensure_response(pulse2_workspace_post_to_array($post));
}

function delete_workspace($request) {
    global $wpdb;
    $id = $request->get_param('id');
    $post_id = pulse2_find_workspace_post_id_by_uuid($id);
    if (!$post_id) {
        return new WP_Error('not_found', 'Workspace not found', array('status' => 404));
    }
    wp_delete_post($post_id, true);

    // Sync delete to legacy table
    $table_name = $wpdb->prefix . 'pulse2_workspaces';
    $wpdb->delete($table_name, array('id' => $id), array('%s'));

    return rest_ensure_response(array('success' => true));
}

// Implement attach_workspace_image
function attach_workspace_image($request) {
    global $wpdb;
    $workspace_id = $request->get_param('workspace_id');
    $data = $request->get_json_params();
    $attachment_id = isset($data['attachment_id']) ? intval($data['attachment_id']) : 0;
    $category_id = isset($data['category_id']) ? sanitize_text_field($data['category_id']) : '';

    if (!$workspace_id || !$attachment_id) {
        return new WP_Error('invalid_params', 'Missing workspace_id or attachment_id', array('status' => 400));
    }

    $images_table = $wpdb->prefix . 'pulse2_workspace_images';

    // Fetch media attachment for URL and filename
    $src = wp_get_attachment_image_src($attachment_id, 'full');
    $url = is_array($src) ? $src[0] : wp_get_attachment_url($attachment_id);
    $filename = get_the_title($attachment_id);

    if (!$url) {
        return new WP_Error('not_found', 'Attachment not found', array('status' => 404));
    }

    $image_id = wp_generate_uuid4();
    $result = $wpdb->insert(
        $images_table,
        array(
            'id' => $image_id,
            'workspace_id' => sanitize_text_field($workspace_id),
            'media_id' => $attachment_id,
            'category_id' => $category_id,
            'url' => $url,
            'filename' => $filename,
            'uploaded_by' => get_current_user_id(),
            'uploaded_at' => current_time('mysql')
        ),
        array('%s','%s','%d','%s','%s','%s','%d','%s')
    );

    if ($result === false) {
        return new WP_Error('insert_failed', 'Failed to create workspace image', array('status' => 500));
    }

    return rest_ensure_response(array(
        'id' => $image_id,
        'imageUrl' => $url,
        'filename' => $filename,
        'attachmentId' => $attachment_id
    ));
}

// Make get_image_pins return [] when no rows
function get_image_pins($request) {
    global $wpdb;
    $image_id = $request->get_param('image_id');
    $pins_table = $wpdb->prefix . 'pulse2_workspace_pins';

    $results = $wpdb->get_results($wpdb->prepare("SELECT * FROM $pins_table WHERE image_id = %s ORDER BY created_at ASC", $image_id));
    if (!is_array($results)) {
        return rest_ensure_response(array());
    }

    $pins = array();
    foreach ($results as $row) {
        $pins[] = array(
            'id' => $row->id,
            'imageId' => $row->image_id,
            'x' => floatval($row->x_position),
            'y' => floatval($row->y_position),
            'note' => $row->note,
            'isResolved' => (bool)$row->is_resolved,
            'createdAt' => pulse2_sanitize_date_to_iso($row->created_at)
        );
    }
    return rest_ensure_response($pins);
}

function get_workspace_comments($request) {
    global $wpdb;
    $workspace_id = $request->get_param('workspace_id');
    $comments_table = $wpdb->prefix . 'pulse2_workspace_comments';

    $results = $wpdb->get_results($wpdb->prepare("SELECT * FROM $comments_table WHERE workspace_id = %s ORDER BY created_at ASC", $workspace_id));
    if (!is_array($results)) {
        return rest_ensure_response(array());
    }

    $comments = array();
    foreach ($results as $row) {
        $comments[] = array(
            'id' => $row->id,
            'workspaceId' => $row->workspace_id,
            'imageId' => $row->image_id,
            'pinId' => $row->pin_id,
            'text' => $row->comment,
            'createdBy' => (int)$row->created_by,
            'createdAt' => pulse2_sanitize_date_to_iso($row->created_at)
        );
    }
    return rest_ensure_response($comments);
}

// ... existing code ...
function pulse2_register_workspace_cpt() {
    $labels = array(
        'name' => 'Workspaces',
        'singular_name' => 'Workspace',
        'add_new' => 'Add New',
        'add_new_item' => 'Add New Workspace',
        'edit_item' => 'Edit Workspace',
        'new_item' => 'New Workspace',
        'view_item' => 'View Workspace',
        'search_items' => 'Search Workspaces',
        'not_found' => 'No workspaces found',
        'not_found_in_trash' => 'No workspaces found in trash'
    );
    $args = array(
        'labels' => $labels,
        'public' => false,
        'show_ui' => true,
        'show_in_menu' => 'edit.php?post_type=pulse2_project',
        'supports' => array('title'),
        'show_in_rest' => true,
        'hierarchical' => false,
        'capability_type' => 'post'
    );
    register_post_type('pulse2_workspace', $args);
}
add_action('init', 'pulse2_register_workspace_cpt');

// Extend admin submenus with Workspaces and type filters
add_action('admin_menu', function() {
    // Link to all workspaces
    add_submenu_page(
        'edit.php?post_type=pulse2_project',
        'Workspaces',
        'Workspaces',
        'edit_posts',
        'edit.php?post_type=pulse2_workspace'
    );
    // Quick filtered views for each type via query arg
    add_submenu_page(
        'edit.php?post_type=pulse2_project',
        'Moodboards',
        'Moodboards',
        'edit_posts',
        'edit.php?post_type=pulse2_workspace&workspace_type=moodboard'
    );
    add_submenu_page(
        'edit.php?post_type=pulse2_project',
        'Whiteboards',
        'Whiteboards',
        'edit_posts',
        'edit.php?post_type=pulse2_workspace&workspace_type=whiteboard'
    );
    add_submenu_page(
        'edit.php?post_type=pulse2_project',
        'Workflows',
        'Workflows',
        'edit_posts',
        'edit.php?post_type=pulse2_workspace&workspace_type=workflow'
    );
    add_submenu_page(
        'edit.php?post_type=pulse2_project',
        'Timelines',
        'Timelines',
        'edit_posts',
        'edit.php?post_type=pulse2_workspace&workspace_type=timeline'
    );
});

// Admin list filter for workspace_type query arg
add_action('pre_get_posts', function($query) {
    if (!is_admin() || !$query->is_main_query()) {
        return;
    }
    $post_type = $query->get('post_type');
    if ($post_type === 'pulse2_workspace' && isset($_GET['workspace_type']) && $_GET['workspace_type']) {
        $type = sanitize_text_field($_GET['workspace_type']);
        $meta_query = (array) $query->get('meta_query');
        $meta_query[] = array(
            'key' => 'pulse2_workspace_type',
            'value' => $type,
            'compare' => '='
        );
        $query->set('meta_query', $meta_query);
    }
});
// ... existing code ...

// Helper: map workspace CPT post to API shape
function pulse2_workspace_post_to_array(WP_Post $post) {
    $uuid = get_post_meta($post->ID, 'pulse2_workspace_uuid', true) ?: $post->post_name;
    $project_id = get_post_meta($post->ID, 'pulse2_project_id', true) ?: '';
    $type = get_post_meta($post->ID, 'pulse2_workspace_type', true) ?: '';
    $description = get_post_meta($post->ID, 'pulse2_description', true) ?: '';
    $collaborators = get_post_meta($post->ID, 'pulse2_collaborators', true);
    $settings = get_post_meta($post->ID, 'pulse2_settings', true);
    $is_archived = (int)get_post_meta($post->ID, 'pulse2_is_archived', true) === 1;

    return array(
        'id' => $uuid,
        'projectId' => $project_id,
        'name' => $post->post_title,
        'type' => $type,
        'description' => $description,
        'createdBy' => (int)$post->post_author,
        'createdAt' => pulse2_sanitize_date_to_iso($post->post_date_gmt ?: $post->post_date),
        'updatedAt' => pulse2_sanitize_date_to_iso($post->post_modified_gmt ?: $post->post_modified),
        'isArchived' => $is_archived,
        'collaborators' => $collaborators ? (is_array($collaborators) ? $collaborators : json_decode($collaborators, true)) : array(),
        'settings' => $settings ? (is_array($settings) ? $settings : json_decode($settings, true)) : array(),
    );
}

// List workspace images
function get_workspace_images($request) {
    global $wpdb;
    $workspace_id = $request->get_param('workspace_id');
    $table_name = $wpdb->prefix . 'pulse2_workspace_images';

    $results = $wpdb->get_results($wpdb->prepare("SELECT * FROM $table_name WHERE workspace_id = %s ORDER BY uploaded_at DESC, id DESC", $workspace_id));
    if (!is_array($results)) {
        return rest_ensure_response(array());
    }
    $images = array();
    foreach ($results as $row) {
        $images[] = array(
            'id' => $row->id,
            'workspaceId' => $row->workspace_id,
            'categoryId' => $row->category_id,
            'mediaId' => $row->media_id ? intval($row->media_id) : null,
            'filename' => $row->filename,
            'url' => $row->url,
            'uploadedBy' => intval($row->uploaded_by),
            'uploadedAt' => $row->uploaded_at ? pulse2_sanitize_date_to_iso($row->uploaded_at) : null,
        );
    }
    return rest_ensure_response($images);
}

// Upload workspace image
function upload_workspace_image($request) {
    $workspace_id = $request->get_param('workspace_id');
    $category_id = $request->get_param('category_id');

    if (!function_exists('wp_handle_upload')) {
        require_once(ABSPATH . 'wp-admin/includes/file.php');
    }

    $uploaded_file = $_FILES['file'] ?? null;
    if (!$uploaded_file) {
        return new WP_Error('no_file', 'No file uploaded', array('status' => 400));
    }

    $upload_overrides = array('test_form' => false);
    $movefile = wp_handle_upload($uploaded_file, $upload_overrides);

    if ($movefile && !isset($movefile['error'])) {
        // Create attachment
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

            // Save to workspace images table
            global $wpdb;
            $table_name = $wpdb->prefix . 'pulse2_workspace_images';
            $current_user = wp_get_current_user();
            $image_id = generate_uuid();

            $result = $wpdb->insert(
                $table_name,
                array(
                    'id' => $image_id,
                    'workspace_id' => $workspace_id,
                    'category_id' => $category_id,
                    'media_id' => $attachment_id,
                    'filename' => sanitize_file_name($uploaded_file['name']),
                    'url' => $movefile['url'],
                    'uploaded_by' => $current_user->ID,
                    'uploaded_at' => current_time('mysql')
                )
            );

            if ($result !== false) {
                // Log activity
                log_workspace_activity($workspace_id, '', 'workspace_image_uploaded', $current_user->ID, $current_user->display_name, array(
                    'imageId' => $image_id,
                    'imageName' => $uploaded_file['name']
                ));

                return rest_ensure_response(array(
                    'id' => $image_id,
                    'workspaceId' => $workspace_id,
                    'categoryId' => $category_id,
                    'mediaId' => $attachment_id,
                    'filename' => $uploaded_file['name'],
                    'url' => $movefile['url'],
                    'uploadedBy' => $current_user->ID,
                    'uploadedAt' => current_time('c')
                ));
            }
        }
    }

    return new WP_Error('upload_failed', 'Failed to upload image', array('status' => 500));
}

// List workspace categories
function get_workspace_categories($request) {
    global $wpdb;
    $workspace_id = $request->get_param('workspace_id');
    $table_name = $wpdb->prefix . 'pulse2_workspace_categories';

    $results = $wpdb->get_results($wpdb->prepare("SELECT * FROM $table_name WHERE workspace_id = %s ORDER BY name ASC", $workspace_id));
    if (!is_array($results)) {
        return rest_ensure_response(array());
    }
    $categories = array();
    foreach ($results as $row) {
        $categories[] = array(
            'id' => $row->id,
            'workspaceId' => $row->workspace_id,
            'name' => $row->name,
            'color' => $row->color,
            'createdAt' => $row->created_at ? pulse2_sanitize_date_to_iso($row->created_at) : null,
        );
    }
    return rest_ensure_response($categories);
}

// Create workspace category
function create_workspace_category($request) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'pulse2_workspace_categories';

    $workspace_id = $request->get_param('workspace_id');
    $data = $request->get_json_params();
    $category_id = generate_uuid();

    $result = $wpdb->insert(
        $table_name,
        array(
            'id' => $category_id,
            'workspace_id' => $workspace_id,
            'name' => sanitize_text_field($data['name']),
            'color' => sanitize_hex_color($data['color'] ?? '#3b82f6'),
            'created_at' => current_time('mysql')
        )
    );

    if ($result === false) {
        return new WP_Error('creation_failed', 'Failed to create category', array('status' => 500));
    }

    return rest_ensure_response(array(
        'id' => $category_id,
        'workspaceId' => $workspace_id,
        'name' => $data['name'],
        'color' => $data['color'] ?? '#3b82f6',
        'createdAt' => current_time('c')
    ));
}