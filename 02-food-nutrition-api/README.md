# 식품영양성분 서비스

Express API와 React 관리자 화면을 독립 애플리케이션으로 구성했다. 백엔드는 제공된 엑셀 7,683건을 MariaDB에 적재하고 식품 검색, 조회, 생성, 수정, 삭제 API를 제공한다.

요구사항별 구현 내용과 검증 결과는 아래 [구현 보고서](#구현-보고서)에 순서대로 정리한다. 필드별 API 명세와 실행 가능한 예시는 Swagger UI에서 확인할 수 있다.

## 구조

```text
backend/
  data/                 # 백엔드가 적재하는 원본 엑셀
  src/
    config/             # MariaDB와 Swagger 설정
    controllers/        # HTTP 요청과 응답 처리
    middlewares/        # 인증, 오류, 요청 추적
    models/             # Sequelize 모델과 관계 등록
    migrations/         # 실행 이력이 관리되는 스키마 변경
    routes/api/         # Express API 라우트
    services/           # CRUD와 엑셀 적재 로직
    scripts/            # migrate / seed / verify CLI
    utils/              # Zod 입력 검증
  tests/
  package.json
  package-lock.json
  Dockerfile
frontend/
  src/                  # React 관리자 화면
  package.json
  package-lock.json
  Dockerfile
  nginx.conf
docker-compose.yml      # 로컬 통합 실행
```

두 앱은 의존성, lock 파일, 실행 명령, Docker 이미지가 분리되어 독립적으로 테스트하고 배포할 수 있다. 현재 Docker 구성은 Nginx가 React 정적 파일을 제공하고 Express와 MariaDB를 별도 컨테이너로 실행한다.

## Docker로 전체 실행

```bash
docker compose build
docker compose run --rm seed
docker compose up -d
```

- 관리자 화면: http://localhost:8080
- API: http://localhost:3000/api/foods
- Swagger: http://localhost:3000/api/docs
- 준비 상태: http://localhost:3000/health/ready

프런트엔드 Nginx가 `/api`와 `/health` 요청을 API 컨테이너로 프록시한다. MariaDB 데이터는 `mariadb-data` 볼륨에 보관된다.

## 백엔드 개발

```bash
docker compose up -d db
cd backend
npm ci
cp .env.local.example .env.local
npm run db:seed:local
npm run db:verify:local
npm run dev
```

관리자 키가 비어 있으면 API가 조회 전용으로 동작한다. 쓰기 요청에는 `.env.local`의 `ADMIN_API_KEY`와 같은 값을 전달한다.

Docker Compose도 로컬 개발 설정인 `backend/.env.local`을 읽는다. `DATABASE_HOST`와 `DATABASE_PORT`는 Express 연결 위치이고 `MARIADB_*`는 Express와 MariaDB 컨테이너가 함께 사용하는 DB 설정이다. 실제 환경 파일은 Git에 포함하지 않고 `.env.local.example`만 공유한다.

`LOG_LEVEL`은 로컬에서 기본 `debug`, 운영에서 기본 `info`를 사용한다. 로컬 로그는 읽기 쉬운 한 줄 형식이며 운영 로그는 JSON으로 표준 출력에 기록된다. Docker에서는 `docker compose logs -f api`로 확인하고, 배포 환경에서는 CloudWatch 같은 로그 수집 도구가 표준 출력을 보관한다.

```http
Authorization: Bearer <ADMIN_API_KEY>
```

API는 `food_name`(식품명), `research_year`(조사연도), `maker_name`(지역/제조사), `food_code`(식품코드) 검색 조건을 지원하며 동시에 조합할 수 있다.

```bash
curl -G --data-urlencode 'food_name=김치' http://localhost:3000/api/foods
```

조건마다 부분 일치와 정확 일치를 다르게 적용했고 대소문자·공백도 처리한다. 설계 근거와 검증 결과는 [구현 보고서](#3-검색-api)에 정리했다.

목록은 ID 기반 커서 페이지네이션을 사용한다. 첫 요청에서는 `cursor`를 생략하고, 다음 요청에는 이전 응답의 `next_cursor`를 전달한다. `has_next`가 `false`이면 마지막 목록이다.

```bash
curl 'http://localhost:3000/api/foods?page_size=20&cursor=20'
```

| 메서드 | 경로                | 기능           |
| ------ | ------------------- | -------------- |
| GET    | `/api/foods`        | 검색과 목록    |
| GET    | `/api/foods/:id`    | 단건 조회      |
| POST   | `/api/foods`        | 생성           |
| PATCH  | `/api/foods/:id`    | 부분 수정      |
| DELETE | `/api/foods/:id`    | 삭제           |
| POST   | `/api/admin/verify` | 관리자 키 확인 |

응답의 HTTP 상태와 세부 문자열 코드는 [Result Code 문서](backend/docs/result-codes.md)에서 확인할 수 있다.

식품코드는 UNIQUE 인덱스, 연도와 ID는 복합 인덱스를 사용한다. Sequelize 모델과 Umzug 마이그레이션을 분리했으며 `sequelize.sync({ alter: true })`는 사용하지 않는다. 엑셀 적재는 InnoDB 트랜잭션에서 실행되며 오류가 발생하면 전체를 롤백한다. 재적재 시 기존 코드를 건너뛴다. 원본 분석과 변환 규칙은 [구현 보고서](#1-데이터-적재)에 정리했다.

### 테스트

```bash
cd backend
docker compose up -d db
set -a && source .env.local && set +a
npm run test:docker
```

`npm run test:docker`는 `db` 컨테이너 안에 `food_nutrition_test` DB를 생성·권한 부여한 뒤 `npm test`를 실행한다. `tests/api.test.js`(CRUD, 검색 조건 조합, 인증, 오류 응답)와 `tests/importer.test.js`(엑셀 적재 로직, 원본 7,683건 적재)를 합쳐 총 14개 테스트를 실행한다. 테스트 구성과 요구사항별 커버리지는 [구현 보고서의 4. 테스트](#4-테스트)에 정리했다.

DB 통합 테스트는 GitHub Actions에서도 실행한다. CI는 작업마다 임시 MariaDB의 `food_nutrition_test` 데이터베이스를 만들고 테스트가 끝나면 폐기한다. 테스트 실행기는 `NODE_ENV=test`와 `_test`로 끝나는 DB 이름을 모두 확인하므로 개발·운영 DB를 실수로 초기화하지 않는다.

포맷 검사는 로컬에서도 `npm run format:check`로 실행할 수 있다.

## 프런트엔드 개발

```bash
cd frontend
npm ci
cp .env.local.example .env.local
npm run dev
npm run build
```

개발 서버는 `/api` 요청을 `http://127.0.0.1:3000`으로 프록시한다. 독립 도메인에 배포할 때는 빌드 시 `VITE_API_BASE_URL`을 API 주소로 설정할 수 있다. 빌드 결과는 `frontend/dist`에 생성된다.

운영 백엔드는 `.env.production` 파일을 자동으로 읽지 않는다. 배포 환경이 `.env.production.example`에 정의된 값을 환경변수로 주입한 뒤 `npm run db:migrate`와 `npm start`를 실행한다. 비밀번호와 관리자 키는 AWS Secrets Manager 같은 비밀 저장소에서 공급한다. 프런트엔드의 `VITE_*` 값은 브라우저 번들에 공개되므로 비밀값을 넣지 않는다.

```bash
VITE_API_BASE_URL=https://api.example.com npm run build
```

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

### 원본 데이터와 API 필드 매핑

과제에 연결된 식품영양성분 엑셀을 `data/foods.xlsx`로 보관한다. 실제 파일에는 머리글을 제외한 **7,683개 행**, **100개 열**이 있으며 그중 API가 사용하는 열만 `ImportService`의 `columnMapping`으로 연결한다. `식품코드`는 원본 파일 안에서 모두 유일하다.

| API 필드 | 원본 엑셀 열 | 처리 |
| --- | --- | --- |
| `id` | 없음 | DB가 생성하는 내부 식별자. 원본의 `NO` 열과는 분리해서 관리한다 |
| `food_cd` | 식품코드 | 공백 제거, 대문자 정규화 후 UNIQUE 키로 사용 |
| `food_name` | 식품명 | 앞뒤 공백 제거 |
| `group_name` | 식품대분류 | 구이류·국류 등 원본의 분류를 그대로 저장 |
| `research_year` | 연도 | 정수로 변환 |
| `maker_name` | 지역 / 제조사 | 앞뒤 공백 제거 |
| `ref_name` | 성분표출처 | 자료명. 발행기관명과는 다른 값 |
| `source_notes` | 일부 영양성분 셀의 한정 표현 | 원본 열은 없고 적재 과정에서 생성. 예: `protein: 1g 미만`처럼 확정 수치로 만들지 않은 원문을 보존 |
| `serving_size` | 1회제공량 | 숫자로 변환 |
| `serving_unit` | 내용량_단위 | `g` 또는 `mL`. 단위 없이 수치만 저장하면 의미가 사라지므로 별도 필드로 분리 |
| `calorie` | 에너지(㎉) | kcal, 원본 값 그대로 |
| `carbohydrate` | 탄수화물(g) | g, 원본 값 그대로 |
| `protein` | 단백질(g) | g, 원본 값 그대로 |
| `fat` | 지방(g) | g, 원본 값 그대로 |
| `sugars` | 총당류(g) | g, 원본 값 그대로 |
| `sodium` | 나트륨(㎎) | mg, 원본 값 그대로 |
| `cholesterol` | 콜레스테롤(㎎) | mg, 원본 값 그대로 |
| `saturated_fatty_acids` | 총 포화 지방산(g) | g, 원본 값 그대로 |
| `trans_fat` | 트랜스 지방산(g) | g, 원본 값 그대로 |

영양성분은 원본 단위와 값을 그대로 저장하며 100g 기준 같은 임의 환산은 하지 않는다. 빈 셀, `-` 등 결측값은 0과 구분해 `null`로 저장한다. 결측값 판단 기준, 한정 표현(`1g 미만`)과 숫자 변환 규칙은 [결측값과 타입 변환](#결측값과-타입-변환)에 정리했다.

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

### 구현 내용

`src/routes/api/food.js`에 조회 3개, 변경 3개의 라우트를 두고 `FoodController`에서 요청을 검증한 뒤 `FoodService`에 위임한다.

| 메서드 | 경로 | 인증 | 설명 |
| --- | --- | --- | --- |
| GET | `/api/foods` | 없음 | 목록 조회(조건 없이 호출하면 등록순 전체를 페이지 단위로 반환) |
| GET | `/api/foods/:id` | 없음 | 단건 상세 조회 |
| POST | `/api/foods` | 관리자 | 등록 |
| PATCH | `/api/foods/:id` | 관리자 | 전달된 필드만 부분 수정 |
| DELETE | `/api/foods/:id` | 관리자 | 삭제 |

`GET /api/foods`는 검색 조건 없이도 호출할 수 있는 기본 목록 조회 엔드포인트다. 검색 조건 조합, 커서 페이지네이션 동작은 [3. 검색 API](#3-검색-api)에서 자세히 다룬다.

- **입력 검증**: `src/utils/validator.js`의 Zod 스키마가 `food_cd`(trim, 대문자 변환, 형식 정규식), `food_name`(1~300자), 영양성분 10개 필드(0 이상 nullable 숫자)를 등록 전에 검사한다. `.strict()`로 정의에 없는 필드는 거부하고, PATCH는 등록 스키마를 `.partial()`로 완화하되 `refine`으로 빈 객체는 막는다.
- **관리자 인증**: `requireAdmin` 미들웨어가 `Authorization: Bearer <ADMIN_API_KEY>` 값을 SHA-256 해시로 만든 뒤 `timingSafeEqual`로 비교한다. 관리자 키가 설정되지 않은 배포에서는 쓰기 요청 자체를 503(`ADMIN_KEY_NOT_CONFIGURED`)으로 막아 읽기 전용 운영을 지원한다.
- **중복 방지**: `food_cd`에 UNIQUE 인덱스를 두고, 애플리케이션 검증을 통과해도 DB가 거부하면 `errorHandler`가 `UniqueConstraintError`를 409(`DUPLICATE_FOOD_CODE`)로 변환한다. 동시에 같은 코드로 등록을 시도해도 DB 제약이 최종 방어선이 되므로 경쟁 조건에서도 하나만 성공한다.
- **존재하지 않는 리소스**: `FoodService.get/update/remove`는 대상이 없으면 `ApiError(FOOD_NOT_FOUND)`를 던지고 컨트롤러는 이를 그대로 상위로 전달해 공통 오류 응답으로 처리한다.
- **응답 형식**: 모든 성공 응답은 `{ success, code, message, data, request_id }` 형식이며 등록 성공 시 `Location` 헤더에 생성된 리소스 경로를 함께 반환한다. 삭제는 본문 없는 204를 반환한다.
- **오류 처리 일관성**: 성공·실패 응답 모두 `{ success, code, message, data|details, request_id }` 형식을 따른다. `src/constants/resultCodes.js`가 HTTP 상태, 문자열 코드, 메시지를 한 곳에서 관리하고(`docs/result-codes.md`에 문서화), `errorHandler` 미들웨어가 다음 예외를 모두 해당 코드로 변환한다.

  | 상황 | HTTP | code |
  | --- | --- | --- |
  | 요청 본문·경로 검증 실패(Zod) | 400 | `VALIDATION_ERROR` |
  | 잘못된 JSON 본문 | 400 | `INVALID_JSON` |
  | 관리자 인증 실패 | 401 | `ADMIN_AUTH_REQUIRED` |
  | 존재하지 않는 리소스 | 404 | `FOOD_NOT_FOUND` |
  | 식품코드 중복 | 409 | `DUPLICATE_FOOD_CODE` |
  | 본문 크기 초과 | 413 | `PAYLOAD_TOO_LARGE` |
  | 요청 횟수 초과 | 429 | `RATE_LIMIT_EXCEEDED` |
  | 그 외 처리되지 않은 예외 | 500 | `INTERNAL_ERROR` |

  나머지 예외는 500(`INTERNAL_ERROR`)으로 처리해 원인 불명 오류에서도 항상 같은 응답 형식을 유지한다. 모든 응답에 `request_id`를 포함해 클라이언트가 보고하는 오류를 서버 로그와 대조할 수 있다.

### 실행 결과

실행 중인 컨테이너(`docker compose up -d`)에 대해 기본 목록 조회, 등록, 잘못된 요청, 중복 등록, 수정, 삭제, 삭제 후 조회를 순서대로 호출한 실제 결과다.

```http
GET /api/foods
200 OK
{"success":true,"code":"FOOD_LIST_SUCCESS","message":"식품 목록 조회 성공",
 "data":{"items":[{"id":1,"food_cd":"D000006","food_name":"꿩불고기", ...},
                   {"id":2,"food_cd":"D000007","food_name":"닭갈비", ...}, ...],
         "page_size":20,"next_cursor":"20","has_next":true}}
```

조건 없이 호출하면 기본 페이지 크기(20)만큼 등록순으로 반환한다. 검색 조건과 페이지네이션은 [3. 검색 API](#3-검색-api)에서 이어서 다룬다.

```http
POST /api/foods
{"food_cd":"REPORT-DEMO","food_name":"보고서 테스트 식품","research_year":2024,"calorie":123.4}

201 Created
{"success":true,"code":"FOOD_CREATED","message":"식품 등록 성공",
 "data":{"id":22870,"food_cd":"REPORT-DEMO","food_name":"보고서 테스트 식품","calorie":123.4, ...}}
```

```http
POST /api/foods
{"food_name":""}

400 Bad Request
{"success":false,"code":"VALIDATION_ERROR","message":"입력값을 확인해주세요.",
 "details":[{"field":"food_cd","message":"Invalid input: expected string, received undefined"},
            {"field":"food_name","message":"Too small: expected string to have >=1 characters"}]}
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

처음부터 존재한 적 없는 ID를 수정·삭제해도 같은 404로 응답한다.

```http
PATCH /api/foods/999999
{"calorie":1}

404 Not Found
{"success":false,"code":"FOOD_NOT_FOUND","message":"식품 정보를 찾을 수 없습니다.","details":[]}
```

```http
DELETE /api/foods/999999

404 Not Found
{"success":false,"code":"FOOD_NOT_FOUND","message":"식품 정보를 찾을 수 없습니다.","details":[]}
```

`food_cd`가 소문자로 들어와도 대문자로 정규화되어 같은 코드로 인식되고(`REPORT-DEMO` = `report-demo`), 삭제된 리소스는 이후 조회에서 동일한 404 형식으로 응답한다. 검증 실패는 어떤 필드가 왜 잘못됐는지 `details` 배열로 함께 알려준다.

### 검증

```bash
cd backend
set -a && source .env.local && set +a
npm run test:docker
```

```text
ok 1 - CRUD와 nullable 필드 초기화
ok 3 - 중복 식품코드는 409
ok 4 - 없는 리소스는 일관된 404 응답
ok 5 - 잘못된 입력과 쿼리를 거부
ok 7 - 동시 중복 생성은 하나만 성공
# tests 14
# pass 14
# fail 0
```

`동시 중복 생성은 하나만 성공` 테스트는 같은 `food_cd`로 5개의 등록 요청을 동시에 보내 정확히 1개만 201, 나머지 4개는 409를 받는지 확인한다. `CRUD와 nullable 필드 초기화` 테스트는 값이 있던 필드를 PATCH로 `null`을 보내 실제로 초기화되는지까지 검증한다. `잘못된 입력과 쿼리를 거부` 테스트는 빈 본문, 필수 필드 누락, 범위를 벗어난 값, 정의되지 않은 필드를 모두 400으로 거부하는지 확인한다. `없는 리소스는 일관된 404 응답` 테스트는 GET뿐 아니라 존재한 적 없는 ID에 대한 PATCH·DELETE도 함께 호출해 셋 다 같은 `FOOD_NOT_FOUND` 형식으로 응답하는지 확인한다.

### 현재 한계와 개선 방향

삭제가 물리 삭제(hard delete)만 지원해 삭제 이력이 남지 않는다. 변경 이력 추적이 필요해지면 별도 이력 테이블이나 soft-delete 플래그 도입을 검토할 수 있다.

생성·수정·삭제가 모두 단건 단위다. 초기 적재 이후 대량으로 값을 갱신해야 하는 운영 시나리오가 생기면 배치 엔드포인트를 별도로 설계하는 편이 개별 API를 반복 호출하는 것보다 낫다.

## 3. 검색 API

### 구현 내용

`GET /api/foods`가 검색과 목록 조회를 겸한다. `searchSchema`가 쿼리 문자열을 검증해 `FoodService.list`에 전달한다.

- **검색 조건**: 4개 조건은 모두 선택이며 동시에 조합할 수 있다. 필드 성격에 따라 일치 방식을 다르게 설계했다.

  | 필드 | 일치 방식 | 판단 근거 |
  | --- | --- | --- |
  | `food_name` | 부분 일치 | 정확한 이름을 몰라도 일부만 알고 찾는 경우가 흔하다. "김치"로 "김치찌개", "김치볶음"을 함께 찾을 수 있어야 한다 |
  | `maker_name` | 부분 일치 | 위와 동일한 이유 |
  | `research_year` | 정확 일치 | 연도는 범위가 아니라 특정 값이라 부분 일치가 의미 없다 |
  | `food_code` | 정확 일치 | 고유 식별자이므로 부분 일치하면 관련 없는 결과가 섞인다 |

  부분 일치는 `LOCATE(검색어, 컬럼)`으로 구현했다([FoodService.js:21-24](02-food-nutrition-api/backend/src/services/FoodService.js#L21-L24)). `LIKE` 대신 `LOCATE`를 쓴 이유는 사용자가 입력한 `%`, `_`를 SQL 와일드카드가 아니라 검색어 그대로의 문자로 처리하기 위해서다 — `LIKE`였다면 `%` 한 글자만 입력해도 전체 테이블이 매치되는 예상 밖의 동작이 생긴다.

  대소문자와 공백도 필드마다 다르게 다룬다.
  - `food_name`, `maker_name`: 별도 코드 처리 없이 DB 컬럼 collation(`utf8mb4_unicode_ci`, 대소문자 구분 안 함)에 맡긴다. `LOCATE('cola','Coca-Cola')`와 `LOCATE('COLA','Coca-Cola')`가 같은 위치를 반환하는 것으로 확인했다.
  - `food_code`: `validator.js`에서 `.toUpperCase()`로 명시적으로 정규화한다([validator.js:64](02-food-nutrition-api/backend/src/utils/validator.js#L64)). 원본 식품코드가 전부 대문자(`D000006`)라 소문자로 검색해도 찾을 수 있어야 하는데, DB collation만으로는 값 자체가 대문자로 저장돼 있어야 비교가 되므로 애플리케이션에서 한 번 더 맞췄다.
  - 4개 필드 모두 `.trim()`으로 앞뒤 공백을 제거한다([validator.js:60-64](02-food-nutrition-api/backend/src/utils/validator.js#L60-L64)). 복사·붙여넣기나 오타로 섞이는 공백을 흡수하기 위해서다. 다만 문자열 중간 공백은 그대로 둔다 — "김치 찌개"로 검색하면 중간에 공백이 없는 "김치찌개"는 찾지 못하는데, 검색어를 임의로 재해석하지 않고 입력한 문자열이 그대로 포함되는지를 예측 가능하게 유지하는 쪽을 택했다.
- **페이지네이션**: OFFSET 대신 ID 기반 커서를 사용한다. 이전 응답의 `next_cursor`보다 큰 `id`부터 오름차순으로 `page_size`(1~100, 기본 20)개를 가져온다. OFFSET 방식은 뒷페이지로 갈수록 앞의 행을 모두 스캔하고 버려야 하지만, 커서 방식은 PK 인덱스로 시작 위치를 바로 찾으므로 데이터가 많아져도 조회 비용이 늘지 않는다. 한 건을 더(`page_size + 1`) 조회해 별도의 `COUNT` 쿼리 없이 `has_next` 여부를 판단한다.
- **요청 자체의 제한**: 페이지네이션과 별개로 `/api` 전체에 1분당 180회의 요청 제한(`express-rate-limit`)을 적용해 대량 호출로 인한 부하를 한 번 더 막는다. 초과 시 429(`RATE_LIMIT_EXCEEDED`)를 반환한다.
- **검색·페이지네이션 조건의 오류 처리**: 존재하지 않는 쿼리 키, 범위를 벗어난 `page_size`, 형식이 잘못된 `cursor`도 CRUD API와 같은 `errorHandler`를 거쳐 400(`VALIDATION_ERROR`)으로 응답한다. 공통 오류 응답 형식과 전체 코드 목록은 [2. CRUD API의 오류 처리 일관성](#2-crud-api)에 정리했다.

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
GET /api/foods?page_size=101
400 Bad Request
{"success":false,"code":"VALIDATION_ERROR","message":"입력값을 확인해주세요.",
 "details":[{"field":"page_size","message":"Too big: expected number to be <=100"}]}
```

`next_cursor`를 다음 요청의 `cursor`로 그대로 전달하면 이어지는 페이지를 받고, `has_next`가 `false`이면 마지막 페이지임을 뜻한다.

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

`food_name`, `maker_name` 부분 검색은 `LOCATE`를 사용하므로 인덱스를 타지 않고 대상 컬럼을 스캔한다. 현재 7,683건에서는 문제가 없지만 데이터가 크게 늘어나 검색 지연이 실제로 발생하면 FULLTEXT 인덱스나 별도 검색엔진(OpenSearch 등) 도입을 검토할 수 있다. 관련 조사 내용은 `docs/db-index-notes.md`에 정리했다(MariaDB 기본 FULLTEXT는 한글 복합어에서 정확도가 깨지는 것을 실측했고, mroonga 스토리지 엔진 도입은 테이블 엔진 교체가 필요해 현재 규모에는 과하다고 판단했다).

커서는 `id` 오름차순 한 가지 정렬만 지원한다. 특정 페이지로 바로 이동하거나 다른 기준(예: 열량순)으로 정렬하는 기능은 지금 범위에 포함하지 않았으며, 필요해지면 정렬 기준별로 별도의 복합 커서를 설계해야 한다.

목록 응답은 전체 건수를 포함하지 않는다. 대량 데이터에서 `COUNT` 쿼리 비용을 피하기 위해 `has_next`만 제공하는 쪽을 의도적으로 선택했다. 전체 건수가 꼭 필요한 화면이 생기면 근사치 카운트나 별도로 캐시한 카운트를 제공하는 방안을 검토할 수 있다.

## 4. 테스트

### 구성

Node.js 내장 테스트 러너(`node --test`)만 사용하고 별도 테스트 프레임워크는 도입하지 않았다. `tests/testEnvironment.js`를 `--require`로 먼저 실행해 `NODE_ENV=test`가 아니거나 DB 이름이 `_test`로 끝나지 않으면 즉시 실패하도록 막아, 실수로 개발·운영 DB에 테스트를 돌리는 사고를 방지한다.

| 파일 | 테스트 수 | 범위 |
| --- | --- | --- |
| `tests/api.test.js` | 9개 | API 레벨: CRUD, 검색, 인증, 오류 응답 |
| `tests/importer.test.js` | 5개 | 엑셀 적재 로직과 원본 데이터 적재 |

### 요구사항 항목별 커버리지

| 요구 항목 | 담당 테스트 |
| --- | --- |
| 데이터 적재 로직 | `엑셀 매핑, 0, 단위, 미만 표현, 중복 방지`, `잘못된 행은 전체 트랜잭션 롤백`, `필수 열 누락을 명확히 보고`, `모호하거나 잘못된 숫자를 거부`, `원본 7,683건 적재와 재실행 멱등성` |
| 검색 조건 조합 | `검색 조건 조합과 커서 페이지네이션` |
| 단건 조회 | `CRUD와 nullable 필드 초기화`, `없는 리소스는 일관된 404 응답` |
| 생성 | `CRUD와 nullable 필드 초기화`, `중복 식품코드는 409`, `동시 중복 생성은 하나만 성공` |
| 수정 | `CRUD와 nullable 필드 초기화`, `없는 리소스는 일관된 404 응답`(PATCH) |
| 삭제 | `CRUD와 nullable 필드 초기화`, `없는 리소스는 일관된 404 응답`(DELETE) |
| 오류 케이스 | `잘못된 입력과 쿼리를 거부`(400), `없는 리소스는 일관된 404 응답`(404), `중복 식품코드는 409`(409), `잘못된 JSON과 큰 본문도 공통 오류 형식`(400/413), `쓰기 인증과 공개 조회 및 헬스 체크`(401), `관리자 키가 없으면 읽기 전용`(503) |

데이터 적재는 자동화 테스트 외에 별도의 검증 스크립트(`src/scripts/verifyData.js`)도 포함한다. 이 스크립트는 실제로 시드된 DB를 대상으로 전체 건수, 대표 식품코드(`D000006`)의 존재 여부, 식품명, 열량 값을 확인하며 [1. 데이터 적재](#1-데이터-적재)에서 실행 결과를 보였다. 자동화 테스트가 "코드가 맞게 동작하는지"를 검증한다면, 이 스크립트는 "실제로 적재된 결과물이 맞는지"를 별도로 확인하는 역할이다.

### 테스트 DB 재현성

테스트는 세 가지 환경에서 동일하게 재현할 수 있도록 구성했다.

- **CI(GitHub Actions)**: 작업마다 임시 MariaDB 서비스 컨테이너를 띄우고 `MARIADB_DATABASE: food_nutrition_test`로 초기화한다(`.github/workflows/ci.yml`). 컨테이너가 매번 새로 생성되므로 테스트 DB도 매번 깨끗한 상태에서 시작한다.
- **로컬 Docker Compose**: `docker compose up -d`로 띄운 `db` 컨테이너의 개발용 DB(`food_nutrition`)와는 별도로 `food_nutrition_test`를 사용한다. `npm run test:docker`가 `docker exec`로 해당 컨테이너 안에 테스트 DB를 생성·권한 부여한 뒤 테스트를 실행한다.
- **로컬 비-Docker**: `MARIADB_DATABASE`를 `_test`로 끝나는 이름으로 지정하면 어떤 MariaDB든(로컬 설치, 다른 컨테이너 등) 동일한 방식으로 동작한다.

세 경우 모두 `before` 훅이 `migrateDatabase()`를 직접 호출해 테이블을 만들기 때문에, DB가 비어 있는 상태에서 시작해도 테스트 실행 자체가 스키마를 준비한다.

### 실행 결과

```bash
cd backend
set -a && source .env.local && set +a
npm run test:docker
```

```text
ok 1 - CRUD와 nullable 필드 초기화
ok 2 - 검색 조건 조합과 커서 페이지네이션
ok 3 - 중복 식품코드는 409
ok 4 - 없는 리소스는 일관된 404 응답
ok 5 - 잘못된 입력과 쿼리를 거부
ok 6 - 쓰기 인증과 공개 조회 및 헬스 체크
ok 7 - 동시 중복 생성은 하나만 성공
ok 8 - 잘못된 JSON과 큰 본문도 공통 오류 형식
ok 9 - 관리자 키가 없으면 읽기 전용
ok 10 - 엑셀 매핑, 0, 단위, 미만 표현, 중복 방지
ok 11 - 잘못된 행은 전체 트랜잭션 롤백
ok 12 - 필수 열 누락을 명확히 보고
ok 13 - 모호하거나 잘못된 숫자를 거부
ok 14 - 원본 7,683건 적재와 재실행 멱등성
# tests 14
# pass 14
# fail 0
```

실행 방법은 [README](#백엔드-개발)에도 정리했다.

### 현재 한계와 개선 방향

커버리지 측정 도구(c8, nyc 등)를 도입하지 않아 테스트가 코드의 몇 퍼센트를 실행하는지 수치로 확인할 수 없다. 도구를 추가하면 빠진 분기를 더 체계적으로 찾을 수 있다.

프런트엔드(React 관리자 화면)는 별도 테스트가 없다. 화면 단위 테스트나 API 연동 테스트를 추가하면 백엔드 응답 형식이 바뀔 때 프런트엔드 쪽 회귀를 더 빨리 잡을 수 있다.

동시성 테스트는 "같은 식품코드로 동시 등록" 한 가지 시나리오만 다룬다. 실제 운영에서는 동시 수정·삭제 같은 다른 경쟁 조건도 있을 수 있어, 필요하면 시나리오를 더 추가할 수 있다.

## 5. 배포

이 프로젝트는 EC2 단일 인스턴스에서 Docker Compose로 실행할 수 있도록 구성했다. 현재는 로컬 구현과 컨테이너 검증까지 완료했으며, AWS 계정에 리소스를 생성하거나 실제 배포하지는 않았다.

서버 부트스트랩 먼저(수동): git clone → backend/.env.production 채우기 → docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build를 손으로 한 번 돌려서 EC2에서 실제로 뜨는지 확인 (이건 보고서에 "실제 EC2 환경에서 검증" 근거로도 쓸 수 있어요)
배포 전용 SSH 키 생성 → 공개키는 서버 ~/.ssh/authorized_keys에 추가
GitHub Secrets 등록 (EC2_HOST, EC2_USER, EC2_SSH_KEY)
anna → main 머지 → CI 통과 후 CD가 자동으로 SSH 접속해 git reset --hard origin/main + 재빌드 — 이미 1번에서 세팅해놨으니 그냥 조용히 성공해야 정상


### 구성

| 파일 | 역할 |
| --- | --- |
| `backend/Dockerfile` | Express API 이미지. 의존성 설치와 실행 단계를 분리한 멀티스테이지 빌드 |
| `frontend/Dockerfile` | React 관리자 화면 이미지. Node로 빌드하고 Nginx로 정적 파일을 제공 |
| `docker-compose.yml` | DB·API·프런트엔드·시드 4개 서비스를 함께 실행하는 로컬 통합 구성 |
| `docker-compose.prod.yml` | 운영에서 `docker-compose.yml`과 함께 지정하는 override. `backend/.env.production`을 읽고 `NODE_ENV=production`으로 덮어쓴다 |
| `backend/.env.local.example`, `backend/.env.production.example` | 백엔드 로컬·운영 환경변수 예시 |
| `frontend/.env.local.example`, `frontend/.env.production.example` | 프런트엔드 로컬·운영 환경변수 예시 |
| `backend/.dockerignore`, `frontend/.dockerignore` | `node_modules` 등을 빌드 컨텍스트에서 제외 |
| `.github/workflows/deploy.yml` | `main`에서 CI(`ci.yml`)가 성공한 뒤 SSH로 EC2에 접속해 배포하는 CD 워크플로 |

`backend/Dockerfile`은 `npm ci --omit=dev`로 의존성만 설치하는 단계와 실행 단계를 분리해 `devDependencies`(Prettier 등)와 `tests/`가 최종 이미지에 들어가지 않는다. 비루트 사용자(`USER node`)로 실행하고, `HEALTHCHECK`가 `/health/ready`를 주기적으로 확인해 DB 연결까지 정상일 때만 컨테이너를 "healthy"로 표시한다.

`frontend/Dockerfile`도 Node 빌드 단계와 Nginx 서빙 단계를 분리한다. `nginx.conf`가 `/api`, `/api/`, `/health/`로 들어오는 요청을 `http://api:3000`으로 프록시하고, 나머지 경로는 `index.html`로 넘겨 React Router의 클라이언트 라우팅을 지원한다.

**외부 의존성 구성**: 이 서비스의 유일한 외부 의존성은 MariaDB다. `docker-compose.yml`의 `db` 서비스가 이를 함께 실행하며, `api`와 `seed` 서비스는 `depends_on: db: { condition: service_healthy }`로 DB의 헬스체크(`healthcheck.sh --connect --innodb_initialized`)가 통과한 뒤에만 시작한다. `frontend`도 같은 방식으로 `api`가 healthy할 때까지 기다린다. 별도의 대기 스크립트 없이 Compose의 `depends_on`과 헬스체크만으로 기동 순서를 보장했다.

### 배포 구조

```text
브라우저 → HTTPS 프록시 → Express + React 정적 파일
                                ↓
                       MariaDB / Docker volume
```

단일 EC2 구성에서는 Docker Compose로 API와 MariaDB를 함께 실행할 수 있다. 실제 운영에서는 API와 Amazon RDS for MariaDB를 분리하면 백업, 장애 복구와 수평 확장이 수월하다.

### 배포 순서

1. 리전, 인스턴스, 디스크, 도메인, 운영 기간과 비용 범위를 정한다. 소스 빌드와 엑셀 적재의 메모리 사용량도 고려한다.
2. EC2에 Docker Engine과 Compose v2를 설치한다. AWS의 [EC2에서 Docker 설치 안내](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-container-image.html)를 참고한다.
3. `.env.production.example`을 기준으로 `backend/.env.production`을 서버에 직접 만들고 운영 값을 채운다. 이 파일은 git에 올리지 않으며 `docker-compose.prod.yml`이 이를 읽는다. 충분히 긴 새 관리자 키를 사용한다. 서버가 여러 대이거나 규모가 커지면 AWS Secrets Manager나 Parameter Store로 옮기는 편이 낫다.
4. 새 이미지에서 `npm run db:migrate`를 한 번 실행하고 성공한 경우에만 API를 `npm start`로 교체한다. 데이터가 비어 있는 최초 배포에서는 별도 작업으로 `npm run db:seed`를 실행하고 `npm run db:verify`로 확인한다.
5. 인스턴스의 HTTPS 프록시를 `127.0.0.1:8080`(프런트엔드 컨테이너)으로 연결하고 도메인 인증서를 설정한다. `/api`는 프런트엔드 Nginx가 다시 API 컨테이너로 프록시하므로 API 포트(3000)를 직접 바라볼 필요가 없다. 외부에서는 HTTPS로만 관리자 키를 전달한다.
6. [EC2 보안 그룹](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html)은 공개 HTTPS와 필요한 관리 접근만 허용한다. API의 3000 포트는 외부에 직접 공개하지 않으며 기본 Compose도 `127.0.0.1`에만 바인딩한다.
7. DB 볼륨의 백업과 복구, 로그 수집, 프록시의 실제 클라이언트 IP 전달 및 요청 제한 동작을 점검한다.
8. 헬스 체크, API 검색, 관리자 변경 작업과 컨테이너 재시작 후 데이터 보존을 확인한 뒤 실제 운영 URL을 README에 추가한다.
9. 이후 `main`에 대한 갱신은 `.github/workflows/deploy.yml`이 자동으로 처리한다. 구체적인 동작과 한계는 아래 [지속적 배포 (CD)](#지속적-배포-cd)에 정리했다.

다른 머신에서 컨테이너 이미지를 만들었다면 EC2의 CPU 아키텍처와 일치해야 한다. ECR을 사용할 때는 이미지 태그를 커밋 SHA로 관리하고 서버에서 해당 이미지를 내려받는 방식으로 확장할 수 있다.

DB는 `mariadb-dump` 또는 RDS 자동 백업을 사용하고 정기적으로 복구 절차까지 검증해야 한다. 실제 배포 전에는 AWS 계정, 리전, 예산, 도메인과 접속 방식을 확정하고 HTTPS, 백업과 외부 운영 환경을 별도로 검증해야 한다.

### 지속적 배포 (CD)

`docker-compose.yml` 하나만으로는 로컬 실행을 가정한 `backend/.env.local`과 `NODE_ENV=local`이 항상 적용된다. 운영에서는 override 파일을 함께 지정해 이 두 값을 운영용으로 바꾼다.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

`.github/workflows/deploy.yml`은 `workflow_run`으로 기존 CI(`ci.yml`)의 `main` 실행 결과를 구독하고, `conclusion == 'success'`일 때만 배포 잡을 실행한다. 즉 테스트를 통과하지 못한 커밋은 배포 대상에서 자동으로 제외된다. 배포 잡은 `appleboy/ssh-action`으로 EC2에 접속해 `git fetch`·`git reset --hard origin/main`으로 서버의 소스를 `main`과 정확히 맞춘 뒤 위 override 명령으로 이미지를 재빌드하고, `docker image prune -f`로 이전 이미지를 정리한다.

접속 정보(`EC2_HOST`, `EC2_USER`)와 배포 전용 SSH 개인키(`EC2_SSH_KEY`)는 GitHub Actions Secrets에만 저장하며 저장소에는 올리지 않는다. 개인 SSH 키와 분리한 배포 전용 키를 서버의 `authorized_keys`에 별도로 등록해, 이 키가 노출되어도 다른 접근 권한에는 영향이 없도록 했다.

`docker compose config`로 override 병합 결과를 직접 확인하는 과정에서, Compose가 `env_file` 목록을 완전히 교체하지 않고 두 파일을 이어붙인다는 점을 확인했다. `backend/.env.production`에 없는 키는 base의 `backend/.env.local` 값이 그대로 남는다. 실제로 `.env.production.example`에 `MARIADB_ROOT_PASSWORD`가 빠져 있어 로컬 루트 비밀번호가 새어 들어오는 것을 이 방식으로 발견해 두 예시 파일의 키를 맞췄다. `NODE_ENV`처럼 `environment:`에 직접 적는 값은 키 단위로 병합·override되어 문제가 없었다.

### 실행 결과

```bash
docker compose build
docker compose run --rm seed
docker compose up -d
docker compose ps
```

```text
NAME                               IMAGE                            STATUS                    PORTS
02-food-nutrition-api-api-1        02-food-nutrition-api-api        Up 57 minutes (healthy)   127.0.0.1:3000->3000/tcp
02-food-nutrition-api-db-1         mariadb:11.4                     Up 3 hours (healthy)      127.0.0.1:3306->3306/tcp
02-food-nutrition-api-frontend-1   02-food-nutrition-api-frontend   Up 3 hours                127.0.0.1:8080->80/tcp
```

세 컨테이너 모두 실행 중이며 `api`와 `db`는 헬스체크를 통과한 "healthy" 상태다. 실제 엔드포인트도 확인했다.

```http
GET http://localhost:3000/health/live
200 {"success":true,"code":"HEALTH_LIVE","data":{"status":"ok"}}

GET http://localhost:3000/health/ready
200 {"success":true,"code":"HEALTH_READY","data":{"status":"ok","database":"ok"}}

GET http://localhost:8080/api/foods   (프런트엔드 Nginx를 경유)
200 {"success":true,"code":"FOOD_LIST_SUCCESS", ...}
```

`http://localhost:8080/api/foods`가 성공한다는 것은 프런트엔드 컨테이너의 Nginx가 API 컨테이너로 정상적으로 프록시하고 있다는 뜻이다. 즉 별도 설정 없이 `docker compose up -d` 한 번으로 DB, API, 프런트엔드가 서로를 찾아 연결된다.

### 현재 한계와 개선 방향

실제 AWS 리소스 생성과 배포는 진행하지 않았다. 배포 구조와 순서는 위 [배포 순서](#배포-순서)에 정리했지만, 실제 EC2·도메인·HTTPS 환경에서 검증하지는 못했다.

현재 Compose 구성은 API와 DB를 같은 호스트에서 실행하는 것을 전제로 한다. 운영 규모가 커지면 README에도 적었듯 DB를 Amazon RDS 같은 별도 관리형 서비스로 분리하는 편이 백업·장애 복구·수평 확장에 유리하다.

외부 의존성이 MariaDB 하나뿐이라 Compose의 기본 `depends_on`/헬스체크만으로 충분했다. 캐시나 메시지 큐처럼 의존성이 늘어나면 시작 순서와 재시도 로직을 더 정교하게 다뤄야 할 수 있다.

CD 워크플로(`deploy.yml`)는 구성만 마쳤고 실제 EC2 환경에서 실행해 검증하지는 못했다. 최초 클론과 `.env.production` 배치는 여전히 수동으로 한 번 해야 하며, 이후 `main` 갱신만 자동화된다. 또한 배포 잡이 서버 소스를 `git reset --hard origin/main`으로 강제 일치시키므로 서버에는 `git`으로 추적되지 않는 변경을 남기면 안 된다. SSH 접속은 GitHub Actions 러너의 아웃바운드 IP가 유동적이라 특정 IP로 제한하기 어려워, 배포 전용 키 분리와 키 기반 인증으로 위험을 줄였다. 규모가 커지면 포트를 열지 않는 AWS SSM Session Manager나 CodeDeploy 방식으로 바꾸는 편이 더 안전하다.

## 6. 소감

협업에 도움이 되는 깃허브 커밋 단위나 커밋 메시지 작성 방법이 부족했던것같다. 지금은 관리자 인증 미들웨어 만 만들었는데 사용자 인증 미들웨어도 넣고 싶다. 더하자고 들면 더 할수도 있는데 어디까지 해야하는지 모르겠당...
