# Software Engineer Backend 기술과제

두 과제를 독립된 폴더로 구성했다. 각 폴더의 README에 실행 방법, 테스트, 설계 의도와 한계를 정리했다.

| 과제 | 구현 | 문서 |
| --- | --- | --- |
| 1. 개미수열 가운데 두 자리 | Python, 문자열 DAG, 테스트 우선 작성 | [01-look-and-say](01-look-and-say/README.md) |
| 2. 식품영양성분 API | Node.js·JavaScript·Express·MariaDB, React 관리자 화면 | [02-food-nutrition-api](02-food-nutrition-api/README.md) |

## 1번 실행

```bash
cd 01-look-and-say
python3 -m look_and_say 99 --length
python3 -m unittest discover -s tests -v
```

Python 3.12 이상이며 실행에 외부 의존성이 없다. n=99에서도 전체 문자열을 만들지 않고 가운데 두 자리를 계산한다.

## 2번 실행

```bash
cd 02-food-nutrition-api
npm ci
cp .env.local.example .env.local
npm run build
npm run db:seed
npm start
```

관리자 화면은 http://localhost:3000, Swagger는 http://localhost:3000/api/docs 에서 제공한다. 기본은 읽기 전용이며, 등록·수정·삭제는 `.env.local`에 관리자 키를 설정하면 사용할 수 있다. [키 설정·Docker·테스트 안내](02-food-nutrition-api/README.md)를 참고한다.

실제 원본 파일 7,683건을 포함한다. 재적재 시 중복 방지, 잘못된 행의 전체 롤백, 원본 수치 한정 표현 보존을 검증한다. GitHub Actions는 과제별 테스트와 관리자 화면·Docker 빌드를 실행하도록 구성했다.

## 배포

로컬 및 Docker 실행을 지원한다. [AWS 배포 가이드](02-food-nutrition-api/docs/aws-deployment.md)를 포함했으며 실제 AWS 리소스 생성과 배포는 별도로 진행한다.

## 작성과 제출

알고리즘은 외부 풀이를 검색하지 않고 작성했으며 테스트 우선 진행 기록을 포함한다. 초기 코드와 문서 작성에는 AI 코딩 도구를 사용했다. 커밋 메시지는 `feat`, `test`, `docs`, `chore`, `fix` 형식으로 관리한다.
