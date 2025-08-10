<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

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

// Hook table creation to initialization
add_action('init', 'init_workspace_tables', 20);