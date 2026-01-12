# Troubleshooting: Password Reset Email Not Received

## Quick Check

### 1. Check Backend Console Logs

When you request a password reset, check your **backend server console** (where you ran `npm start`). You should see:

```
📧 Password Reset Email (Development Mode - Email not configured):
   To: your-email@example.com
   Reset URL: https://your-vercel-app.vercel.app/reset-password?token=abc123...
   Token: abc123...
   ⚠️  To enable email sending, configure EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in backend/.env
```

**Copy the Reset URL from the console** - you can use it directly to reset your password!

### 2. Check Frontend Alert (Development Mode)

In development mode, the reset URL should also appear in the alert popup after clicking "Reset Password".

### 3. Check if Email is Configured

The email service is **not configured by default**. This is normal for development.

## Solutions

### Option 1: Use Console Log (Quick Testing)

1. Request password reset from the app
2. Check your **backend server console** (terminal where backend is running)
3. Copy the **Reset URL** from the console output
4. Open the URL in a browser or use it in your app

### Option 2: Configure Email Service (Production)

To actually send emails, add to `backend/.env`:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

**For Gmail:**
1. Enable 2-Step Verification
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use the app password (not your regular password) as `EMAIL_PASS`

**For Outlook:**
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

### Option 3: Check Backend Server Status

Make sure your backend server is running:
```bash
cd backend
npm start
```

The server should show:
```
🚀 Campus Trails API Server started successfully!
   Server running on port 3000
```

### Option 4: Verify User Exists

The password reset only works if the email exists in the database. Make sure:
1. The user is registered
2. The email matches exactly (case-insensitive)

## Testing the Reset URL

Once you have the reset URL from the console:

1. **Option A - Web Browser:**
   - Copy the full URL from console
   - Open in browser
   - Enter new password

2. **Option B - Mobile App:**
   - The reset URL contains a token
   - Extract the token (part after `?token=`)
   - Use it in your app's reset password screen

## Common Issues

### Issue: No console output
- **Solution:** Make sure backend server is running and check the correct terminal window

### Issue: "Email service not configured" warning
- **Solution:** This is normal in development. Use the console log method above.

### Issue: Reset URL not in alert
- **Solution:** Check backend console logs instead. The URL is always logged there.

### Issue: Token expired
- **Solution:** Request a new password reset. Tokens expire after 1 hour.

## Next Steps

1. **For Development:** Use console logs (already working)
2. **For Production:** Configure email service in `backend/.env`
3. **For Testing:** Copy reset URL from console and test the reset flow
