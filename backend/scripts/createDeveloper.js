const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const createDeveloper = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if developer already exists
    const existingDev = await User.findOne({ phoneNumber: '7498939308' });
    if (existingDev) {
      console.log('Developer user already exists');
      process.exit(0);
    }

    // Create developer user
    const developer = await User.create({
      name: 'Developer',
      phoneNumber: '7498939308',
      password: 'developer@123',
      role: 'developer'
    });

    console.log('✅ Developer user created successfully:');
    console.log('Phone: 7498939308');
    console.log('Password: developer@123');
    console.log('Role: developer');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating developer:', error);
    process.exit(1);
  }
};

createDeveloper();