# API Result Codes

API는 HTTP 상태 코드와 별도로 안정적인 문자열 `code`를 반환한다. HTTP 상태는 요청의 표준 처리 결과를 나타내며, `code`는 프론트엔드와 외부 클라이언트가 세부 결과를 구분할 때 사용한다. 클라이언트는 변경될 수 있는 `message` 문구를 파싱하지 않고 `code`를 기준으로 분기해야 한다.

## 성공 응답

| HTTP | Code                | 설명                       |
| ---- | ------------------- | -------------------------- |
| 200  | `REQUEST_SUCCESS`   | 일반 요청 성공             |
| 200  | `API_INFO_SUCCESS`  | API 정보 조회 성공         |
| 200  | `FOOD_LIST_SUCCESS` | 식품 목록 조회 성공        |
| 200  | `FOOD_GET_SUCCESS`  | 식품 상세 조회 성공        |
| 201  | `FOOD_CREATED`      | 식품 등록 성공             |
| 200  | `FOOD_UPDATED`      | 식품 정보 수정 성공        |
| 200  | `ADMIN_VERIFIED`    | 관리자 인증 성공           |
| 200  | `HEALTH_LIVE`       | 프로세스 생존 확인 성공    |
| 200  | `HEALTH_READY`      | 서비스 준비 상태 확인 성공 |

삭제 성공은 HTTP 204를 반환하며 응답 본문을 포함하지 않는다.

## 오류 응답

| HTTP | Code                       | 설명                                    |
| ---- | -------------------------- | --------------------------------------- |
| 400  | `VALIDATION_ERROR`         | 요청 파라미터 또는 본문 검증 실패       |
| 400  | `INVALID_JSON`             | 올바르지 않은 JSON 본문                 |
| 401  | `ADMIN_AUTH_REQUIRED`      | 관리자 인증 누락 또는 실패              |
| 404  | `FOOD_NOT_FOUND`           | 요청한 식품을 찾을 수 없음              |
| 404  | `ROUTE_NOT_FOUND`          | 요청한 API 경로를 찾을 수 없음          |
| 409  | `DUPLICATE_FOOD_CODE`      | 이미 등록된 식품코드                    |
| 413  | `PAYLOAD_TOO_LARGE`        | 요청 본문 크기 제한 초과                |
| 429  | `RATE_LIMIT_EXCEEDED`      | API 요청 횟수 제한 초과                 |
| 500  | `INTERNAL_ERROR`           | 처리되지 않은 서버 내부 오류            |
| 503  | `ADMIN_KEY_NOT_CONFIGURED` | 관리자 키 미설정으로 쓰기 기능 비활성화 |
| 503  | `DATABASE_BUSY`            | 데이터베이스 잠금 대기 또는 교착 상태   |
| 503  | `DATABASE_UNAVAILABLE`     | 데이터베이스 연결 불가                  |

## 응답 예시

성공 응답:

```json
{
  "success": true,
  "code": "FOOD_GET_SUCCESS",
  "message": "식품 상세 조회 성공",
  "data": { "id": 1, "food_name": "꿩불고기" },
  "request_id": "7ada65eb-9f91-45a1-ab4d-205b9b850f06"
}
```

오류 응답:

```json
{
  "success": false,
  "code": "FOOD_NOT_FOUND",
  "message": "식품 정보를 찾을 수 없습니다.",
  "details": [],
  "request_id": "7ada65eb-9f91-45a1-ab4d-205b9b850f06"
}
```

코드의 실제 정의는 `src/constants/resultCodes.js`에서 관리한다. 공개된 코드의 의미는 변경하지 않으며 새로운 상황은 기존 코드를 재사용하기보다 별도 코드를 추가한다.
