const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createDeveloper = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if developer already exists
    const existingDev = await User.findOne({ phoneNumber: '9071911793' });
    if (existingDev) {
      console.log('Developer user already exists');
      process.exit(0);
    }

    // Create developer user
    const developer = await User.create({
      name: 'Developer',
      phoneNumber: '9071911793',
      password: 'developer@123',
      role: 'developer'
    });

    console.log('✅ Developer user created successfully:');
    console.log('Phone: 9071911793');
    console.log('Password: developer@123');
    console.log('Role: developer');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating developer:', error);
    process.exit(1);
  }
};

createDeveloper();