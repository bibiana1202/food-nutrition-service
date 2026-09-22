/**
 * 서비스가 사용하는 저장소 계약. Sequelize 타입/옵션/트랜잭션을 노출하지 않는다.
 * 모든 식품은 일반 객체이며 날짜는 ISO 문자열, id는 기존 API와 같은 숫자/문자열이다.
 * 구현은 중복 코드를 DuplicateFoodCodeError, 일시적 충돌을 StorageBusyError,
 * 나머지 저장소 실패를 StorageError로 변환한다. 원본 ORM 오류도 외부로 전달하지 않는다.
 *
 * @typedef {Object} FoodRepository
 * @property {function(object): Promise<object[]>} search 검색 조건, cursor, limit으로 id 오름차순 조회
 * @property {function(number|string): Promise<object|null>} findById
 * @property {function(object): Promise<object>} create 저장된 기본값을 포함한 식품 반환
 * @property {function(number|string, object): Promise<object|null>} update 없으면 null
 * @property {function(number|string): Promise<boolean>} remove 삭제 여부
 * @property {function(AsyncIterable<object[]>): Promise<number>} importBatches
 *   모든 배치를 원자적으로 적재하고 삽입 수 반환. 기존 코드는 수정하지 않는다.
 *   배치 생성 중 오류도 전체 롤백하고 원래 검증 오류를 유지한다.
 */
module.exports = {};
