<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

// Get all workspaces
function get_pulse2_workspaces($request) {
    $posts = get_posts(array(
        'post_type' => 'pulse2_workspace',
        'posts_per_page' => -1,
        'post_status' => 'publish'
    ));
    
    $workspaces = array();
    foreach ($posts as $post) {
        $workspace = array(
            'id' => get_post_meta($post->ID, 'pulse2_workspace_uuid', true) ?: $post->post_name,
            'name' => $post->post_title,
            'type' => get_post_meta($post->ID, 'pulse2_workspace_type', true) ?: 'moodboard',
            'projectId' => get_post_meta($post->ID, 'pulse2_project_id', true),
            'createdBy' => $post->post_author,
            'createdAt' => $post->post_date,
            'updatedAt' => $post->post_modified,
            'settings' => json_decode(get_post_meta($post->ID, 'pulse2_workspace_settings', true) ?: '{}', true)
        );
        $workspaces[] = $workspace;
    }
    
    return rest_ensure_response($workspaces);
}

// Get workspaces by project ID
function get_pulse2_workspaces_by_project($request) {
    $project_id = $request['project_id'];
    
    $posts = get_posts(array(
        'post_type' => 'pulse2_workspace',
        'posts_per_page' => -1,
        'post_status' => 'publish',
        'meta_query' => array(
            array(
                'key' => 'pulse2_project_id',
                'value' => $project_id,
                'compare' => '='
            )
        )
    ));
    
    $workspaces = array();
    foreach ($posts as $post) {
        $workspace = array(
            'id' => get_post_meta($post->ID, 'pulse2_workspace_uuid', true) ?: $post->post_name,
            'name' => $post->post_title,
            'type' => get_post_meta($post->ID, 'pulse2_workspace_type', true) ?: 'moodboard',
            'projectId' => get_post_meta($post->ID, 'pulse2_project_id', true),
            'createdBy' => $post->post_author,
            'createdAt' => $post->post_date,
            'updatedAt' => $post->post_modified,
            'settings' => json_decode(get_post_meta($post->ID, 'pulse2_workspace_settings', true) ?: '{}', true)
        );
        $workspaces[] = $workspace;
    }
    
    return rest_ensure_response($workspaces);
}

// Get single workspace
function get_pulse2_workspace($request) {
    $workspace_id = $request['id'];
    
    // Find workspace by UUID
    $query = new WP_Query(array(
        'post_type' => 'pulse2_workspace',
        'posts_per_page' => 1,
        'meta_key' => 'pulse2_workspace_uuid',
        'meta_value' => $workspace_id,
    ));
    
    if (!$query->have_posts()) {
        return new WP_Error('workspace_not_found', 'Workspace not found', array('status' => 404));
    }
    
    $post = $query->posts[0];
    $workspace = array(
        'id' => get_post_meta($post->ID, 'pulse2_workspace_uuid', true) ?: $post->post_name,
        'name' => $post->post_title,
        'type' => get_post_meta($post->ID, 'pulse2_workspace_type', true) ?: 'moodboard',
        'projectId' => get_post_meta($post->ID, 'pulse2_project_id', true),
        'createdBy' => $post->post_author,
        'createdAt' => $post->post_date,
        'updatedAt' => $post->post_modified,
        'settings' => json_decode(get_post_meta($post->ID, 'pulse2_workspace_settings', true) ?: '{}', true)
    );
    
    return rest_ensure_response($workspace);
}

// Create workspace
function create_pulse2_workspace($request) {
    $params = $request->get_json_params();
    
    if (empty($params['name']) || empty($params['type']) || empty($params['projectId'])) {
        return new WP_Error('missing_params', 'Missing required parameters', array('status' => 400));
    }
    
    // Generate UUID for workspace
    $workspace_uuid = wp_generate_uuid4();
    
    // Create the post
    $post_id = wp_insert_post(array(
        'post_title' => sanitize_text_field($params['name']),
        'post_type' => 'pulse2_workspace',
        'post_status' => 'publish',
        'post_author' => get_current_user_id(),
        'post_name' => $workspace_uuid
    ));
    
    if (is_wp_error($post_id)) {
        return $post_id;
    }
    
    // Save metadata
    update_post_meta($post_id, 'pulse2_workspace_uuid', $workspace_uuid);
    update_post_meta($post_id, 'pulse2_workspace_type', sanitize_text_field($params['type']));
    update_post_meta($post_id, 'pulse2_project_id', sanitize_text_field($params['projectId']));
    
    if (!empty($params['settings'])) {
        update_post_meta($post_id, 'pulse2_workspace_settings', wp_json_encode($params['settings']));
    }
    
    // Return the created workspace
    $workspace = array(
        'id' => $workspace_uuid,
        'name' => $params['name'],
        'type' => $params['type'],
        'projectId' => $params['projectId'],
        'createdBy' => get_current_user_id(),
        'createdAt' => current_time('mysql'),
        'updatedAt' => current_time('mysql'),
        'settings' => $params['settings'] ?? array()
    );
    
    return rest_ensure_response($workspace);
}

// Update workspace
function update_pulse2_workspace($request) {
    $workspace_id = $request['id'];
    $params = $request->get_json_params();
    
    // Find workspace by UUID
    $query = new WP_Query(array(
        'post_type' => 'pulse2_workspace',
        'posts_per_page' => 1,
        'meta_key' => 'pulse2_workspace_uuid',
        'meta_value' => $workspace_id,
    ));
    
    if (!$query->have_posts()) {
        return new WP_Error('workspace_not_found', 'Workspace not found', array('status' => 404));
    }
    
    $post = $query->posts[0];
    
    // Update post if name changed
    if (!empty($params['name'])) {
        wp_update_post(array(
            'ID' => $post->ID,
            'post_title' => sanitize_text_field($params['name'])
        ));
    }
    
    // Update metadata
    if (!empty($params['settings'])) {
        update_post_meta($post->ID, 'pulse2_workspace_settings', wp_json_encode($params['settings']));
    }
    
    // Return updated workspace
    $workspace = array(
        'id' => $workspace_id,
        'name' => $params['name'] ?? $post->post_title,
        'type' => get_post_meta($post->ID, 'pulse2_workspace_type', true),
        'projectId' => get_post_meta($post->ID, 'pulse2_project_id', true),
        'createdBy' => $post->post_author,
        'createdAt' => $post->post_date,
        'updatedAt' => current_time('mysql'),
        'settings' => json_decode(get_post_meta($post->ID, 'pulse2_workspace_settings', true) ?: '{}', true)
    );
    
    return rest_ensure_response($workspace);
}

// Delete workspace
function delete_pulse2_workspace($request) {
    $workspace_id = $request['id'];
    
    // Find workspace by UUID
    $query = new WP_Query(array(
        'post_type' => 'pulse2_workspace',
        'posts_per_page' => 1,
        'meta_key' => 'pulse2_workspace_uuid',
        'meta_value' => $workspace_id,
    ));
    
    if (!$query->have_posts()) {
        return new WP_Error('workspace_not_found', 'Workspace not found', array('status' => 404));
    }
    
    $post = $query->posts[0];
    
    // Delete the post
    $result = wp_delete_post($post->ID, true);
    
    if (!$result) {
        return new WP_Error('delete_failed', 'Failed to delete workspace', array('status' => 500));
    }
    
    return rest_ensure_response(array('deleted' => true));
}

// Mock workflow stages (for workflow workspaces)
function get_pulse2_workflow_stages($request) {
    $workspace_id = $request['workspace_id'];
    
    // Return mock stages for now
    $stages = array(
        array(
            'id' => 'stage-1',
            'name' => 'Initial Design',
            'description' => 'Create initial design concepts',
            'order' => 0,
            'status' => 'completed',
            'isRequired' => true,
            'estimatedHours' => 8,
            'actualHours' => 7.5,
            'workspaceId' => $workspace_id
        ),
        array(
            'id' => 'stage-2',
            'name' => 'Review & Feedback',
            'description' => 'Team review and client feedback',
            'order' => 1,
            'status' => 'in_progress',
            'isRequired' => true,
            'estimatedHours' => 4,
            'actualHours' => 0,
            'workspaceId' => $workspace_id
        )
    );
    
    return rest_ensure_response($stages);
}

// Create workflow stage
function create_pulse2_workflow_stage($request) {
    $workspace_id = $request['workspace_id'];
    $params = $request->get_json_params();
    
    // For now, return a mock stage
    $stage = array(
        'id' => 'stage-' . time(),
        'name' => $params['name'] ?? 'New Stage',
        'description' => $params['description'] ?? '',
        'order' => $params['order'] ?? 0,
        'status' => 'not_started',
        'isRequired' => $params['isRequired'] ?? false,
        'estimatedHours' => $params['estimatedHours'] ?? 0,
        'actualHours' => 0,
        'workspaceId' => $workspace_id
    );
    
    return rest_ensure_response($stage);
}

// Mock workflow metrics
function get_pulse2_workflow_metrics($request) {
    $workspace_id = $request['workspace_id'];
    
    $metrics = array(
        'id' => 'metrics-' . $workspace_id,
        'workspaceId' => $workspace_id,
        'totalStages' => 5,
        'completedStages' => 2,
        'averageStageCompletionTime' => 16.5,
        'bottleneckStages' => array('stage-2', 'stage-4'),
        'teamEfficiency' => 85.5,
        'onTimeDelivery' => 78.2,
        'totalEstimatedHours' => 40,
        'totalActualHours' => 42.5,
        'lastUpdated' => current_time('mysql')
    );
    
    return rest_ensure_response($metrics);
}

// Mock workflow templates
function get_pulse2_workflow_templates($request) {
    $templates = array(
        array(
            'id' => 'template-1',
            'name' => 'Design Review Workflow',
            'description' => 'Standard design review process with client feedback',
            'category' => 'design',
            'isPublic' => true,
            'usageCount' => 15,
            'stages' => array(
                array(
                    'name' => 'Initial Design',
                    'description' => 'Create initial design concepts',
                    'estimatedHours' => 8,
                    'requiresApproval' => false
                ),
                array(
                    'name' => 'Internal Review',
                    'description' => 'Team review and feedback',
                    'estimatedHours' => 4,
                    'requiresApproval' => true
                ),
                array(
                    'name' => 'Client Presentation',
                    'description' => 'Present to client for approval',
                    'estimatedHours' => 2,
                    'requiresApproval' => true
                )
            )
        )
    );
    
    return rest_ensure_response($templates);
}

// Mock analytics summary
function get_pulse2_analytics_summary($request) {
    $summary = array(
        'totalProjects' => 12,
        'activeProjects' => 8,
        'completedProjects' => 4,
        'totalWorkspaces' => 25,
        'recentActivity' => array(
            'projectsCreated' => 3,
            'workspacesCreated' => 7,
            'notesAdded' => 15,
            'mediaUploaded' => 23
        ),
        'workspacesByType' => array(
            'moodboard' => 8,
            'whiteboard' => 10,
            'workflow' => 5,
            'timeline' => 2
        ),
        'lastUpdated' => current_time('mysql')
    );
    
    return rest_ensure_response($summary);
}
