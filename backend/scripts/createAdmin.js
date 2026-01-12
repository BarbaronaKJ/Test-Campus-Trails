const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-trails', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const createDefaultAdmin = async () => {
  try {
    // Check if any admin exists
    const existingAdmin = await Admin.findOne();
    
    if (existingAdmin) {
      console.log('Admin account already exists.');
      console.log('Username:', existingAdmin.username);
      console.log('Email:', existingAdmin.email);
      process.exit(0);
    }

    // Create default admin
    const admin = new Admin({
      username: 'admin',
      password: 'Admin@123',
      email: 'admin@campustrails.com',
      role: 'super-admin'
    });

    await admin.save();

    console.log('✅ Default admin account created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('  Username: admin');
    console.log('  Password: Admin@123');
    console.log('');
    console.log('⚠️  Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createDefaultAdmin();
