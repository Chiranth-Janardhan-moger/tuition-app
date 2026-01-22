# Fee Data Import Guide

This guide explains how to bulk import historical fee data for students.

## Quick Start

1. **Create your data file**: Copy `feeDataTemplate.json` to `feeData.json`
2. **Edit the data**: Add your students and their fee records
3. **Run the import**: `node backend/scripts/importFeeData.js`

## File Format

The import file should be a JSON array with the following structure:

```json
[
  {
    "studentName": "Student Full Name",
    "joiningDate": "YYYY-MM-DD",
    "monthlyFee": 5000,
    "fees": [
      {
        "feeName": "Month Year Fee",
        "feeAmount": 5000,
        "periodStart": "YYYY-MM-DD",
        "periodEnd": "YYYY-MM-DD",
        "status": "paid",
        "paidDate": "YYYY-MM-DD",
        "remarks": "Optional remarks"
      }
    ]
  }
]
```

## Field Descriptions

### Student Level Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `studentName` | ✅ Yes | Exact name as in database | "John Doe" |
| `joiningDate` | ⚠️ Optional | Student's joining date | "2024-08-08" |
| `monthlyFee` | ⚠️ Optional | Monthly fee amount | 5000 |
| `fees` | ✅ Yes | Array of fee records | See below |

### Fee Record Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `feeName` | ✅ Yes | Name of the fee cycle | "August 2024 Fee" |
| `feeAmount` | ✅ Yes | Fee amount | 5000 |
| `periodStart` | ✅ Yes | Fee period start date | "2024-08-08" |
| `periodEnd` | ✅ Yes | Fee period end date | "2024-09-07" |
| `status` | ✅ Yes | Payment status | "paid", "pending", "overdue", "waived" |
| `paidDate` | ⚠️ Optional | Date when fee was paid | "2024-08-10" |
| `remarks` | ⚠️ Optional | Additional notes | "Paid in cash" |

## Status Values

- **`paid`**: Fee has been paid
- **`pending`**: Fee is due but not yet paid
- **`overdue`**: Fee is past due date
- **`waived`**: Fee has been waived/exempted

## Step-by-Step Instructions

### Step 1: Prepare Your Data

1. Open `feeDataTemplate.json` in a text editor
2. Copy it to create `feeData.json`
3. Replace the template data with your actual student data

### Step 2: Format Your Data

**Important Notes:**
- Student names must match exactly with names in the database
- Dates must be in `YYYY-MM-DD` format
- Status must be one of: `paid`, `pending`, `overdue`, `waived`
- If status is `paid`, include `paidDate`

### Step 3: Run the Import

```bash
# From the project root directory
node backend/scripts/importFeeData.js
```

### Step 4: Review Results

The script will show:
- ✓ Successfully processed students
- ❌ Errors (if any)
- Summary of import results

## Example Scenarios

### Scenario 1: Student with 5 Months Paid History

```json
{
  "studentName": "Rahul Kumar",
  "joiningDate": "2024-08-15",
  "monthlyFee": 6000,
  "fees": [
    {
      "feeName": "August 2024 Fee",
      "feeAmount": 6000,
      "periodStart": "2024-08-15",
      "periodEnd": "2024-09-14",
      "status": "paid",
      "paidDate": "2024-08-20",
      "remarks": "First month - paid in cash"
    },
    {
      "feeName": "September 2024 Fee",
      "feeAmount": 6000,
      "periodStart": "2024-09-15",
      "periodEnd": "2024-10-14",
      "status": "paid",
      "paidDate": "2024-09-18"
    },
    {
      "feeName": "October 2024 Fee",
      "feeAmount": 6000,
      "periodStart": "2024-10-15",
      "periodEnd": "2024-11-14",
      "status": "paid",
      "paidDate": "2024-10-20"
    },
    {
      "feeName": "November 2024 Fee",
      "feeAmount": 6000,
      "periodStart": "2024-11-15",
      "periodEnd": "2024-12-14",
      "status": "paid",
      "paidDate": "2024-11-22"
    },
    {
      "feeName": "December 2024 Fee",
      "feeAmount": 6000,
      "periodStart": "2024-12-15",
      "periodEnd": "2025-01-14",
      "status": "paid",
      "paidDate": "2024-12-20"
    },
    {
      "feeName": "January 2025 Fee",
      "feeAmount": 6000,
      "periodStart": "2025-01-15",
      "periodEnd": "2025-02-14",
      "status": "pending"
    }
  ]
}
```

### Scenario 2: Student with Mixed Payment Status

```json
{
  "studentName": "Priya Sharma",
  "joiningDate": "2024-10-01",
  "monthlyFee": 5500,
  "fees": [
    {
      "feeName": "October 2024 Fee",
      "feeAmount": 5500,
      "periodStart": "2024-10-01",
      "periodEnd": "2024-10-31",
      "status": "paid",
      "paidDate": "2024-10-05"
    },
    {
      "feeName": "November 2024 Fee",
      "feeAmount": 5500,
      "periodStart": "2024-11-01",
      "periodEnd": "2024-11-30",
      "status": "paid",
      "paidDate": "2024-11-08"
    },
    {
      "feeName": "December 2024 Fee",
      "feeAmount": 5500,
      "periodStart": "2024-12-01",
      "periodEnd": "2024-12-31",
      "status": "waived",
      "remarks": "Holiday concession"
    },
    {
      "feeName": "January 2025 Fee",
      "feeAmount": 5500,
      "periodStart": "2025-01-01",
      "periodEnd": "2025-01-31",
      "status": "overdue"
    }
  ]
}
```

## Tips for Creating Your Data File

### 1. Use a Spreadsheet First

Create your data in Excel/Google Sheets, then convert to JSON:

| Student Name | Joining Date | Monthly Fee | Fee Name | Period Start | Period End | Status | Paid Date | Remarks |
|--------------|--------------|-------------|----------|--------------|------------|--------|-----------|---------|
| John Doe | 2024-08-08 | 5000 | August 2024 Fee | 2024-08-08 | 2024-09-07 | paid | 2024-08-10 | Cash |

### 2. Calculate Period Dates

For monthly cycles starting on the 8th:
- Period Start: 8th of month
- Period End: 7th of next month

Example:
- August cycle: 2024-08-08 to 2024-09-07
- September cycle: 2024-09-08 to 2024-10-07

### 3. Validate Before Import

Check:
- ✓ All student names match database exactly
- ✓ All dates are in YYYY-MM-DD format
- ✓ All status values are valid
- ✓ Paid fees have paidDate
- ✓ JSON syntax is correct (use a JSON validator)

## Troubleshooting

### Error: "Student not found"
**Solution**: Check that the student name matches exactly with the database. Names are case-sensitive.

### Error: "Invalid date format"
**Solution**: Ensure all dates are in YYYY-MM-DD format (e.g., 2024-08-08, not 08/08/2024)

### Error: "Invalid JSON"
**Solution**: Use a JSON validator (jsonlint.com) to check your file syntax

### Error: "Cannot connect to database"
**Solution**: Ensure MongoDB is running and .env file has correct MONGODB_URI

## Advanced Usage

### Update Existing Fees

The script automatically updates existing fees if they match the student and period start date. This allows you to:
- Correct payment status
- Update paid dates
- Add remarks to existing fees

### Dry Run (Test Mode)

To test without making changes, you can modify the script to log actions instead of saving:

```javascript
// Comment out the save operations
// await student.save();
// await existingFee.save();
console.log('Would save:', studentData.studentName);
```

## Support

If you encounter issues:
1. Check the error messages in the console
2. Verify your JSON file format
3. Ensure student names match the database
4. Check MongoDB connection

## Example Complete File

See `feeDataTemplate.json` for a complete working example with multiple students and various fee scenarios.
