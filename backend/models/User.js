const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema - Stores identity and cross-campus activity
 */
const userSchema = new mongoose.Schema({
  // Username (optional, can use email instead)
  username: {
    type: String,
    trim: true,
    sparse: true, // Allows null, but enforces uniqueness when present
    unique: true,
    index: true
  },
  
  // Email address
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  
  // Hashed password
  password: {
    type: String,
    required: true
  },
  
  // User role: "admin" or "student"
  // Controls Vercel panel access and permissions
  role: {
    type: String,
    enum: ['admin', 'student'],
    default: 'student'
  },
  
  // Profile picture URL (Cloudinary URL)
  profilePicture: {
    type: String,
    trim: true,
    default: null
  },
  
  // Display name (optional, defaults to username or email)
  displayName: {
    type: String,
    trim: true,
    default: null
  },
  
  // Password reset token (for forgot password functionality)
  resetPasswordToken: {
    type: String,
    default: null
  },
  
  // Password reset token expiration timestamp
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  
  // Saved Pins array (cross-campus saved items)
  savedPins: [{
    pinId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pin',
      required: true
    },
    campusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
      required: true
    },
    savedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Additional indexes (unique indexes are already defined in schema fields)
userSchema.index({ role: 1 });

// Method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get saved pins filtered by campus
userSchema.methods.getSavedPinsByCampus = function(campusId) {
  return this.savedPins.filter(sp => sp.campusId.toString() === campusId.toString());
};

// Method to check if a pin is saved
userSchema.methods.isPinSaved = function(pinId) {
  return this.savedPins.some(sp => sp.pinId.toString() === pinId.toString());
};

// Method to add a saved pin
userSchema.methods.addSavedPin = function(pinId, campusId) {
  // Check if already saved
  if (this.isPinSaved(pinId)) {
    return false; // Already saved
  }
  
  this.savedPins.push({
    pinId,
    campusId,
    savedAt: new Date()
  });
  
  return true; // Successfully added
};

// Method to remove a saved pin
userSchema.methods.removeSavedPin = function(pinId) {
  const initialLength = this.savedPins.length;
  this.savedPins = this.savedPins.filter(sp => sp.pinId.toString() !== pinId.toString());
  return this.savedPins.length < initialLength; // Return true if removed
};

// Static method to find user by email
userSchema.statics.findByEmail = async function(email) {
  return await this.findOne({ email: email.toLowerCase() });
};

// Static method to find user by username
userSchema.statics.findByUsername = async function(username) {
  return await this.findOne({ username });
};

// Static method to find user by credentials (username/email and password)
userSchema.statics.findByCredentials = async function(usernameOrEmail, password) {
  if (!usernameOrEmail || !password) {
    const error = new Error('Invalid login credentials');
    error.statusCode = 401;
    throw error;
  }

  // Try to find user by email first (case-insensitive)
  let user = await this.findOne({ email: usernameOrEmail.toLowerCase() });
  
  // If not found by email, try to find by username (case-sensitive for username)
  if (!user) {
    user = await this.findOne({ username: usernameOrEmail });
  }
  
  // If user not found, throw error
  if (!user) {
    const error = new Error('Invalid login credentials');
    error.statusCode = 401;
    throw error;
  }
  
  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    const error = new Error('Invalid login credentials');
    error.statusCode = 401;
    throw error;
  }
  
  // Return user (password is already hashed, so it's safe to return)
  return user;
};

// Static method to create user (with password hashing)
userSchema.statics.createUser = async function(userData) {
  const user = new this(userData);
  await user.save();
  // Return user without password
  const userObj = user.toObject();
  delete userObj.password;
  return userObj;
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  // Generate a random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash the token and store it in the database
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Set expiration time (1 hour from now)
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  
  // Return the unhashed token (to send via email)
  return resetToken;
};

// Method to generate 6-digit OTP code
userSchema.methods.generatePasswordResetOTP = function() {
  const crypto = require('crypto');
  // Generate a 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Hash the OTP and store it in the database
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(otpCode)
    .digest('hex');
  
  // Set expiration time (1 hour from now)
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  
  // Return the unhashed OTP (to send via email)
  return otpCode;
};

// Static method to find user by reset token
userSchema.statics.findByResetToken = async function(token) {
  const crypto = require('crypto');
  // Hash the provided token to compare with stored hash
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Find user with matching token that hasn't expired
  return await this.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() } // Token must not be expired
  });
};

const User = mongoose.model('User', userSchema);

module.exports = User;