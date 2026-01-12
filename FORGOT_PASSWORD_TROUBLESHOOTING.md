# Forgot Password Troubleshooting Guide

## ✅ What's Been Implemented

1. **Backend Routes** (✅ Complete):
   - `POST /api/auth/forgot-password` - Request password reset
   - `POST /api/auth/reset-password` - Reset password with token/OTP

2. **Frontend API Functions** (✅ Complete):
   - `forgotPassword(email, useOTP)` - Call from your React Native app
   - `resetPassword(token, newPassword, otpCode)` - Call from your React Native app

3. **User Model** (✅ Complete):
   - `resetPasswordToken` field
   - `resetPasswordExpires` field
   - `generatePasswordResetToken()` method
   - `generatePasswordResetOTP()` method
   - `findByResetToken()` method

## 🔍 Common Issues & Solutions

### Issue 1: "Function not found" or "forgotPassword is not defined"

**Solution**: Make sure you import the function in your component:

```javascript
import { forgotPassword, resetPassword } from './services/api';
```

### Issue 2: "Network request failed" or "Connection refused"

**Solution**: 
1. Make sure your backend server is running:
   ```bash
   cd backend
   npm start
   ```

2. Check if the backend is accessible:
   - Test: `curl http://localhost:3000/health`
   - Should return: `{"success":true,"message":"Campus Trails API Server is running"}`

3. Verify your API_BASE_URL in `services/api.js` matches your backend URL

### Issue 3: "Email service not configured" warning

**Solution**: This is normal in development mode. The reset URL/OTP will be logged to the console instead of being sent via email.

To enable email sending:
1. Add to `backend/.env`:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

2. For Gmail, you need to:
   - Enable 2-Step Verification
   - Generate an App Password (not your regular password)

### Issue 4: "Invalid or expired reset token"

**Solution**: 
- Tokens expire after 1 hour
- Request a new password reset
- Make sure you're using the token/OTP from the most recent request

### Issue 5: Backend returns 404 for `/api/auth/forgot-password`

**Solution**: 
1. Restart your backend server:
   ```bash
   cd backend
   npm start
   ```

2. Verify the route is registered in `backend/server.js`:
   ```javascript
   app.use('/api/auth', require('./routes/auth'));
   ```

## 📱 How to Use in Your React Native App

### Step 1: Import the functions

```javascript
import { forgotPassword, resetPassword } from './services/api';
```

### Step 2: Request password reset

```javascript
try {
  const response = await forgotPassword('user@example.com', false);
  // false = use reset link, true = use OTP code
  console.log(response.message);
  
  // In development mode, response will include:
  // - resetUrl (if useOTP = false)
  // - otpCode (if useOTP = true)
  if (__DEV__ && response.resetUrl) {
    console.log('Reset URL:', response.resetUrl);
  }
} catch (error) {
  Alert.alert('Error', error.message);
}
```

### Step 3: Reset password (using reset link token)

```javascript
try {
  // Extract token from URL: https://your-app.com/reset-password?token=abc123...
  const token = 'abc123...'; // Get from URL query parameter
  
  const response = await resetPassword(token, 'NewPassword123!', null);
  Alert.alert('Success', response.message);
} catch (error) {
  Alert.alert('Error', error.message);
}
```

### Step 3 (Alternative): Reset password (using OTP code)

```javascript
try {
  const otpCode = '123456'; // User enters this from email
  
  const response = await resetPassword(null, 'NewPassword123!', otpCode);
  Alert.alert('Success', response.message);
} catch (error) {
  Alert.alert('Error', error.message);
}
```

## 🧪 Testing

### Test 1: Request Reset (Development Mode)

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Password reset link has been sent to your email",
  "resetUrl": "https://your-vercel-app.vercel.app/reset-password?token=..."
}
```

### Test 2: Reset Password

```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN_HERE","newPassword":"NewPass123!"}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now login with your new password."
}
```

## 🔐 Security Notes

1. **Email Privacy**: The API always returns the same success message, even if the email doesn't exist (security best practice)

2. **Token Expiration**: Reset tokens expire after 1 hour

3. **Token Hashing**: Tokens are hashed (SHA-256) before storing in the database

4. **Single Use**: Tokens are cleared after successful password reset

5. **Password Requirements**: 
   - Minimum 6 characters
   - Must contain at least one capital letter
   - Must contain at least one symbol

## 📝 Next Steps

1. **Add UI to your app**: Create a "Forgot Password?" button/link on your login screen
2. **Create Forgot Password Modal**: Add a modal/screen where users can enter their email
3. **Create Reset Password Modal**: Add a modal/screen where users can enter the token/OTP and new password
4. **Handle Deep Links**: If using reset links, configure deep linking to open your app when the link is clicked

## 🐛 Still Not Working?

1. Check backend server logs for errors
2. Check browser/React Native console for errors
3. Verify MongoDB connection is working
4. Test the endpoint directly with curl (see Testing section above)
5. Make sure you're using the correct API_BASE_URL for your environment
