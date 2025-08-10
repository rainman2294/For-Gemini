<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

// Capture fatal errors that occur during activation/parse
if (!function_exists('pulse2_register_shutdown_handler')) {
    function pulse2_register_shutdown_handler() {
        register_shutdown_function(function () {
            $last_error = error_get_last();
            if ($last_error && in_array($last_error['type'], array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR), true)) {
                $timestamp = date('Y-m-d H:i:s');
                $message = '[PULSE2 FATAL] ' . $timestamp . ' - ' . $last_error['message'] . ' in ' . $last_error['file'] . ':' . $last_error['line'];
                $base_dir = function_exists('plugin_dir_path') ? plugin_dir_path(__FILE__) : __DIR__ . '/';
                $fatal_log = $base_dir . 'pulse2-fatal.log';
                error_log($message);
                @file_put_contents($fatal_log, $message . PHP_EOL, FILE_APPEND | LOCK_EX);
            }
        });
    }
}

// Debug logging function
if (!function_exists('pulse2_debug_log')) {
    function pulse2_debug_log($message, $data = null) {
        $log_message = '[PULSE2 DEBUG] ' . date('Y-m-d H:i:s') . ' - ' . $message;
        if ($data !== null) {
            $log_message .= ' | Data: ' . print_r($data, true);
        }
        // Log to error_log
        @error_log($log_message);
        // Also create a specific debug file in the plugin directory
        $base_dir = function_exists('plugin_dir_path') ? plugin_dir_path(__FILE__) : __DIR__ . '/';
        $debug_file = $base_dir . 'pulse2-debug.log';
        @file_put_contents($debug_file, $log_message . PHP_EOL, FILE_APPEND | LOCK_EX);
    }
}

// Helper function to safely sanitize a date string to ISO 8601 format or null
if (!function_exists('pulse2_sanitize_date_to_iso')) {
    function pulse2_sanitize_date_to_iso($date_string) {
        if (empty($date_string) || $date_string === '0000-00-00 00:00:00') {
            return null;
        }
        try {
            if (is_numeric($date_string) && strlen($date_string) >= 10) {
                $date = new DateTime('@' . substr($date_string, 0, 10));
            } else {
                $date = new DateTime($date_string);
            }
            return $date->format('c');
        } catch (Exception $e) {
            return null;
        }
    }
}

// Generate UUID (v4-like)
if (!function_exists('generate_uuid')) {
    function generate_uuid() {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}


