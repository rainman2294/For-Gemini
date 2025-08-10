<?php
// Prevent direct access
if (!defined('ABSPATH')) { exit; }

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

// Get settings data function
function get_pulse2_settings_data() {
    return array(
        'app_url' => get_option('pulse2_app_url', ''),
        'admin_email' => get_option('pulse2_admin_email', get_option('admin_email')),
        'invitation_email_subject' => get_option('pulse2_invitation_email_subject', 'You have been invited to join {site_name}'),
        'invitation_email_template' => get_option('pulse2_invitation_email_template', 
            "Hello!\n\n{invited_by_name} has invited you to join {site_name} as a {role}.\n\nPlease visit {site_url} to get started.\n\nIf you have any questions, contact us at {admin_email}.\n\nBest regards,\n{site_name} Team"
        )
    );
}