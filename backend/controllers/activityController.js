const mongoose = require('mongoose');
const ActivityLog = require('../models/ActivityLog');
const mockStorage = require('../utils/mockStorage');

// @desc    Get current user activity audit logs
// @route   GET /api/activities
// @access  Private
exports.getActivityLogs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const dbConnected = mongoose.connection.readyState === 1;
    let logs = [];

    if (dbConnected) {
      logs = await ActivityLog.find({ userId }).sort({ timestamp: -1 }).limit(100);
    } else {
      logs = mockStorage.activitylogs.find({ userId });
    }

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
    const userId = req.user.id;
    const dbConnected = mongoose.connection.readyState === 1;

    if (dbConnected) {
      await ActivityLog.deleteMany({ userId });
      // Insert one fresh log showing logs were cleared
      await ActivityLog.create({
        userId,
        actionType: 'CLEAR_LOGS',
        description: 'User cleared historical activity audit logs',
        ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1'
      });
    } else {
      mockStorage.activitylogs.deleteMany({ userId });
      mockStorage.activitylogs.create({
        userId,
        actionType: 'CLEAR_LOGS',
        description: 'User cleared historical activity audit logs',
        ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1'
      });
    }

    res.status(200).json({ success: true, message: 'Activity logs cleared successfully' });

  } catch (error) {
    next(error);
  }
};
