# 2번 식품영양성분 서비스

Express API와 React 관리자 화면을 독립 애플리케이션으로 구성했다. 백엔드는 제공된 엑셀 7,683건을 MariaDB에 적재하고 식품 검색, 조회, 생성, 수정, 삭제 API를 제공한다.

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
cp .env.example .env
npm run db:seed
npm run db:verify
npm run dev
```

관리자 키가 비어 있으면 API가 조회 전용으로 동작한다. 쓰기 요청에는 `.env`의 `ADMIN_API_KEY`와 같은 값을 전달한다.

Docker Compose도 `backend/.env`를 읽는다. `DATABASE_HOST`와 `DATABASE_PORT`는 Express 연결 위치이고 `MARIADB_*`는 Express와 MariaDB 컨테이너가 함께 사용하는 DB 설정이다. 실제 비밀번호와 관리자 키가 들어 있는 `.env`는 Git에 포함하지 않는다.

```http
Authorization: Bearer <ADMIN_API_KEY>
```

API는 다음 검색 조건을 지원한다.

```bash
curl -G --data-urlencode 'food_name=김치' http://localhost:3000/api/foods
```

| 메서드 | 경로 | 기능 |
| --- | --- | --- |
| GET | `/api/foods` | 검색과 목록 |
| GET | `/api/foods/:id` | 단건 조회 |
| POST | `/api/foods` | 생성 |
| PATCH | `/api/foods/:id` | 부분 수정 |
| DELETE | `/api/foods/:id` | 삭제 |
| POST | `/api/admin/verify` | 관리자 키 확인 |

식품코드는 UNIQUE 인덱스, 연도와 ID는 복합 인덱스를 사용한다. Sequelize 모델과 Umzug 마이그레이션을 분리했으며 `sequelize.sync({ alter: true })`는 사용하지 않는다. 엑셀 적재는 InnoDB 트랜잭션에서 실행되며 오류가 발생하면 전체를 롤백한다. 재적재 시 기존 코드를 건너뛴다. 자세한 규칙은 [데이터 매핑](backend/docs/data-mapping.md)에 있다.

```bash
cd backend
cp .env.test.example .env.test
cd ..
docker compose --profile test up -d db-test
cd backend
npm test
npm run format:check
```

테스트는 3307 포트의 `food_nutrition_test` DB만 초기화한다. 개발용 `food_nutrition` 데이터는 변경하지 않는다.

## 프런트엔드 개발

```bash
cd frontend
npm ci
npm run dev
npm run build
```

개발 서버는 `/api` 요청을 `http://127.0.0.1:3000`으로 프록시한다. 독립 도메인에 배포할 때는 빌드 시 `VITE_API_BASE_URL`을 API 주소로 설정할 수 있다. 빌드 결과는 `frontend/dist`에 생성된다.

```bash
VITE_API_BASE_URL=https://api.example.com npm run build
```

AWS 운영 방향은 [AWS 배포 가이드](backend/docs/aws-deployment.md)를 참고한다.
