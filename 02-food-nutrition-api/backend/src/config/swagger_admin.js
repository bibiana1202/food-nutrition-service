module.exports = {
  '/api/admin/verify': {
    post: {
      tags: ['Admin'],
      summary: '관리자 키 확인',
      description: 'Authorization 헤더로 전달한 관리자 키가 유효한지 확인합니다.',
      security: [{ AdminKey: [] }],
      responses: {
        200: {
          description: '인증 성공',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AdminVerification' },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        429: { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },
};
