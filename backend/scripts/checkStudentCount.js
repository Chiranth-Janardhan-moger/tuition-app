const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const Student = require('../models/Student');

async function checkStudentCount() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const count = await Student.countDocuments();
    console.log('\nTotal students in database:', count);
    
    const students = await Student.find().select('name rollNumber class').lean();
    console.log('\nAll students:');
    students.forEach((student, index) => {
      console.log(`${index + 1}. ${student.name} (${student.rollNumber}) - Class: ${student.class}`);
    });
    
    await mongoose.disconnect();
    console.log('\n✓ Done');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStudentCount();
