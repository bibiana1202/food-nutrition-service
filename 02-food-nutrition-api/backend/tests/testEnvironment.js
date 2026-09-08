if (process.env.NODE_ENV !== 'test') {
  throw new Error('테스트는 NODE_ENV=test 환경에서만 실행할 수 있습니다.');
}

if (!process.env.MARIADB_DATABASE?.endsWith('_test')) {
  throw new Error('테스트 DB 이름은 _test로 끝나야 합니다.');
}
