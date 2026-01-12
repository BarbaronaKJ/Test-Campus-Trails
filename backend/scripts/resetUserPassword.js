/**
 * Reset User Password Script
 * 
 * Usage: node scripts/resetUserPassword.js <usernameOrEmail> <newPassword>
 * Example: node scripts/resetUserPassword.js Admin1 MyNewPass123!
 * Example: node scripts/resetUserPassword.js kenth.barbarona9@gmail.com MyNewPass123!
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function resetPassword() {
  try {
    const usernameOrEmail = process.argv[2];
    const newPassword = process.argv[3];

    if (!usernameOrEmail || !newPassword) {
      console.error('❌ Usage: node scripts/resetUserPassword.js <usernameOrEmail> <newPassword>');
      console.error('   Example: node scripts/resetUserPassword.js Admin1 MyNewPass123!');
      process.exit(1);
    }

    // Validate password strength
    if (newPassword.length < 6) {
      console.error('❌ Password must be at least 6 characters long');
      process.exit(1);
    }

    const hasCapital = /[A-Z]/.test(newPassword);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
    
    if (!hasCapital || !hasSymbol) {
      console.error('❌ Password must contain at least one capital letter and one symbol');
      process.exit(1);
    }

    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to MongoDB\n');

    // Find user by email or username
    let user = await User.findOne({ email: usernameOrEmail.toLowerCase() });
    if (!user) {
      user = await User.findOne({ username: usernameOrEmail });
    }

    if (!user) {
      console.error(`❌ User not found: ${usernameOrEmail}`);
      console.error('   Try with username (Admin1) or email (kenth.barbarona9@gmail.com)');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`📝 Found user: ${user.username || 'no username'} | ${user.email}`);
    console.log(`🔐 Resetting password...\n`);

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    console.log('✅ Password reset successfully!');
    console.log(`   Username: ${user.username || 'N/A'}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   New password: ${newPassword}\n`);
    console.log('💡 You can now login with this password.');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

resetPassword();
