module.exports = {
  '/health/live': {
    get: {
      tags: ['Health'],
      summary: '프로세스 상태 확인',
      responses: {
        200: {
          description: '프로세스 정상',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Liveness' } },
          },
        },
      },
    },
  },
  '/health/ready': {
    get: {
      tags: ['Health'],
      summary: '서비스 준비 상태 확인',
      description: 'API 프로세스가 MariaDB에 접근할 수 있는지 확인합니다.',
      responses: {
        200: {
          description: '서비스 준비 완료',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Readiness' } },
          },
        },
        503: {
          description: '데이터베이스 연결 오류',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ReadinessFailure' } },
          },
        },
      },
    },
  },
};
