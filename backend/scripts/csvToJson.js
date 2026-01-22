const fs = require('fs');
const path = require('path');

/**
 * Convert CSV fee data to JSON format
 * 
 * This script converts feeData.csv to feeData.json
 * which can then be imported using importFeeData.js
 */

function csvToJson() {
  try {
    const csvPath = path.join(__dirname, 'feeData.csv');
    const jsonPath = path.join(__dirname, 'feeData.json');

    if (!fs.existsSync(csvPath)) {
      console.error('❌ File not found: feeData.csv');
      console.log('\nPlease create a file named "feeData.csv" in the backend/scripts folder');
      console.log('See feeDataTemplate.csv for the expected format');
      process.exit(1);
    }

    // Read CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      console.error('❌ CSV file is empty or has no data rows');
      process.exit(1);
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim());
    console.log('CSV Headers:', header);

    // Expected headers
    const expectedHeaders = [
      'Student Name',
      'Joining Date',
      'Monthly Fee',
      'Fee Name',
      'Fee Amount',
      'Period Start',
      'Period End',
      'Status',
      'Paid Date',
      'Remarks'
    ];

    // Validate headers
    const missingHeaders = expectedHeaders.filter(h => !header.includes(h));
    if (missingHeaders.length > 0) {
      console.error('❌ Missing required headers:', missingHeaders.join(', '));
      console.log('\nExpected headers:', expectedHeaders.join(', '));
      process.exit(1);
    }

    // Parse data rows
    const studentsMap = new Map();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      
      const studentName = values[0];
      const joiningDate = values[1];
      const monthlyFee = parseFloat(values[2]);
      const feeName = values[3];
      const feeAmount = parseFloat(values[4]);
      const periodStart = values[5];
      const periodEnd = values[6];
      const status = values[7];
      const paidDate = values[8];
      const remarks = values[9];

      // Validate required fields
      if (!studentName || !feeName || !periodStart || !periodEnd || !status) {
        console.warn(`⚠️ Skipping row ${i + 1}: Missing required fields`);
        continue;
      }

      // Get or create student entry
      if (!studentsMap.has(studentName)) {
        studentsMap.set(studentName, {
          studentName,
          joiningDate: joiningDate || undefined,
          monthlyFee: monthlyFee || undefined,
          fees: []
        });
      }

      const student = studentsMap.get(studentName);

      // Add fee record
      const feeRecord = {
        feeName,
        feeAmount: feeAmount || student.monthlyFee || 0,
        periodStart,
        periodEnd,
        status
      };

      if (paidDate) {
        feeRecord.paidDate = paidDate;
      }

      if (remarks) {
        feeRecord.remarks = remarks;
      }

      student.fees.push(feeRecord);
    }

    // Convert map to array
    const jsonData = Array.from(studentsMap.values());

    // Write JSON file
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');

    console.log('\n✓ Conversion successful!');
    console.log(`✓ Processed ${jsonData.length} students`);
    console.log(`✓ Total fee records: ${jsonData.reduce((sum, s) => sum + s.fees.length, 0)}`);
    console.log(`✓ Output file: ${jsonPath}`);
    console.log('\nNext step: Run "node backend/scripts/importFeeData.js" to import the data');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the conversion
csvToJson();
