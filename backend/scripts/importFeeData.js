const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Student = require('../models/Student');
const Fee = require('../models/Fee');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tuition-app', {
  maxPoolSize: 10,
  minPoolSize: 2
})
.then(() => console.log('✓ MongoDB Connected'))
.catch(err => {
  console.error('❌ MongoDB Error:', err);
  process.exit(1);
});

/**
 * Import fee data from JSON file
 * 
 * Expected JSON format:
 * [
 *   {
 *     "studentName": "John Doe",
 *     "joiningDate": "2024-08-08",
 *     "monthlyFee": 5000,
 *     "fees": [
 *       {
 *         "feeName": "August 2024 Fee",
 *         "feeAmount": 5000,
 *         "periodStart": "2024-08-08",
 *         "periodEnd": "2024-09-07",
 *         "status": "paid",
 *         "paidDate": "2024-08-10",
 *         "remarks": "Paid in cash"
 *       },
 *       {
 *         "feeName": "September 2024 Fee",
 *         "feeAmount": 5000,
 *         "periodStart": "2024-09-08",
 *         "periodEnd": "2024-10-07",
 *         "status": "paid",
 *         "paidDate": "2024-09-12"
 *       }
 *     ]
 *   }
 * ]
 */
async function importFeeData() {
  try {
    // Read the JSON file
    const filePath = path.join(__dirname, 'feeData.json');
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ File not found: feeData.json');
      console.log('\nPlease create a file named "feeData.json" in the backend/scripts folder');
      console.log('See feeDataTemplate.json for the expected format');
      process.exit(1);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const feeData = JSON.parse(fileContent);

    console.log(`\n📊 Found ${feeData.length} students in the file\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const studentData of feeData) {
      try {
        console.log(`Processing: ${studentData.studentName}...`);

        // Find student by name
        const student = await Student.findOne({ name: studentData.studentName });
        
        if (!student) {
          throw new Error(`Student not found: ${studentData.studentName}`);
        }

        // Update student's joining date and monthly fee if provided
        if (studentData.joiningDate) {
          student.joiningDate = new Date(studentData.joiningDate);
        }
        if (studentData.monthlyFee) {
          student.monthlyFee = studentData.monthlyFee;
        }
        await student.save();

        // Import fees
        if (studentData.fees && studentData.fees.length > 0) {
          for (const feeInfo of studentData.fees) {
            // Check if fee already exists
            const existingFee = await Fee.findOne({
              studentId: student._id,
              periodStart: new Date(feeInfo.periodStart)
            });

            if (existingFee) {
              // Update existing fee
              existingFee.feeName = feeInfo.feeName;
              existingFee.feeAmount = feeInfo.feeAmount;
              existingFee.periodEnd = new Date(feeInfo.periodEnd);
              existingFee.status = feeInfo.status;
              if (feeInfo.paidDate) {
                existingFee.paidDate = new Date(feeInfo.paidDate);
              }
              if (feeInfo.remarks) {
                existingFee.remarks = feeInfo.remarks;
              }
              await existingFee.save();
              console.log(`  ✓ Updated: ${feeInfo.feeName}`);
            } else {
              // Create new fee
              await Fee.create({
                studentId: student._id,
                feeName: feeInfo.feeName,
                feeAmount: feeInfo.feeAmount,
                periodStart: new Date(feeInfo.periodStart),
                periodEnd: new Date(feeInfo.periodEnd),
                status: feeInfo.status,
                paidDate: feeInfo.paidDate ? new Date(feeInfo.paidDate) : undefined,
                remarks: feeInfo.remarks
              });
              console.log(`  ✓ Created: ${feeInfo.feeName}`);
            }
          }
        }

        successCount++;
        console.log(`✓ Successfully processed ${studentData.studentName}\n`);

      } catch (error) {
        errorCount++;
        const errorMsg = `${studentData.studentName}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ Error: ${errorMsg}\n`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('IMPORT SUMMARY');
    console.log('='.repeat(50));
    console.log(`✓ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    console.log('\n✓ Import completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the import
importFeeData();
