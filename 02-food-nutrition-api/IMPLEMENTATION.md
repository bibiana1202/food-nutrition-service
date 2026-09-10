# 구현 보고서

## 1. 데이터 적재

### 실행 방법

Docker 환경에서는 다음 명령으로 이미지를 만들고 원본 데이터를 적재한다.

```bash
docker compose build
docker compose run --rm seed
```

`src/scripts/seedFoods.js`가 DB 연결, migration 적용, Excel 적재와 결과 로깅을 순서대로 실행한다. 적재가 끝나면 읽은 행 수, 새로 저장한 행 수와 중복으로 건너뛴 행 수를 출력한다.

### 적재 결과 검증

Docker 환경에서는 적재가 끝난 뒤 다음 명령으로 DB에 저장된 건수와 대표 데이터를 검증한다.

```bash
docker compose exec api npm run db:verify
```

이 명령은 실행 중인 API 컨테이너에서 `src/scripts/verifyData.js`를 실행한다. 실제 실행 결과는 다음과 같다.

```text
> food-nutrition-api@1.0.0 db:verify
> node src/scripts/verifyData.js

2026-09-10 06:04:14 [info] MariaDB 연결 성공 {"environment":"local"}
{
  "count": 7683,
  "sample": {
    "id": 1,
    "food_cd": "D000006",
    "food_name": "꿩불고기",
    "group_name": "구이류",
    "research_year": 2019,
    "maker_name": "충주",
    "ref_name": "외식영양성분자료집 통합본(2012-2017년)",
    "source_notes": null,
    "serving_unit": "g",
    "serving_size": 500,
    "calorie": 368.8,
    "carbohydrate": 39.7,
    "protein": 33.5,
    "fat": 8.5,
    "sugars": 16.9,
    "sodium": 1264.31,
    "cholesterol": 106.18,
    "saturated_fatty_acids": 1.9,
    "trans_fat": 0.1,
    "created_at": "2026-09-09T06:58:08.027Z",
    "updated_at": "2026-09-09T06:58:08.033Z"
  }
}
2026-09-10 06:04:14 [info] MariaDB 연결 종료 {"environment":"local"}
```

`verifyData.js`는 다음 조건을 검사한다.

- `foods` 테이블에 데이터가 한 건 이상 저장되어 있는지 확인한다.
- 원본의 대표 식품코드인 `D000006`이 DB에 존재하는지 확인한다.
- 대표 데이터의 식품명이 `꿩불고기`인지 확인한다.
- 대표 데이터의 열량이 원본과 같은 `368.8`인지 확인한다.

검증 과정에서 조회한 전체 건수는 **7,683건**이었다. 조건 중 하나라도 일치하지 않으면 `데이터 검증 실패` 오류와 함께 명령이 실패 상태로 종료된다.

적재된 데이터가 애플리케이션을 통해 조회되는지도 다음 API로 확인할 수 있다.

```http
GET /api/foods
GET /api/foods?food_code=D000006
```

대표 데이터 검색 시 `꿩불고기`와 원본 영양성분이 반환되는 것을 확인했다. 따라서 원본 파일 읽기, 데이터 정제와 검증, MariaDB 적재, API 조회까지 요구사항의 전체 흐름을 구현했다.

### 재실행 시 중복 방지

`ImportService.importFoods`는 `food_cd` UNIQUE 인덱스를 근거로 `Food.bulkCreate(batch, { ignoreDuplicates: true, ... })`를 사용한다. 이미 저장된 식품코드는 조용히 건너뛰고 새 코드만 INSERT하므로, 같은 파일을 여러 번 적재해도 행이 중복되지 않고 그 사이 관리자가 수정한 값도 덮어쓰지 않는다. 워크시트 하나 전체를 하나의 트랜잭션으로 묶어 처리하므로 중간 행에서 오류가 나면 해당 시트의 적재분 전체가 롤백된다.

이미 7,683건이 적재된 상태에서 `docker compose run --rm seed`를 다시 실행한 실제 결과다.

```text
> node src/scripts/seedFoods.js

2026-09-10 15:21:02 [info] MariaDB 연결 성공 {"environment":"local"}
2026-09-10 15:21:03 [info] 식품 데이터 적재 완료 {"environment":"local","rows":7683,"inserted":0,"skipped":7683}
2026-09-10 15:21:03 [info] MariaDB 연결 종료 {"environment":"local"}
```

읽은 행(`rows`)은 그대로 7,683건이지만 새로 저장된 행(`inserted`)은 0건이고 전부 중복으로 건너뛰었다(`skipped`). 이어서 `npm run db:verify`로 확인한 총 건수도 처음과 동일한 7,683건이었다. `tests/importer.test.js`의 `원본 7,683건 적재와 재실행 멱등성` 테스트도 동일한 파일을 두 번 적재했을 때 1차는 `{ rows: 7683, inserted: 7683, skipped: 0 }`, 2차는 `{ rows: 7683, inserted: 0, skipped: 7683 }`이 되는지를 자동으로 검증한다.

### 결측값과 타입 변환

원본 셀은 문자열이므로 `ImportService`가 저장 전에 결측값 판단과 숫자 변환을 함께 처리한다.

- **결측값**: 빈 문자열, `-`, `N/A`, `NA`, `NULL`은 모두 결측으로 보고 `null`로 저장한다. 0과 결측을 구분해야 하므로 빈 값을 0으로 바꾸지 않는다.
- **한정 표현("1g 미만" 등)**: 영양성분 셀이 `숫자 + (g|mg)? + 미만` 형태이면 그 필드는 확정 수치로 만들지 않고 `null`로 저장한다. 대신 원문을 `필드명: 원문` 형태로 모아 `source_notes`에 남겨 상세 조회에서 원래 표현을 확인할 수 있게 한다. 원본에는 총당류 12건, 단백질 3건, 탄수화물 1건이 이 패턴이다.
- **숫자 변환**: 정수·소수와 `1,234.5` 같은 천 단위 구분 표기만 정규식으로 허용한 뒤 숫자로 바꾼다. `1,2`, `12mg`, 음수, `NaN`, `Infinity`처럼 형식이 애매하거나 잘못된 값은 오류로 처리해 시트 번호와 행 번호를 포함한 메시지와 함께 적재를 중단한다. 250행 단위로 묶은 배치가 트랜잭션 하나이므로, 한 행이라도 잘못되면 그 배치 전체가 롤백된다.
- **서식·수식 셀**: ExcelJS가 richText나 수식으로 반환하는 셀도 계산 결과와 텍스트를 재귀적으로 풀어 같은 방식으로 검사한다.

`tests/importer.test.js`가 이 처리를 검증한다. `엑셀 매핑, 0, 단위, 미만 표현, 중복 방지` 테스트는 `1,234.5`가 `1234.5`로, 문자열 `0`이 숫자 `0`으로 바뀌고 `1g 미만`은 `null`과 `source_notes: "protein: 1g 미만"`으로 저장되는지 확인한다. `모호하거나 잘못된 숫자를 거부` 테스트는 `1,2`, `1mg`, `-1`, `NaN`, `Infinity`, `1e999`를 모두 거부하는지 확인하고, `잘못된 행은 전체 트랜잭션 롤백` 테스트는 251행 중 마지막 행에만 잘못된 숫자를 넣어 배치 전체가 저장되지 않는지 확인한다.

### 현재 한계와 개선 방향

현재 Excel 워크북은 메모리에 전체 로드된다. 제공된 7,683건에서는 충분하지만 데이터가 수백만 행으로 증가하면 메모리 사용량도 함께 증가한다.

대용량 데이터에서는 CSV로 변환한 뒤 MariaDB의 bulk load 기능을 사용하거나, 워크시트 메타데이터 처리 순서에 영향을 받지 않는 스트리밍 적재 방식을 검토할 수 있다. 현재 방식은 제공된 파일의 규모와 구조에서 데이터 누락 없이 안정적으로 적재하는 것을 우선한 선택이다.

## 2. CRUD API

식품 정보를 검색할 수 있는 API를 구현해 주세요.  
* 식품 정보를 생성, 조회, 수정, 삭제할 수 있는 API를 구현해 주세요.  
* 목록 조회에는 대량 데이터를 다루기 위한 페이지네이션 또는 이에 준하는 제한 전략을 포함해 주세요.  
* 잘못된 요청, 존재하지 않는 리소스, 중복 데이터 등 주요 오류 상황을 일관되게 처리해 주세요.

### 구현 내용

`src/routes/api/food.js`에 조회 2개, 변경 3개의 라우트를 두고 `FoodController`에서 요청을 검증한 뒤 `FoodService`에 위임한다.

| 메서드 | 경로 | 인증 | 설명 |
| --- | --- | --- | --- |
| GET | `/api/foods/:id` | 없음 | 단건 상세 조회 |
| POST | `/api/foods` | 관리자 | 등록 |
| PATCH | `/api/foods/:id` | 관리자 | 전달된 필드만 부분 수정 |
| DELETE | `/api/foods/:id` | 관리자 | 삭제 |

- **입력 검증**: `src/utils/validator.js`의 Zod 스키마가 `food_cd`(trim, 대문자 변환, 형식 정규식), `food_name`(1~300자), 영양성분 10개 필드(0 이상 nullable 숫자)를 등록 전에 검사한다. `.strict()`로 정의에 없는 필드는 거부하고, PATCH는 등록 스키마를 `.partial()`로 완화하되 `refine`으로 빈 객체는 막는다.
- **관리자 인증**: `requireAdmin` 미들웨어가 `Authorization: Bearer <ADMIN_API_KEY>` 값을 SHA-256 해시로 만든 뒤 `timingSafeEqual`로 비교한다. 관리자 키가 설정되지 않은 배포에서는 쓰기 요청 자체를 503(`ADMIN_KEY_NOT_CONFIGURED`)으로 막아 읽기 전용 운영을 지원한다.
- **중복 방지**: `food_cd`에 UNIQUE 인덱스를 두고, 애플리케이션 검증을 통과해도 DB가 거부하면 `errorHandler`가 `UniqueConstraintError`를 409(`DUPLICATE_FOOD_CODE`)로 변환한다. 동시에 같은 코드로 등록을 시도해도 DB 제약이 최종 방어선이 되므로 경쟁 조건에서도 하나만 성공한다.
- **존재하지 않는 리소스**: `FoodService.get/update/remove`는 대상이 없으면 `ApiError(FOOD_NOT_FOUND)`를 던지고 컨트롤러는 이를 그대로 상위로 전달해 공통 오류 응답으로 처리한다.
- **응답 형식**: 모든 성공 응답은 `{ success, code, message, data, request_id }` 형식이며 등록 성공 시 `Location` 헤더에 생성된 리소스 경로를 함께 반환한다. 삭제는 본문 없는 204를 반환한다.

### 실행 결과

실행 중인 컨테이너(`docker compose up -d`)에 대해 등록, 중복 등록, 수정, 삭제, 삭제 후 조회를 순서대로 호출한 실제 결과다.

```http
POST /api/foods
{"food_cd":"REPORT-DEMO","food_name":"보고서 테스트 식품","research_year":2024,"calorie":123.4}

201 Created
{"success":true,"code":"FOOD_CREATED","message":"식품 등록 성공",
 "data":{"id":22870,"food_cd":"REPORT-DEMO","food_name":"보고서 테스트 식품","calorie":123.4, ...}}
```

```http
POST /api/foods
{"food_cd":"report-demo","food_name":"다른 이름"}

409 Conflict
{"success":false,"code":"DUPLICATE_FOOD_CODE","message":"이미 등록된 식품코드입니다.","details":[]}
```

```http
PATCH /api/foods/22870
{"calorie":200}

200 OK
{"success":true,"code":"FOOD_UPDATED","message":"식품 정보 수정 성공","data":{"id":22870, ...,"calorie":200}}
```

```http
DELETE /api/foods/22870
204 No Content

GET /api/foods/22870
404 Not Found
{"success":false,"code":"FOOD_NOT_FOUND","message":"식품 정보를 찾을 수 없습니다.","details":[]}
```

`food_cd`가 소문자로 들어와도 대문자로 정규화되어 같은 코드로 인식되고(`REPORT-DEMO` = `report-demo`), 삭제된 리소스는 이후 조회에서 동일한 404 형식으로 응답한다.

### 검증

```bash
npm test
```

```text
ok 1 - CRUD와 nullable 필드 초기화
ok 3 - 중복 식품코드는 409
ok 4 - 없는 리소스는 일관된 404 응답
ok 7 - 동시 중복 생성은 하나만 성공
# tests 14
# pass 14
# fail 0
```

`동시 중복 생성은 하나만 성공` 테스트는 같은 `food_cd`로 5개의 등록 요청을 동시에 보내 정확히 1개만 201, 나머지 4개는 409를 받는지 확인한다. `CRUD와 nullable 필드 초기화` 테스트는 값이 있던 필드를 PATCH로 `null`을 보내 실제로 초기화되는지까지 검증한다.

### 현재 한계와 개선 방향

삭제가 물리 삭제(hard delete)만 지원해 삭제 이력이 남지 않는다. 변경 이력 추적이 필요해지면 별도 이력 테이블이나 soft-delete 플래그 도입을 검토할 수 있다.

PATCH에 버전이나 `updated_at` 비교 같은 낙관적 잠금이 없어 두 관리자가 같은 항목을 동시에 수정하면 나중 요청이 앞선 변경을 덮어쓴다. 현재는 단일 관리자 운영을 전제로 한 선택이며, 다중 관리자 동시 편집이 실제로 문제가 되면 조건부 업데이트를 추가할 수 있다.

생성·수정·삭제가 모두 단건 단위다. 초기 적재 이후 대량으로 값을 갱신해야 하는 운영 시나리오가 생기면 배치 엔드포인트를 별도로 설계하는 편이 개별 API를 반복 호출하는 것보다 낫다.

## 3. 검색 API

 페이지네이션과 오류 처리

### 구현 내용

`GET /api/foods`가 검색과 목록 조회를 겸한다. `searchSchema`가 쿼리 문자열을 검증해 `FoodService.list`에 전달한다.

- **검색 조건**: `food_name`, `maker_name`은 `LOCATE(검색어, 컬럼)`으로 부분 일치를 검사한다. LIKE 대신 LOCATE를 쓰는 이유는 사용자가 입력한 `%`, `_`를 SQL 와일드카드가 아니라 검색어 그대로 처리하기 위해서다. `research_year`, `food_code`는 정확히 일치하는 값만 조회한다. 조건은 모두 선택이며 동시에 조합할 수 있다.
- **페이지네이션**: OFFSET 대신 ID 기반 커서를 사용한다. 이전 응답의 `next_cursor`보다 큰 `id`부터 오름차순으로 `page_size`(1~100, 기본 20)개를 가져온다. OFFSET 방식은 뒷페이지로 갈수록 앞의 행을 모두 스캔하고 버려야 하지만, 커서 방식은 PK 인덱스로 시작 위치를 바로 찾으므로 데이터가 많아져도 조회 비용이 늘지 않는다. 한 건을 더(`page_size + 1`) 조회해 별도의 `COUNT` 쿼리 없이 `has_next` 여부를 판단한다.
- **요청 자체의 제한**: 페이지네이션과 별개로 `/api` 전체에 1분당 180회의 요청 제한(`express-rate-limit`)을 적용해 대량 호출로 인한 부하를 한 번 더 막는다. 초과 시 429(`RATE_LIMIT_EXCEEDED`)를 반환한다.
- **오류 처리 일관성**: 성공·실패 응답 모두 `{ success, code, message, data|details, request_id }` 형식을 따른다. `src/constants/resultCodes.js`가 HTTP 상태, 문자열 코드, 메시지를 한 곳에서 관리하고(`docs/result-codes.md`에 문서화), `errorHandler` 미들웨어가 다음 예외를 모두 해당 코드로 변환한다.

  | 상황 | HTTP | code |
  | --- | --- | --- |
  | 쿼리·본문 검증 실패(Zod) | 400 | `VALIDATION_ERROR` |
  | 잘못된 JSON 본문 | 400 | `INVALID_JSON` |
  | 관리자 인증 실패 | 401 | `ADMIN_AUTH_REQUIRED` |
  | 존재하지 않는 리소스 | 404 | `FOOD_NOT_FOUND` |
  | 식품코드 중복 | 409 | `DUPLICATE_FOOD_CODE` |
  | 본문 크기 초과 | 413 | `PAYLOAD_TOO_LARGE` |
  | 요청 횟수 초과 | 429 | `RATE_LIMIT_EXCEEDED` |
  | 그 외 처리되지 않은 예외 | 500 | `INTERNAL_ERROR` |

  나머지 예외는 500(`INTERNAL_ERROR`)으로 처리해 원인 불명 오류에서도 항상 같은 응답 형식을 유지한다. 모든 응답에 `request_id`를 포함해 클라이언트가 보고하는 오류를 서버 로그와 대조할 수 있다.

### 실행 결과

```http
GET /api/foods?page_size=2
200 OK
{"data":{"items":[{"id":1,"food_cd":"D000006","food_name":"꿩불고기",...},
                   {"id":2,"food_cd":"D000007","food_name":"닭갈비",...}],
         "page_size":2,"next_cursor":"2","has_next":true}}
```

```http
GET /api/foods/99999999
404 Not Found
{"success":false,"code":"FOOD_NOT_FOUND","message":"식품 정보를 찾을 수 없습니다.","details":[]}
```

```http
POST /api/foods
{"food_name":""}

400 Bad Request
{"success":false,"code":"VALIDATION_ERROR","message":"입력값을 확인해주세요.",
 "details":[{"field":"food_cd","message":"Invalid input: expected string, received undefined"},
            {"field":"food_name","message":"Too small: expected string to have >=1 characters"}]}
```

`next_cursor`를 다음 요청의 `cursor`로 그대로 전달하면 이어지는 페이지를 받고, `has_next`가 `false`이면 마지막 페이지임을 뜻한다. 검증 실패는 어떤 필드가 왜 잘못됐는지 `details` 배열로 함께 알려준다.

### 검증

```bash
npm test
```

```text
ok 2 - 검색 조건 조합과 커서 페이지네이션
ok 5 - 잘못된 입력과 쿼리를 거부
ok 6 - 쓰기 인증과 공개 조회 및 헬스 체크
ok 9 - 관리자 키가 없으면 읽기 전용
# tests 14
# pass 14
# fail 0
```

`검색 조건 조합과 커서 페이지네이션` 테스트는 식품명·연도·제조사 조건을 함께 적용한 뒤 `page_size=1`로 커서를 한 번 넘기면서 항목이 겹치거나 빠지지 않는지 확인하고, 검색어에 `%`, `_`가 섞여도 와일드카드로 해석되지 않는지까지 검사한다. `잘못된 입력과 쿼리를 거부` 테스트는 빈 값, 범위를 벗어난 `page_size`, 정의되지 않은 쿼리 키, 같은 파라미터의 중복 전달을 모두 400으로 거부하는지 확인한다.

### 현재 한계와 개선 방향

`food_name`, `maker_name` 부분 검색은 `LOCATE`를 사용하므로 인덱스를 타지 않고 대상 컬럼을 스캔한다. 현재 7,683건에서는 문제가 없지만 데이터가 크게 늘어나 검색 지연이 실제로 발생하면 FULLTEXT 인덱스나 별도 검색엔진(OpenSearch 등) 도입을 검토할 수 있다.

커서는 `id` 오름차순 한 가지 정렬만 지원한다. 특정 페이지로 바로 이동하거나 다른 기준(예: 열량순)으로 정렬하는 기능은 지금 범위에 포함하지 않았으며, 필요해지면 정렬 기준별로 별도의 복합 커서를 설계해야 한다.

목록 응답은 전체 건수를 포함하지 않는다. 대량 데이터에서 `COUNT` 쿼리 비용을 피하기 위해 `has_next`만 제공하는 쪽을 의도적으로 선택했다. 전체 건수가 꼭 필요한 화면이 생기면 근사치 카운트나 별도로 캐시한 카운트를 제공하는 방안을 검토할 수 있다.
