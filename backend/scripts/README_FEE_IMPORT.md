# Fee Data Import - Quick Start Guide

## 🚀 Quick Start (3 Steps)

### Option 1: Using CSV (Easier for Excel Users)

1. **Create your CSV file**
   ```bash
   # Copy the template
   cp backend/scripts/feeDataTemplate.csv backend/scripts/feeData.csv
   ```

2. **Edit in Excel/Google Sheets**
   - Open `feeData.csv` in Excel or Google Sheets
   - Replace template data with your actual data
   - Save as CSV

3. **Convert and Import**
   ```bash
   # Convert CSV to JSON
   node backend/scripts/csvToJson.js
   
   # Import to database
   node backend/scripts/importFeeData.js
   ```

### Option 2: Using JSON (Direct)

1. **Create your JSON file**
   ```bash
   # Copy the template
   cp backend/scripts/feeDataTemplate.json backend/scripts/feeData.json
   ```

2. **Edit the JSON file**
   - Open `feeData.json` in a text editor
   - Replace template data with your actual data

3. **Import**
   ```bash
   node backend/scripts/importFeeData.js
   ```

## 📋 CSV Format

Your CSV should have these columns:

| Column | Required | Example |
|--------|----------|---------|
| Student Name | ✅ | John Doe |
| Joining Date | ⚠️ | 2024-08-08 |
| Monthly Fee | ⚠️ | 5000 |
| Fee Name | ✅ | August 2024 Fee |
| Fee Amount | ✅ | 5000 |
| Period Start | ✅ | 2024-08-08 |
| Period End | ✅ | 2024-09-07 |
| Status | ✅ | paid |
| Paid Date | ⚠️ | 2024-08-10 |
| Remarks | ⚠️ | Paid in cash |

**Status values**: `paid`, `pending`, `overdue`, `waived`

## 📝 Example CSV Data

```csv
Student Name,Joining Date,Monthly Fee,Fee Name,Fee Amount,Period Start,Period End,Status,Paid Date,Remarks
Rahul Kumar,2024-08-15,6000,August 2024 Fee,6000,2024-08-15,2024-09-14,paid,2024-08-20,First month
Rahul Kumar,2024-08-15,6000,September 2024 Fee,6000,2024-09-15,2024-10-14,paid,2024-09-18,
Rahul Kumar,2024-08-15,6000,October 2024 Fee,6000,2024-10-15,2024-11-14,paid,2024-10-20,
Rahul Kumar,2024-08-15,6000,November 2024 Fee,6000,2024-11-15,2024-12-14,paid,2024-11-22,
Rahul Kumar,2024-08-15,6000,December 2024 Fee,6000,2024-12-15,2025-01-14,paid,2024-12-20,
Rahul Kumar,2024-08-15,6000,January 2025 Fee,6000,2025-01-15,2025-02-14,pending,,
```

## 🎯 Tips for Your 5-Month History

Since you mentioned you've already collected fees for 5 months, here's how to structure it:

### For Each Student:

1. **List all 5 paid months** with status = `paid` and their paid dates
2. **Add current month** with status = `pending` or `overdue`
3. **Use consistent dates** for period start/end based on joining date

### Example for a Student Who Joined Aug 8, 2024:

```csv
Student Name,Joining Date,Monthly Fee,Fee Name,Fee Amount,Period Start,Period End,Status,Paid Date,Remarks
Amit Patel,2024-08-08,5000,August 2024 Fee,5000,2024-08-08,2024-09-07,paid,2024-08-10,
Amit Patel,2024-08-08,5000,September 2024 Fee,5000,2024-09-08,2024-10-07,paid,2024-09-12,
Amit Patel,2024-08-08,5000,October 2024 Fee,5000,2024-10-08,2024-11-07,paid,2024-10-15,
Amit Patel,2024-08-08,5000,November 2024 Fee,5000,2024-11-08,2024-12-07,paid,2024-11-20,
Amit Patel,2024-08-08,5000,December 2024 Fee,5000,2024-12-08,2025-01-07,paid,2024-12-18,
Amit Patel,2024-08-08,5000,January 2025 Fee,5000,2025-01-08,2025-02-07,pending,,
```

## ⚠️ Important Notes

1. **Student Names Must Match**: The student name in your CSV/JSON must exactly match the name in your database
2. **Date Format**: Always use `YYYY-MM-DD` format (e.g., 2024-08-08)
3. **Paid Dates**: If status is `paid`, include the paid date
4. **Backup First**: Always backup your database before importing

## 🔍 Verification

After import, verify in the app:
1. Login as admin
2. Go to "Manage Fees"
3. Click on a student to see their fee history
4. Check that all fees are showing correctly

## 🆘 Troubleshooting

### "Student not found"
- Check that student names match exactly (case-sensitive)
- Verify students exist in the database

### "Invalid date format"
- Use YYYY-MM-DD format only
- Don't use slashes (/) or other separators

### "CSV conversion failed"
- Check that all required columns are present
- Ensure no extra commas in data fields
- Save as CSV UTF-8 format

## 📞 Need Help?

See the detailed guide: `FEE_IMPORT_GUIDE.md`

## 🎉 Success!

Once imported, all historical fee data will be visible in the app, and you can continue managing fees normally through the app interface.
