# 식품영양성분 서비스

Express API와 React 관리자 화면을 독립 애플리케이션으로 구성했다. 백엔드는 제공된 엑셀 7,683건을 MariaDB에 적재하고 식품 검색, 조회, 생성, 수정, 삭제 API를 제공한다.

요구사항별 구현 내용과 검증 결과는 [구현 보고서](IMPLEMENTATION.md)에 순서대로 정리한다. 필드별 API 명세와 실행 가능한 예시는 Swagger UI에서 확인할 수 있다.

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

API는 다음 검색 조건을 지원한다.

```bash
curl -G --data-urlencode 'food_name=김치' http://localhost:3000/api/foods
```

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

식품코드는 UNIQUE 인덱스, 연도와 ID는 복합 인덱스를 사용한다. Sequelize 모델과 Umzug 마이그레이션을 분리했으며 `sequelize.sync({ alter: true })`는 사용하지 않는다. 엑셀 적재는 InnoDB 트랜잭션에서 실행되며 오류가 발생하면 전체를 롤백한다. 재적재 시 기존 코드를 건너뛴다. 원본 분석과 변환 규칙은 [구현 보고서](IMPLEMENTATION.md#1-원본-파일-적재)에 정리했다.

DB 통합 테스트는 GitHub Actions에서만 실행한다. CI는 작업마다 임시 MariaDB의 `food_nutrition_test` 데이터베이스를 만들고 테스트가 끝나면 폐기한다. 테스트 실행기는 `NODE_ENV=test`와 `_test`로 끝나는 DB 이름을 모두 확인하므로 개발·운영 DB를 실수로 초기화하지 않는다. 포맷 검사는 로컬에서도 `npm run format:check`로 실행할 수 있다.

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

## AWS 배포 준비

이 프로젝트는 EC2 단일 인스턴스에서 Docker Compose로 실행할 수 있도록 구성했다. 현재는 로컬 구현과 컨테이너 검증까지 완료했으며, AWS 계정에 리소스를 생성하거나 실제 배포하지는 않았다.

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
3. `.env.production.example`을 기준으로 운영 값을 AWS Secrets Manager, Parameter Store 또는 컨테이너 실행 환경에 등록한다. 충분히 긴 새 관리자 키를 사용한다.
4. 새 이미지에서 `npm run db:migrate`를 한 번 실행하고 성공한 경우에만 API를 `npm start`로 교체한다. 데이터가 비어 있는 최초 배포에서는 별도 작업으로 `npm run db:seed`를 실행하고 `npm run db:verify`로 확인한다.
5. 인스턴스의 HTTPS 프록시를 `127.0.0.1:3000`으로 연결하고 도메인 인증서를 설정한다. 외부에서는 HTTPS로만 관리자 키를 전달한다.
6. [EC2 보안 그룹](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html)은 공개 HTTPS와 필요한 관리 접근만 허용한다. API의 3000 포트는 외부에 직접 공개하지 않으며 기본 Compose도 `127.0.0.1`에만 바인딩한다.
7. DB 볼륨의 백업과 복구, 로그 수집, 프록시의 실제 클라이언트 IP 전달 및 요청 제한 동작을 점검한다.
8. 헬스 체크, API 검색, 관리자 변경 작업과 컨테이너 재시작 후 데이터 보존을 확인한 뒤 실제 운영 URL을 README에 추가한다.

다른 머신에서 컨테이너 이미지를 만들었다면 EC2의 CPU 아키텍처와 일치해야 한다. ECR을 사용할 때는 이미지 태그를 커밋 SHA로 관리하고 서버에서 해당 이미지를 내려받는 방식으로 확장할 수 있다.

DB는 `mariadb-dump` 또는 RDS 자동 백업을 사용하고 정기적으로 복구 절차까지 검증해야 한다. 실제 배포 전에는 AWS 계정, 리전, 예산, 도메인과 접속 방식을 확정하고 HTTPS, 백업과 외부 운영 환경을 별도로 검증해야 한다.
