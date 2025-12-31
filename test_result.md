# ECU Flash Service - Test Results

## Current Testing Session

### Priority Fixes for Testing:
1. **Customer Registration** - Test the registration form at /portal
2. **Forgot Password** - Test the password reset flow
3. **Mobile Navigation** - Test the mobile hamburger menu and DTC Tool link

### Test Credentials:
- Customer Portal test: `jane.smith@example.com` / `password123`
- New registration test: Use unique email like `testuser_<timestamp>@example.com`

### Backend Endpoints to Test:
- POST `/api/portal/register` - New user registration
- POST `/api/portal/forgot-password` - Password reset request
- POST `/api/portal/login-password` - Password-based login

### Frontend Features to Test:
1. Mobile Navigation:
   - Hamburger menu button on mobile viewport
   - Mobile menu should contain "DTC Delete Tool" link
   - Menu toggles open/close correctly

2. Registration Flow:
   - "Create New Account" button visible on portal login page
   - Registration form with: Full Name, Email, Password, Confirm Password
   - Submit registration and verify success message
   - Auto-login after successful registration

3. Forgot Password Flow:
   - "Forgot your password?" link on login page
   - Modal opens with email input
   - Submit request and verify success message

