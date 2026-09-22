// 저장소 구현이나 HTTP 응답 형식에 의존하지 않는 애플리케이션 오류.
class FoodNotFoundError extends Error {
  constructor() {
    super('식품이 존재하지 않습니다.');
  }
}
class DuplicateFoodCodeError extends Error {
  constructor() {
    super('식품코드가 이미 존재합니다.');
  }
}
class StorageBusyError extends Error {
  constructor() {
    super('저장소가 사용 중입니다.');
  }
}
class StorageError extends Error {
  constructor() {
    super('저장소 작업에 실패했습니다.');
  }
}
module.exports = { FoodNotFoundError, DuplicateFoodCodeError, StorageBusyError, StorageError };
