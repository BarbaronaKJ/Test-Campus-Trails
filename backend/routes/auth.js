const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// JWT Secret - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // Token expires in 7 days

/**
 * Register a new user
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required',
      });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists',
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Validate username length
    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long',
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Check password has capital letter and symbol
    const hasCapital = /[A-Z]/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    if (!hasCapital || !hasSymbol) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one capital letter and one symbol',
      });
    }

    // Create new user
    const newUser = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password, // Will be hashed by pre-save hook
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return user data (without password) and token
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: newUser.toJSON(),
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Login user
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input - can use either username or email
    const usernameOrEmail = username || email;
    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/email and password are required',
      });
    }

    // Find user and verify password
    const user = await User.findByCredentials(usernameOrEmail, password);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return user data (without password) and token
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    
    // Check if it's an authentication error
    if (error.message === 'Invalid login credentials' || error.statusCode === 401) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password',
      });
    }

    // Log full error in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('Full login error details:', {
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Get current user profile (protected route)
 * GET /api/auth/me
 */
router.get('/me', async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user by ID
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user.toJSON(),
    });
  } catch (error) {
    console.error('Get user error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Update user profile (protected route)
 * PUT /api/auth/profile
 */
router.put('/profile', async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update allowed fields
    const { profilePicture, settings } = req.body;
    
    if (profilePicture !== undefined) {
      user.profilePicture = profilePicture;
    }

    if (settings) {
      user.settings = { ...user.settings, ...settings };
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user.toJSON(),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Update user activity (saved pins, feedback)
 * PUT /api/auth/activity
 */
router.put('/activity', async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update activity data
    const { savedPins, feedbackHistory } = req.body;
    
    if (savedPins !== undefined) {
      user.activity.savedPins = savedPins;
    }

    if (feedbackHistory !== undefined) {
      // Validate feedback entries
      for (const feedback of feedbackHistory) {
        if (feedback.comment) {
          const commentLength = feedback.comment.trim().length;
          if (commentLength <= 5) {
            return res.status(400).json({
              success: false,
              message: 'Feedback comment must be more than 5 characters',
            });
          }
          if (commentLength > 250) {
            return res.status(400).json({
              success: false,
              message: 'Feedback comment cannot exceed 250 characters',
            });
          }
        }
      }
      
      // Log feedback update for debugging
      console.log(`Updating feedbackHistory for user ${decoded.userId}:`, {
        previousCount: user.activity.feedbackHistory?.length || 0,
        newCount: feedbackHistory.length,
        latestFeedback: feedbackHistory[feedbackHistory.length - 1],
      });
      
      user.activity.feedbackHistory = feedbackHistory;
    }

    user.activity.lastActiveDate = new Date();
    await user.save();

    // Verify the save by fetching the user again
    const savedUser = await User.findById(decoded.userId);
    console.log(`Feedback saved successfully for user ${decoded.userId}. Feedback count:`, savedUser.activity.feedbackHistory?.length || 0);

    res.json({
      success: true,
      message: 'Activity updated successfully',
      data: savedUser.toJSON(),
    });
  } catch (error) {
    console.error('Update activity error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error updating activity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Change user password (protected route)
 * PUT /api/auth/change-password
 */
router.put('/change-password', async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const { oldPassword, newPassword } = req.body;

    // Validation
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Old password and new password are required',
      });
    }

    // Verify old password
    const isPasswordValid = await user.comparePassword(oldPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Old password is incorrect',
      });
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Check password has capital letter and symbol
    const hasCapital = /[A-Z]/.test(newPassword);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
    
    if (!hasCapital || !hasSymbol) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one capital letter and one symbol',
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Logout user (invalidates token on server if token blacklist is implemented)
 * POST /api/auth/logout
 * Note: Since we're using stateless JWT tokens, logout is primarily handled client-side
 * This endpoint can be used for server-side logging or token blacklisting if implemented
 */
router.post('/logout', async (req, res) => {
  try {
    // Get token from Authorization header (optional for logging)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Log logout event (optional - can be used for analytics)
        console.log(`User ${decoded.userId} logged out`);
      } catch (error) {
        // Token is invalid or expired, but logout still succeeds
        console.log('Logout with invalid/expired token');
      }
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Forgot Password - Request password reset
 * POST /api/auth/forgot-password
 * Request Body: { email, useOTP: true/false (optional, default: false) }
 * 
 * If useOTP is true, sends a 6-digit OTP code via email
 * If useOTP is false, sends a reset link via email
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, useOTP } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Find user by email
    const user = await User.findByEmail(email.toLowerCase());
    
    // Always return success message (security best practice - don't reveal if email exists)
    // But only send email if user exists
    if (user) {
      try {
        // Generate reset token or OTP
        let resetToken;
        let resetUrl;
        
        if (useOTP === true) {
          // Generate 6-digit OTP
          const otpCode = user.generatePasswordResetOTP();
          await user.save();
          
          // Send OTP via email
          const { sendPasswordResetOTP } = require('../utils/emailService');
          await sendPasswordResetOTP(user.email, otpCode);
          
          return res.json({
            success: true,
            message: 'Password reset code has been sent to your email',
            // In development, return OTP for testing (remove in production)
            ...(process.env.NODE_ENV === 'development' && { otpCode }),
          });
        } else {
          // Generate reset token
          resetToken = user.generatePasswordResetToken();
          await user.save();
          
          // Build reset URL (pointing to Vercel web panel)
          const baseUrl = process.env.RESET_PASSWORD_URL || process.env.WEB_PANEL_URL || 'https://your-vercel-app.vercel.app';
          resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
          
          // Send reset link via email
          const { sendPasswordResetEmail } = require('../utils/emailService');
          await sendPasswordResetEmail(user.email, resetToken, resetUrl);
          
          return res.json({
            success: true,
            message: 'Password reset link has been sent to your email',
            // In development, return reset URL for testing (remove in production)
            ...(process.env.NODE_ENV === 'development' && { resetUrl }),
          });
        }
      } catch (emailError) {
        console.error('Error sending password reset email:', emailError);
        // Still return success to user (don't reveal email service issues)
        return res.json({
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent',
        });
      }
    } else {
      // User doesn't exist, but return same message (security best practice)
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent',
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing password reset request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Reset Password - Reset password using token or OTP
 * POST /api/auth/reset-password
 * Request Body: { token (or otpCode), newPassword }
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, otpCode, newPassword } = req.body;

    // Validation
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password is required',
      });
    }

    if (!token && !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Reset token or OTP code is required',
      });
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Check password has capital letter and symbol
    const hasCapital = /[A-Z]/.test(newPassword);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
    
    if (!hasCapital || !hasSymbol) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one capital letter and one symbol',
      });
    }

    // Find user by reset token (works for both token and OTP)
    const resetToken = token || otpCode;
    const user = await User.findByResetToken(resetToken);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new password reset.',
      });
    }

    // Update password
    user.password = newPassword;
    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
