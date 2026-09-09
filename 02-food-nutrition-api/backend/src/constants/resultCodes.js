const defineResult = (code, httpStatus, message) => Object.freeze({ code, httpStatus, message });

const RESULT_CODES = Object.freeze({
  REQUEST_SUCCESS: defineResult('REQUEST_SUCCESS', 200, '요청을 처리했습니다.'),
  API_INFO_SUCCESS: defineResult('API_INFO_SUCCESS', 200, 'API 정보 조회 성공'),
  FOOD_LIST_SUCCESS: defineResult('FOOD_LIST_SUCCESS', 200, '식품 목록 조회 성공'),
  FOOD_GET_SUCCESS: defineResult('FOOD_GET_SUCCESS', 200, '식품 상세 조회 성공'),
  FOOD_CREATED: defineResult('FOOD_CREATED', 201, '식품 등록 성공'),
  FOOD_UPDATED: defineResult('FOOD_UPDATED', 200, '식품 정보 수정 성공'),
  ADMIN_VERIFIED: defineResult('ADMIN_VERIFIED', 200, '관리자 인증 성공'),
  HEALTH_LIVE: defineResult('HEALTH_LIVE', 200, '프로세스 정상'),
  HEALTH_READY: defineResult('HEALTH_READY', 200, '서비스 준비 완료'),

  VALIDATION_ERROR: defineResult('VALIDATION_ERROR', 400, '입력값을 확인해주세요.'),
  INVALID_JSON: defineResult('INVALID_JSON', 400, '요청 본문을 확인해주세요.'),
  ADMIN_AUTH_REQUIRED: defineResult('ADMIN_AUTH_REQUIRED', 401, '관리자 인증이 필요합니다.'),
  FOOD_NOT_FOUND: defineResult('FOOD_NOT_FOUND', 404, '식품 정보를 찾을 수 없습니다.'),
  ROUTE_NOT_FOUND: defineResult('ROUTE_NOT_FOUND', 404, '요청한 경로를 찾을 수 없습니다.'),
  DUPLICATE_FOOD_CODE: defineResult('DUPLICATE_FOOD_CODE', 409, '이미 등록된 식품코드입니다.'),
  PAYLOAD_TOO_LARGE: defineResult('PAYLOAD_TOO_LARGE', 413, '요청 본문 크기를 초과했습니다.'),
  RATE_LIMIT_EXCEEDED: defineResult(
    'RATE_LIMIT_EXCEEDED',
    429,
    '요청 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.',
  ),
  INTERNAL_ERROR: defineResult('INTERNAL_ERROR', 500, '서버 오류가 발생했습니다.'),
  ADMIN_KEY_NOT_CONFIGURED: defineResult(
    'ADMIN_KEY_NOT_CONFIGURED',
    503,
    '관리자 키가 설정되지 않아 읽기 전용으로 운영 중입니다.',
  ),
  DATABASE_BUSY: defineResult('DATABASE_BUSY', 503, '잠시 후 다시 시도해주세요.'),
  DATABASE_UNAVAILABLE: defineResult('DATABASE_UNAVAILABLE', 503, '데이터베이스 연결 오류'),
});

module.exports = RESULT_CODES;
