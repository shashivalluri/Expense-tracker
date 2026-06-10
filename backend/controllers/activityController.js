const ActivityLog = require('../models/ActivityLog');

// @desc    Get current user activity audit logs
// @route   GET /api/activities
// @access  Private
exports.getActivityLogs = async (req, res, next) => {
  try {
    const logs = await ActivityLog.find({ user_id: req.user._id })
      .sort({ timestamp: -1 })
      .limit(100);

    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear user activity logs
// @route   DELETE /api/activities
// @access  Private
exports.clearActivityLogs = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await ActivityLog.deleteMany({ user_id: userId });

    await ActivityLog.create({
      user_id: userId,
      action_type: 'CLEAR_LOGS',
      description: 'User cleared historical activity audit logs',
      ip_address: req.ip || req.connection?.remoteAddress || '127.0.0.1',
      timestamp: new Date(),
    });

    res.status(200).json({ success: true, message: 'Activity logs cleared successfully' });
  } catch (error) {
    next(error);
  }
};
