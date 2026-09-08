const { Food } = require('../models');
const logger = require('../utils/logger');

exports.live = async (_req, res) => {
  res.json({ status: 'ok' });
};

exports.ready = async (_req, res) => {
  try {
    await Food.findOne({ attributes: ['id'], raw: true });
    res.json({ status: 'ok', database: 'ok' });
  } catch (error) {
    logger.error('MariaDB 준비 상태 확인 실패', { error: error.message });
    res.status(503).json({ status: 'unavailable', database: 'error' });
  }
};
