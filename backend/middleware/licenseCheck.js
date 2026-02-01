const License = require('../models/License');

// Middleware to check if system has valid license
const checkLicense = async (req, res, next) => {
  try {
    // Skip license check for license routes and auth routes
    if (req.path.startsWith('/api/license') || req.path.startsWith('/api/auth')) {
      return next();
    }
    
    // Get active license
    const license = await License.getActiveLicense();
    
    if (!license) {
      return res.status(403).json({
        error: 'LICENSE_EXPIRED',
        message: 'System license has expired. Please contact administrator to renew.',
        requiresLicense: true
      });
    }
    
    // Check if expiring soon (within 7 days)
    const daysRemaining = license.daysRemaining();
    if (daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0) {
      // Add warning header but allow request
      res.setHeader('X-License-Warning', `License expires in ${daysRemaining} days`);
    }
    
    // Attach license info to request
    req.license = {
      organizationName: license.organizationName,
      planType: license.planType,
      expiresAt: license.expiresAt,
      daysRemaining,
      maxStudents: license.maxStudents,
      features: license.features
    };
    
    next();
  } catch (error) {
    console.error('License check error:', error);
    // On error, allow request but log the issue
    next();
  }
};

module.exports = { checkLicense };
