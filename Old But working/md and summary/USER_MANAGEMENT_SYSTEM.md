# User Management System Documentation

## Overview

This document describes the comprehensive user management system integrated into the WordPress plugin (`pulse2.php`) and the React frontend application. The system provides role-based access control with seamless WordPress integration.

## Architecture

### Backend (WordPress Plugin)
- **File**: `wordpress/pulse2/pulse2.php`
- **Authentication**: JWT-based with WordPress integration
- **API Endpoints**: Custom REST API routes for user management
- **Database**: WordPress users table with custom meta fields

### Frontend (React Application)
- **Hook**: `src/hooks/useUserManagement.ts`
- **Components**: Profile management UI
- **State Management**: React Query for data fetching and mutations
- **Authentication**: JWT token stored in localStorage

## User Roles and Permissions

### Role Hierarchy
1. **Administrator** (WordPress Admin)
   - Can create Project Manager accounts
   - Full access to all projects and users
   - Can manage system settings

2. **Project Manager**
   - Can create team member accounts (Artists, Clients, etc.)
   - Can edit projects and manage project data
   - Can view and manage team members

3. **Team Members** (Artists, Clients, etc.)
   - Can view assigned projects
   - Can add notes and comments
   - Can request password changes
   - Limited project editing permissions

### Permission Matrix

| Action | Admin | Project Manager | Team Member |
|--------|-------|----------------|-------------|
| Create Projects | ✅ | ✅ | ❌ |
| Edit Projects | ✅ | ✅ | ❌ |
| Delete Projects | ✅ | ✅ | ❌ |
| Create Users | ✅ | ✅ (Team Members) | ❌ |
| Edit Users | ✅ | ✅ (Team Members) | ❌ |
| Delete Users | ✅ | ✅ (Team Members) | ❌ |
| View All Projects | ✅ | ✅ | ❌ |
| Add Notes | ✅ | ✅ | ✅ |
| Request Password Reset | ✅ | ✅ | ✅ |

## API Endpoints

### User Management Endpoints

#### 1. Get All Users
```
GET /wp-json/pulse2/v1/users
```
**Headers**: 
- `Authorization: Bearer {jwt_token}`
- `X-WP-Nonce: {nonce}`

**Response**:
```json
{
  "users": [
    {
      "id": 123,
      "username": "john_doe",
      "email": "john@example.com",
      "display_name": "John Doe",
      "role": "project_manager",
      "status": "active"
    }
  ]
}
```

#### 2. Create User
```
POST /wp-json/pulse2/v1/users
```
**Headers**: 
- `Authorization: Bearer {jwt_token}`
- `X-WP-Nonce: {nonce}`

**Body**:
```json
{
  "email": "newuser@example.com",
  "display_name": "New User",
  "role": "artist",
  "project_manager_id": 123
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": 124,
    "username": "newuser_124",
    "email": "newuser@example.com",
    "display_name": "New User",
    "role": "artist",
    "password": "generated_password"
  }
}
```

#### 3. Update User
```
PUT /wp-json/pulse2/v1/users/{user_id}
```
**Headers**: 
- `Authorization: Bearer {jwt_token}`
- `X-WP-Nonce: {nonce}`

**Body**:
```json
{
  "display_name": "Updated Name",
  "role": "client"
}
```

#### 4. Delete User
```
DELETE /wp-json/pulse2/v1/users/{user_id}
```
**Headers**: 
- `Authorization: Bearer {jwt_token}`
- `X-WP-Nonce: {nonce}`

### Invitation Management Endpoints

#### 1. Get Invitations
```
GET /wp-json/pulse2/v1/invitations
```
**Headers**: 
- `Authorization: Bearer {jwt_token}`
- `X-WP-Nonce: {nonce}`

#### 2. Create Invitation
```
POST /wp-json/pulse2/v1/invitations
```
**Headers**: 
- `Authorization: Bearer {jwt_token}`
- `X-WP-Nonce: {nonce}`

**Body**:
```json
{
  "email": "invite@example.com",
  "role": "artist",
  "invited_by": 123
}
```

#### 3. Accept Invitation
```
POST /wp-json/pulse2/v1/invitations/{invitation_id}/accept
```
**Headers**: 
- `X-WP-Nonce: {nonce}`

**Body**:
```json
{
  "password": "user_password",
  "display_name": "User Name"
}
```

### Password Reset Endpoints

#### 1. Request Password Reset
```
POST /wp-json/pulse2/v1/password-reset
```
**Headers**: 
- `X-WP-Nonce: {nonce}`

**Body**:
```json
{
  "email": "user@example.com"
}
```

#### 2. Reset Password
```
POST /wp-json/pulse2/v1/password-reset/{token}
```
**Headers**: 
- `X-WP-Nonce: {nonce}`

**Body**:
```json
{
  "password": "new_password"
}
```

## Frontend Implementation

### useUserManagement Hook

The `useUserManagement` hook provides a complete interface for user management operations:

```typescript
const {
  users,
  invitations,
  isLoading,
  createUser,
  updateUser,
  deleteUser,
  createInvitation,
  deleteInvitation,
  requestPasswordReset
} = useUserManagement();
```

#### Key Features:
- **Automatic Authentication**: Uses JWT token and nonce from localStorage/window
- **Role-based Permissions**: Checks user permissions before operations
- **Error Handling**: Comprehensive error handling with user feedback
- **Optimistic Updates**: Immediate UI updates with background sync
- **Cache Management**: Automatic cache invalidation and updates

### Permission Checks

```typescript
// Check if user can create other users
const canCreateUsers = userRole === 'administrator' || userRole === 'project_manager';

// Check if user can edit specific user
const canEditUser = (targetUserRole: string) => {
  if (userRole === 'administrator') return true;
  if (userRole === 'project_manager') {
    return ['artist', 'client', 'team_member'].includes(targetUserRole);
  }
  return false;
};
```

## User Workflow

### 1. Admin Creates Project Manager
1. Admin logs into WordPress
2. Navigates to user management section
3. Creates new user with "project_manager" role
4. System generates username and password
5. Admin shares credentials with Project Manager

### 2. Project Manager Creates Team Members
1. Project Manager logs in with provided credentials
2. Accesses user management section
3. Creates new users with appropriate roles (artist, client, etc.)
4. System generates credentials for each team member
5. Project Manager distributes credentials to team members

### 3. Team Member Account Management
1. Team member receives credentials
2. Logs in and can immediately start working
3. Can request password reset if needed
4. Can view assigned projects and add notes
5. Limited to read-only access for project editing

### 4. Password Reset Process
1. User requests password reset via email
2. System generates secure token and sends email
3. User clicks link in email
4. User sets new password
5. Token is invalidated after use

## Security Features

### JWT Authentication
- **Token Storage**: Secure localStorage storage
- **Token Validation**: Server-side validation on every request
- **Token Expiration**: Automatic token refresh handling
- **Logout**: Complete token cleanup

### WordPress Nonce Protection
- **CSRF Protection**: Nonce validation on all state-changing operations
- **Automatic Nonce**: Retrieved from WordPress and included in all requests
- **Nonce Refresh**: Automatic nonce refresh when needed

### Role-based Access Control
- **Server-side Validation**: All permissions checked on backend
- **Client-side Checks**: UI elements hidden based on user role
- **API Protection**: Endpoints validate user permissions before processing

## Database Schema

### WordPress Users Table (Extended)
```sql
-- Standard WordPress users table
wp_users:
  - ID (Primary Key)
  - user_login
  - user_pass
  - user_nicename
  - user_email
  - user_url
  - user_registered
  - user_activation_key
  - user_status
  - display_name

-- Custom user meta for roles and permissions
wp_usermeta:
  - user_id (Foreign Key)
  - meta_key
  - meta_value
```

### Custom Tables (if needed)
```sql
-- Invitations table
wp_pulse2_invitations:
  - id (Primary Key)
  - email
  - role
  - invited_by
  - token
  - expires_at
  - created_at
  - status

-- Password reset tokens
wp_pulse2_password_resets:
  - id (Primary Key)
  - user_id
  - token
  - expires_at
  - created_at
  - used_at
```

## Error Handling

### Common Error Scenarios
1. **Invalid JWT Token**: Redirect to login
2. **Expired Nonce**: Refresh nonce and retry
3. **Permission Denied**: Show appropriate error message
4. **Network Errors**: Retry with exponential backoff
5. **Validation Errors**: Display field-specific errors

### Error Response Format
```json
{
  "error": true,
  "message": "Permission denied",
  "code": "permission_denied",
  "details": {
    "required_role": "administrator",
    "user_role": "team_member"
  }
}
```

## Testing

### Unit Tests
- User permission checks
- API endpoint validation
- Error handling scenarios

### Integration Tests
- Complete user workflow
- JWT authentication flow
- Role-based access control

### Manual Testing Checklist
- [ ] Admin can create Project Manager
- [ ] Project Manager can create team members
- [ ] Team members can request password reset
- [ ] Role-based permissions work correctly
- [ ] JWT authentication works properly
- [ ] Nonce protection prevents CSRF attacks

## Deployment Considerations

### WordPress Requirements
- WordPress 5.0+
- PHP 7.4+
- JWT Authentication plugin
- REST API enabled

### Security Checklist
- [ ] HTTPS enabled
- [ ] JWT tokens have appropriate expiration
- [ ] Nonce validation enabled
- [ ] Role-based permissions implemented
- [ ] Password reset tokens are secure
- [ ] Email notifications configured

### Performance Optimization
- User data caching with React Query
- Optimistic updates for better UX
- Efficient database queries
- Minimal API calls

## Future Enhancements

### Planned Features
1. **Bulk User Operations**: Create multiple users at once
2. **User Groups**: Organize users into project-specific groups
3. **Advanced Permissions**: Granular permission system
4. **Audit Logging**: Track user actions and changes
5. **Email Templates**: Customizable email notifications
6. **Two-Factor Authentication**: Enhanced security

### Integration Opportunities
1. **LDAP/Active Directory**: Enterprise user management
2. **SSO Integration**: Single sign-on support
3. **API Rate Limiting**: Prevent abuse
4. **User Activity Dashboard**: Monitor user engagement

## Support and Maintenance

### Troubleshooting
- Check WordPress error logs for API issues
- Verify JWT token configuration
- Ensure nonce is properly configured
- Validate user permissions

### Maintenance Tasks
- Regular security updates
- Database optimization
- Token cleanup (expired tokens)
- User activity monitoring

---

This user management system provides a robust, secure, and scalable solution for managing users within the project management application while maintaining full integration with WordPress. 