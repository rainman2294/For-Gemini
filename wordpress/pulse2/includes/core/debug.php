<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

if (!function_exists('pulse2_debug_log')) {
    function pulse2_debug_log($message, $data = null) {
        $log_message = '[PULSE2 DEBUG] ' . date('Y-m-d H:i:s') . ' - ' . $message;
        if ($data !== null) {
            $log_message .= ' | Data: ' . print_r($data, true);
        }
        @error_log($log_message);
        $base_dir = function_exists('plugin_dir_path') ? plugin_dir_path(__FILE__) : __DIR__ . '/';
        @file_put_contents($base_dir . 'pulse2-debug.log', $log_message . PHP_EOL, FILE_APPEND | LOCK_EX);
    }
}

// REST diagnostics for auth and headers
add_filter('rest_pre_dispatch', function ($result, $server, $request) {
    try {
        $route = $request->get_route();
        if (strpos($route, '/wp/v2/media') !== false || strpos($route, '/pulse2/v1') !== false) {
            $auth = $request->get_header('authorization');
            $nonce = $request->get_header('x-wp-nonce');
            $diag = array(
                'route' => $route,
                'method' => $request->get_method(),
                'has_authorization' => $auth ? true : false,
                'auth_prefix' => $auth ? substr($auth, 0, 10) : null,
                'has_nonce' => $nonce ? true : false,
                'is_user_logged_in' => is_user_logged_in(),
                'current_user' => function_exists('wp_get_current_user') ? wp_get_current_user()->user_login : null,
                'user_id' => get_current_user_id(),
                'can_upload_files' => current_user_can('upload_files'),
                'can_edit_posts' => current_user_can('edit_posts'),
            );
            pulse2_debug_log('REST pre_dispatch', $diag);
        }
    } catch (Throwable $e) {
        pulse2_debug_log('REST pre_dispatch log error: ' . $e->getMessage());
    }
    return $result;
}, 1, 3);

add_filter('rest_authentication_errors', function ($result) {
    if (is_wp_error($result)) {
        pulse2_debug_log('REST auth error', array(
            'code' => $result->get_error_code(),
            'message' => $result->get_error_message(),
        ));
    }
    return $result;
});


