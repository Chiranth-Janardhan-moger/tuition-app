const express = require('express');
const router = express.Router();
const License = require('../models/License');
const { protect, adminOnly, developerOnly } = require('../middleware/auth');
const crypto = require('crypto');

// Encryption key for license generation (store in .env in production)
const LICENSE_SECRET = process.env.LICENSE_SECRET || 'your-secret-key-change-in-production';

// Generate license key
function generateLicenseKey(planType, duration) {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  
  // Encode plan info
  const planCode = {
    'trial': 'T',
    'monthly': 'M',
    'quarterly': 'Q',
    'yearly': 'Y',
    'lifetime': 'L'
  }[planType] || 'T';
  
  // Create checksum
  const data = `${planCode}${duration}${timestamp}${random}`;
  const hash = crypto.createHmac('sha256', LICENSE_SECRET)
    .update(data)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();
  
  // Format: XXXX-XXXX-XXXX-XXXX
  const key = `${planCode}${duration}${random}${hash}`.toUpperCase();
  return `${key.substring(0, 4)}-${key.substring(4, 8)}-${key.substring(8, 12)}-${key.substring(12, 16)}`;
}

// Validate license key format and extract info
function decodeLicenseKey(licenseKey) {
  try {
    const key = licenseKey.replace(/-/g, '');
    if (key.length !== 16) return null;
    
    const planCode = key[0];
    const planType = {
      'T': 'trial',
      'M': 'monthly',
      'Q': 'quarterly',
      'Y': 'yearly',
      'L': 'lifetime'
    }[planCode];
    
    if (!planType) return null;
    
    // Extract duration (next 3 digits)
    const duration = parseInt(key.substring(1, 4));
    if (isNaN(duration)) return null;
    
    return { planType, duration };
  } catch (error) {
    return null;
  }
}

// Get current license status (Admin & Developer)
router.get('/status', protect, async (req, res) => {
  try {
    const license = await License.getActiveLicense();
    
    if (!license) {
      return res.json({
        isActive: false,
        message: 'No active license found'
      });
    }
    
    const daysRemaining = license.daysRemaining();
    const isExpiringSoon = daysRemaining !== null && daysRemaining <= 30;
    
    res.json({
      isActive: true,
      licenseKey: license.licenseKey.replace(/./g, '*').substring(0, 19), // Masked
      organizationName: license.organizationName,
      planType: license.planType,
      activatedAt: license.activatedAt,
      expiresAt: license.expiresAt,
      daysRemaining,
      isExpiringSoon,
      maxStudents: license.maxStudents,
      features: license.features
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Activate license (Admin only)
router.post('/activate', protect, adminOnly, async (req, res) => {
  try {
    const { licenseKey, organizationName } = req.body;
    
    if (!licenseKey || !organizationName) {
      return res.status(400).json({ message: 'License key and organization name are required' });
    }
    
    // Validate format
    const decoded = decodeLicenseKey(licenseKey);
    if (!decoded) {
      return res.status(400).json({ message: 'Invalid license key format' });
    }
    
    // Check if license exists
    const license = await License.findOne({ licenseKey: licenseKey.toUpperCase() });
    if (!license) {
      return res.status(404).json({ message: 'License key not found' });
    }
    
    // Check if already activated
    if (license.isActive) {
      return res.status(400).json({ message: 'This license key has already been activated' });
    }
    
    // Check if expired
    if (license.isExpired) {
      return res.status(400).json({ message: 'This license key has expired' });
    }
    
    // Deactivate any existing active licenses
    await License.updateMany(
      { isActive: true },
      { isActive: false }
    );
    
    // Activate new license
    const now = new Date();
    const expiresAt = decoded.planType === 'lifetime' 
      ? null 
      : new Date(now.getTime() + decoded.duration * 24 * 60 * 60 * 1000);
    
    license.organizationName = organizationName;
    license.isActive = true;
    license.activatedAt = now;
    license.expiresAt = expiresAt;
    license.activatedBy = req.user._id;
    
    await license.save();
    
    res.json({
      message: 'License activated successfully',
      license: {
        organizationName: license.organizationName,
        planType: license.planType,
        activatedAt: license.activatedAt,
        expiresAt: license.expiresAt,
        daysRemaining: license.daysRemaining()
      }
    });
  } catch (error) {
    console.error('License activation error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Generate new license (Developer only)
router.post('/generate', protect, developerOnly, async (req, res) => {
  try {
    const { planType, organizationName, adminEmail, adminPhone, notes } = req.body;
    
    if (!planType || !organizationName) {
      return res.status(400).json({ message: 'Plan type and organization name are required' });
    }
    
    // Determine duration based on plan type
    const durations = {
      'trial': 30,      // 30 days
      'monthly': 30,    // 30 days
      'quarterly': 90,  // 90 days
      'yearly': 365,    // 365 days
      'lifetime': 36500 // 100 years
    };
    
    const duration = durations[planType];
    if (!duration) {
      return res.status(400).json({ message: 'Invalid plan type' });
    }
    
    // Generate unique license key
    let licenseKey;
    let attempts = 0;
    do {
      licenseKey = generateLicenseKey(planType, duration);
      attempts++;
      if (attempts > 10) {
        throw new Error('Failed to generate unique license key');
      }
    } while (await License.findOne({ licenseKey }));
    
    // Create license
    const license = new License({
      licenseKey,
      organizationName,
      adminEmail,
      adminPhone,
      planType,
      planDuration: duration,
      generatedBy: req.user._id,
      notes,
      maxStudents: planType === 'lifetime' ? 10000 : 1000,
      features: planType === 'lifetime' ? ['basic', 'premium', 'advanced'] : ['basic']
    });
    
    await license.save();
    
    res.json({
      message: 'License generated successfully',
      license: {
        licenseKey: license.licenseKey,
        organizationName: license.organizationName,
        planType: license.planType,
        planDuration: license.planDuration,
        maxStudents: license.maxStudents,
        features: license.features
      }
    });
  } catch (error) {
    console.error('License generation error:', error);
    res.status(500).json({ message: error.message });
  }
});

// List all licenses (Developer only)
router.get('/all', protect, developerOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const total = await License.countDocuments();
    const licenses = await License.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('generatedBy', 'name email')
      .populate('activatedBy', 'name phoneNumber')
      .lean();
    
    // Add computed fields
    const licensesWithStatus = licenses.map(license => ({
      ...license,
      daysRemaining: license.expiresAt 
        ? Math.ceil((new Date(license.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
        : null,
      isValid: license.isActive && !license.isExpired && 
        (!license.expiresAt || new Date() < new Date(license.expiresAt))
    }));
    
    res.json({
      licenses: licensesWithStatus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Revoke license (Developer only)
router.post('/:licenseId/revoke', protect, developerOnly, async (req, res) => {
  try {
    const license = await License.findById(req.params.licenseId);
    
    if (!license) {
      return res.status(404).json({ message: 'License not found' });
    }
    
    license.isActive = false;
    license.isExpired = true;
    await license.save();
    
    res.json({ message: 'License revoked successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Extend license (Developer only)
router.post('/:licenseId/extend', protect, developerOnly, async (req, res) => {
  try {
    const { days } = req.body;
    
    if (!days || days <= 0) {
      return res.status(400).json({ message: 'Valid number of days required' });
    }
    
    const license = await License.findById(req.params.licenseId);
    
    if (!license) {
      return res.status(404).json({ message: 'License not found' });
    }
    
    if (!license.expiresAt) {
      return res.status(400).json({ message: 'Cannot extend lifetime license' });
    }
    
    // Extend from current expiry or now, whichever is later
    const baseDate = license.expiresAt > new Date() ? license.expiresAt : new Date();
    license.expiresAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    license.isExpired = false;
    
    await license.save();
    
    res.json({
      message: `License extended by ${days} days`,
      newExpiryDate: license.expiresAt,
      daysRemaining: license.daysRemaining()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
