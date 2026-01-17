const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Leave = require('../models/Leave');
const Student = require('../models/Student');
const User = require('../models/User');

dotenv.config();

async function cleanInvalidLeaves() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tuition-app');
    console.log('Connected to MongoDB');

    // Get all leaves
    const leaves = await Leave.find();
    console.log(`Found ${leaves.length} total leave records`);

    let deletedCount = 0;

    for (const leave of leaves) {
      let shouldDelete = false;

      // Check if student exists
      if (leave.studentId) {
        const student = await Student.findById(leave.studentId);
        if (!student) {
          console.log(`Leave ${leave._id} has invalid studentId: ${leave.studentId}`);
          shouldDelete = true;
        }
      } else {
        console.log(`Leave ${leave._id} has no studentId`);
        shouldDelete = true;
      }

      // Check if parent exists
      if (leave.parentId) {
        const parent = await User.findById(leave.parentId);
        if (!parent) {
          console.log(`Leave ${leave._id} has invalid parentId: ${leave.parentId}`);
          shouldDelete = true;
        }
      } else {
        console.log(`Leave ${leave._id} has no parentId`);
        shouldDelete = true;
      }

      if (shouldDelete) {
        await Leave.findByIdAndDelete(leave._id);
        deletedCount++;
        console.log(`Deleted invalid leave: ${leave._id}`);
      }
    }

    console.log(`\nCleanup complete!`);
    console.log(`Total leaves: ${leaves.length}`);
    console.log(`Deleted: ${deletedCount}`);
    console.log(`Remaining: ${leaves.length - deletedCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanInvalidLeaves();
