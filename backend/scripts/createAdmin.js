require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Admin credentials
    const phoneNumber = '9876543210'; // Change this to your desired phone number
    const password = 'admin123';      // Change this to your desired password
    const name = 'Admin';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ phoneNumber });
    if (existingAdmin) {
      console.log('Admin with this phone number already exists!');
      console.log('Phone Number:', existingAdmin.phoneNumber);
      console.log('Name:', existingAdmin.name);
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name,
      phoneNumber,
      password,
      role: 'admin'
    });

    console.log('\n✅ Admin created successfully!');
    console.log('=====================================');
    console.log('Phone Number:', admin.phoneNumber);
    console.log('Password:', password);
    console.log('Name:', admin.name);
    console.log('Role:', admin.role);
    console.log('=====================================');
    console.log('\nYou can now login with these credentials.');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();
