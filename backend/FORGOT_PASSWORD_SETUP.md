# Forgot Password Setup Guide

This guide explains how to set up the forgot password functionality for Campus Trails.

## Overview

The forgot password feature follows industry-standard security practices:

1. **Request**: User enters their email
2. **Verification**: Backend checks if user exists
3. **Token Generation**: Server generates unique, temporary reset token (expires in 1 hour)
4. **Email Delivery**: Sends reset link (to Vercel web panel) or 6-digit OTP code via email
5. **Reset**: User clicks link/enters code, provides new password, backend updates MongoDB

## Email Configuration

### Step 1: Configure Email Service in `.env`

Add the following environment variables to your `backend/.env` file:

```env
# Email Configuration (for password reset)
EMAIL_HOST=smtp.gmail.com          # Your email provider's SMTP host
EMAIL_PORT=587                     # SMTP port (587 for TLS, 465 for SSL)
EMAIL_SECURE=false                 # true for SSL (port 465), false for TLS (port 587)
EMAIL_USER=your-email@gmail.com    # Your email address
EMAIL_PASS=your-app-password      # Your email password or app-specific password

# Web Panel URL (for reset password link)
RESET_PASSWORD_URL=https://your-vercel-app.vercel.app
# OR
WEB_PANEL_URL=https://your-vercel-app.vercel.app
```

### Step 2: Email Provider Setup

#### For Gmail:
1. Enable 2-Step Verification on your Google account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this app password as `EMAIL_PASS` (not your regular password)

#### For Outlook/Hotmail:
1. Use your email and password
2. `EMAIL_HOST=smtp-mail.outlook.com`
3. `EMAIL_PORT=587`
4. `EMAIL_SECURE=false`

#### For Other Providers:
- Check your email provider's SMTP settings
- Common ports: 587 (TLS), 465 (SSL), 25 (unencrypted - not recommended)

## API Endpoints

### 1. Request Password Reset

**POST** `/api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com",
  "useOTP": false  // Optional: true for OTP code, false for reset link (default: false)
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password reset link has been sent to your email"
}
```

**Response (Development Mode - includes reset URL for testing):**
```json
{
  "success": true,
  "message": "Password reset link has been sent to your email",
  "resetUrl": "https://your-app.vercel.app/reset-password?token=abc123..."
}
```

### 2. Reset Password

**POST** `/api/auth/reset-password`

**Request Body (using reset link):**
```json
{
  "token": "abc123...",
  "newPassword": "NewPassword123!"
}
```

**Request Body (using OTP code):**
```json
{
  "otpCode": "123456",
  "newPassword": "NewPassword123!"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now login with your new password."
}
```

**Response (Error - Invalid/Expired Token):**
```json
{
  "success": false,
  "message": "Invalid or expired reset token. Please request a new password reset."
}
```

## Security Features

1. **Token Hashing**: Reset tokens are hashed using SHA-256 before storing in database
2. **Token Expiration**: Tokens expire after 1 hour
3. **Email Privacy**: Always returns same success message (doesn't reveal if email exists)
4. **Password Validation**: Enforces password strength requirements (min 6 chars, capital letter, symbol)

## Database Schema

The User model now includes:
- `resetPasswordToken`: Hashed reset token (SHA-256)
- `resetPasswordExpires`: Timestamp when token expires (1 hour from generation)

## Development Mode

In development mode (when email is not configured), the reset URL/OTP code is logged to the console instead of being sent via email. This allows testing without email configuration.

## Testing

### Test Reset Link Flow:
1. POST `/api/auth/forgot-password` with `{ "email": "test@example.com", "useOTP": false }`
2. Check console/logs for reset URL (in development) or check email (in production)
3. POST `/api/auth/reset-password` with `{ "token": "...", "newPassword": "NewPass123!" }`
4. Login with new password

### Test OTP Flow:
1. POST `/api/auth/forgot-password` with `{ "email": "test@example.com", "useOTP": true }`
2. Check console/logs for OTP code (in development) or check email (in production)
3. POST `/api/auth/reset-password` with `{ "otpCode": "123456", "newPassword": "NewPass123!" }`
4. Login with new password

## Frontend Integration

### Mobile App (React Native):
- Add "Forgot Password?" link on login screen
- Create forgot password modal/screen
- Call `POST /api/auth/forgot-password` with user's email
- Show success message
- For OTP flow: Create OTP input screen
- For reset link flow: Open link in browser or deep link to web panel

### Web Panel (Vercel):
- Create `/reset-password` page
- Extract `token` from URL query parameter
- Show password reset form
- Call `POST /api/auth/reset-password` with token and new password
- Redirect to login on success

## Notes

- Reset tokens are single-use (cleared after successful password reset)
- Old reset tokens are automatically invalidated when a new one is generated
- Email service must be configured for production use
- In development, reset URLs/OTPs are logged to console for testing
