const express = require('express');
const HealthController = require('../controllers/healthController');

const router = express.Router();

// 프로세스가 실행 중인지 확인한다. DB 연결 상태와 관계없이 응답한다.
router.get('/live', HealthController.live);

// API가 요청을 처리할 준비가 됐는지 DB 연결까지 포함해 확인한다.
router.get('/ready', HealthController.ready);

module.exports = router;
