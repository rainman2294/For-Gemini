<?php
/**
 * Plugin Name:       Power Outage Scheduler
 * Description:       A timeline dashboard to view and manage team power outages and other events. Use the shortcode [power_outage_dashboard] on any page.
 * Version:           2.4.0
 * Author:            Gemini & User
 */

// Prevent direct file access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Enqueue scripts and styles.
 */
function pos_enqueue_assets() {
    global $post;
    if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'power_outage_dashboard')) {
        wp_enqueue_script('pos-tailwindcss', 'https://cdn.tailwindcss.com', array(), '3.3.3', false);
        
        // Enqueue PDF generation libraries
        wp_enqueue_script('pos-jspdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', array(), '2.5.1', true);
        wp_enqueue_script('pos-jspdf-autotable', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js', array('pos-jspdf'), '3.5.23', true);

        wp_enqueue_style('pos-styles', plugin_dir_url(__FILE__) . 'pos-styles.css', array(), '2.4.0');
        wp_enqueue_script('pos-scripts', plugin_dir_url(__FILE__) . 'pos-scripts.js', array('pos-jspdf', 'pos-jspdf-autotable'), '2.4.0', true);

        wp_localize_script('pos-scripts', 'pos_data', array(
            'api_url'  => rest_url('pos/v1/'),
        ));
    }
}
add_action('wp_enqueue_scripts', 'pos_enqueue_assets');

/**
 * Register the shortcode to display the dashboard.
 */
function pos_dashboard_shortcode() {
    ob_start(); ?>
    <div id="app" class="max-w-full mx-auto relative">
        <div class="text-center p-8">Loading Dashboard...</div>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('power_outage_dashboard', 'pos_dashboard_shortcode');

/**
 * Permission callback that works with standard JWT Authentication plugin
 */
function pos_jwt_permission_check(WP_REST_Request $request) {
    $auth_header = $request->get_header('authorization');
    error_log('POS Debug - Authorization header: ' . ($auth_header ? 'Present' : 'Missing'));
    
    if (!$auth_header) {
        return new WP_Error('jwt_auth_failed', 'Authorization header not found.', array('status' => 401));
    }

    if (strpos($auth_header, 'Bearer ') !== 0) {
        error_log('POS Debug - Invalid authorization header format: ' . substr($auth_header, 0, 20));
        return new WP_Error('jwt_auth_failed', 'Invalid authorization header format.', array('status' => 401));
    }
    $token = substr($auth_header, 7);
    error_log('POS Debug - Token length: ' . strlen($token));

    $token_parts = explode('.', $token);
    if (count($token_parts) !== 3) {
        error_log('POS Debug - Invalid token format, parts count: ' . count($token_parts));
        return new WP_Error('jwt_auth_failed', 'Invalid token format.', array('status' => 403));
    }
    try {
        $payload = json_decode(base64_decode(str_pad(strtr($token_parts[1], '-_', '+/'), strlen($token_parts[1]) % 4, '=', STR_PAD_RIGHT)), true);
        error_log('POS Debug - Payload decoded: ' . ($payload ? 'Success' : 'Failed'));
        
        if (!$payload || !isset($payload['data']['user']['id'])) {
            error_log('POS Debug - Invalid payload structure: ' . json_encode($payload));
            return new WP_Error('jwt_auth_failed', 'Invalid token payload.', array('status' => 403));
        }
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            error_log('POS Debug - Token expired. Exp: ' . $payload['exp'] . ', Now: ' . time());
            return new WP_Error('jwt_auth_failed', 'Token has expired.', array('status' => 403));
        }
        $user_id = $payload['data']['user']['id'];
        error_log('POS Debug - Successfully authenticated user: ' . $user_id);
        $request->set_param('decoded_user_id', $user_id);
        return true;
    } catch (Exception $e) {
        error_log('POS Debug - Token validation exception: ' . $e->getMessage());
        return new WP_Error('jwt_auth_failed', 'Token validation failed: ' . $e->getMessage(), array('status' => 403));
    }
}

/**
 * Register custom REST API endpoints.
 */
function pos_register_api_routes() {
    register_rest_route('pos/v1', '/schedule/weekly', array(
        'methods' => 'GET',
        'callback' => 'pos_get_weekly_schedule_data',
        'permission_callback' => 'pos_jwt_permission_check'
    ));
    
    // New endpoint for monthly data
    register_rest_route('pos/v1', '/schedule/monthly', array(
        'methods' => 'GET',
        'callback' => 'pos_get_monthly_schedule_data',
        'permission_callback' => 'pos_jwt_permission_check'
    ));

    register_rest_route('pos/v1', '/schedule', array(
        'methods' => 'POST',
        'callback' => 'pos_save_schedule_data',
        'permission_callback' => 'pos_jwt_permission_check'
    ));
    
    register_rest_route('pos/v1', '/debug', array(
        'methods' => 'GET',
        'callback' => 'pos_debug_info',
        'permission_callback' => 'pos_jwt_permission_check'
    ));
}
add_action('rest_api_init', 'pos_register_api_routes');

/**
 * Callback function to get all schedule data for a specific week.
 */
function pos_get_weekly_schedule_data(WP_REST_Request $request) {
    error_log('POS Debug - Getting schedule data for a specific week');

    $start_date_param = $request->get_param('start_date');
    try {
        if ($start_date_param && preg_match('/^\d{4}-\d{2}-\d{2}$/', $start_date_param)) {
            $start_of_week = new DateTime($start_date_param);
        } else {
            $start_of_week = new DateTime('monday this week');
        }
    } catch (Exception $e) {
        $start_of_week = new DateTime('monday this week');
    }

    $week_dates = [];
    $current_day = clone $start_of_week;
    for ($i = 0; $i < 6; $i++) {
        $week_dates[] = $current_day->format('Y-m-d');
        $current_day->modify('+1 day');
    }
    
    $users = get_users(array('fields' => array('ID', 'display_name')));
    $users_data = array();
    $events_data = array();
    $colors = ['#6366f1', '#ec4899', '#3b82f6', '#f97316', '#14b8a6', '#8b5cf6', '#eab308', '#d946ef', '#6b7280'];
    $color_index = 0;

    foreach ($users as $user) {
        $name_parts = explode(' ', $user->display_name);
        $initials = count($name_parts) > 1 ? strtoupper(substr($name_parts[0], 0, 1) . substr(end($name_parts), 0, 1)) : strtoupper(substr($user->display_name, 0, 2));
        
        $users_data[] = array('id' => (int)$user->ID, 'name' => $user->display_name, 'initials' => $initials, 'color' => $colors[$color_index % count($colors)]);
        $color_index++;

        $all_user_events = get_user_meta($user->ID, 'schedule_events', true);
        if (is_array($all_user_events) && !empty($all_user_events)) {
            foreach ($all_user_events as $event) {
                if (isset($event['day']) && in_array($event['day'], $week_dates, true)) {
                    $events_data[] = $event;
                }
            }
        }
    }
    
    return new WP_REST_Response(array('users' => $users_data, 'events' => $events_data), 200);
}

/**
 * NEW: Callback function to get all schedule data for a specific month.
 */
function pos_get_monthly_schedule_data(WP_REST_Request $request) {
    error_log('POS Debug - Getting schedule data for a specific month');

    $month_param = $request->get_param('month'); // Expects 'YYYY-MM' format
    try {
        if ($month_param && preg_match('/^\d{4}-\d{2}$/', $month_param)) {
            $start_of_month = new DateTime($month_param . '-01');
        } else {
            $start_of_month = new DateTime('first day of this month');
        }
    } catch (Exception $e) {
        $start_of_month = new DateTime('first day of this month');
    }

    $end_of_month = clone $start_of_month;
    $end_of_month->modify('last day of this month');

    $users = get_users(array('fields' => array('ID', 'display_name')));
    $users_data = array();
    $events_data = array();
    $colors = ['#6366f1', '#ec4899', '#3b82f6', '#f97316', '#14b8a6', '#8b5cf6', '#eab308', '#d946ef', '#6b7280'];
    $color_index = 0;

    foreach ($users as $user) {
        $name_parts = explode(' ', $user->display_name);
        $initials = count($name_parts) > 1 ? strtoupper(substr($name_parts[0], 0, 1) . substr(end($name_parts), 0, 1)) : strtoupper(substr($user->display_name, 0, 2));
        
        $users_data[] = array('id' => (int)$user->ID, 'name' => $user->display_name, 'initials' => $initials, 'color' => $colors[$color_index % count($colors)]);
        $color_index++;

        $all_user_events = get_user_meta($user->ID, 'schedule_events', true);
        if (is_array($all_user_events) && !empty($all_user_events)) {
            foreach ($all_user_events as $event) {
                if (isset($event['day'])) {
                    try {
                        $event_date = new DateTime($event['day']);
                        if ($event_date >= $start_of_month && $event_date <= $end_of_month) {
                            $events_data[] = $event;
                        }
                    } catch (Exception $e) {
                        // Ignore invalid date formats in events
                    }
                }
            }
        }
    }
    
    return new WP_REST_Response(array('users' => $users_data, 'events' => $events_data), 200);
}


/**
 * Callback function to save a user's schedule data for a specific event type and week.
 */
function pos_save_schedule_data(WP_REST_Request $request) {
    $decoded_user_id = $request->get_param('decoded_user_id');
    $events_to_save = $request->get_param('events');
    $event_type_being_saved = $request->get_param('eventType');
    $week_start_date = $request->get_param('weekStartDate');

    if (!$decoded_user_id) { return new WP_Error('permission_denied', 'Could not identify authenticated user.', array('status' => 403)); }
    if (!is_array($events_to_save)) { return new WP_Error('invalid_data', 'Events must be an array.', array('status' => 400)); }
    if (empty($event_type_being_saved)) { return new WP_Error('invalid_data', 'Event type must be specified.', array('status' => 400)); }
    if (empty($week_start_date) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $week_start_date)) { return new WP_Error('invalid_data', 'A valid week start date must be specified.', array('status' => 400)); }

    try {
        $request_date_obj = new DateTime($week_start_date);
        $monday_this_week = new DateTime('monday this week');
        $monday_last_week = new DateTime('monday last week');
        $request_date_obj->setTime(0,0,0);
        $monday_this_week->setTime(0,0,0);
        $monday_last_week->setTime(0,0,0);
        
        if ($request_date_obj != $monday_this_week && $request_date_obj != $monday_last_week) {
            return new WP_Error('editing_restricted', 'Schedules can only be edited for the current and previous week.', array('status' => 403));
        }
    } catch (Exception $e) {
        return new WP_Error('invalid_date', 'There was an issue processing the week date.', array('status' => 400));
    }

    try {
        $start_of_week = new DateTime($week_start_date);
    } catch (Exception $e) {
        return new WP_Error('invalid_data', 'Invalid week start date format.', array('status' => 400));
    }
    
    $week_dates_to_replace = [];
    $current_day = clone $start_of_week;
    for ($i = 0; $i < 6; $i++) {
        $week_dates_to_replace[] = $current_day->format('Y-m-d');
        $current_day->modify('+1 day');
    }

    $all_existing_events = get_user_meta($decoded_user_id, 'schedule_events', true);
    if (!is_array($all_existing_events)) {
        $all_existing_events = array();
    }

    $events_to_keep = array_filter($all_existing_events, function($event) use ($week_dates_to_replace, $event_type_being_saved) {
        if (!isset($event['day'], $event['type'])) return true;
        $is_in_week = in_array($event['day'], $week_dates_to_replace, true);
        $is_same_type = $event['type'] === $event_type_being_saved;
        return !($is_in_week && $is_same_type);
    });
    
    $final_events = array_values($events_to_keep);
    foreach ($events_to_save as $event) {
        if (!isset($event['id'], $event['userId'], $event['type'], $event['day'], $event['start'], $event['end'])) {
            continue;
        }
        $final_events[] = array(
            'id'    => sanitize_text_field($event['id']),
            'userId'=> (int) $event['userId'],
            'type'  => sanitize_text_field($event['type']),
            'day'   => sanitize_text_field($event['day']),
            'start' => (int) $event['start'],
            'end'   => (int) $event['end'],
        );
    }
    
    $result = update_user_meta($decoded_user_id, 'schedule_events', $final_events);
    
    return new WP_REST_Response(array(
        'status' => 'success',
        'saved_events_count' => count($final_events),
        'event_type' => $event_type_being_saved
    ), 200);
}

/**
 * Debug function to help troubleshoot issues
 */
function pos_debug_info(WP_REST_Request $request) {
    $decoded_user_id = $request->get_param('decoded_user_id');
    
    $current_events = get_user_meta($decoded_user_id, 'schedule_events', true);
    if (!is_array($current_events)) {
        $current_events = array();
    }
    
    return new WP_REST_Response(array(
        'user_id' => $decoded_user_id,
        'current_events_count' => count($current_events),
        'current_events' => $current_events,
        'php_version' => PHP_VERSION,
        'memory_limit' => ini_get('memory_limit'),
        'max_execution_time' => ini_get('max_execution_time'),
        'wordpress_version' => get_bloginfo('version')
    ), 200);
}
