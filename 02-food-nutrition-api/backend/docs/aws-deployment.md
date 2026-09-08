# AWS 배포 준비

이 프로젝트는 EC2 단일 인스턴스에서 Docker Compose로 실행할 수 있도록 구성했다. 현재는 로컬 구현·컨테이너 검증 범위이며, AWS 계정에 리소스를 생성하거나 배포하지 않았다.

## 배포 구조

```text
브라우저 → HTTPS 프록시 → Express + React 정적 파일
                                ↓
                       MariaDB / Docker volume
```

과제 검증은 EC2의 Docker Compose에서 API와 MariaDB를 함께 실행할 수 있다. 실제 운영에서는 API와 Amazon RDS for MariaDB를 분리하면 백업, 장애 복구, 수평 확장이 수월하다.

## 배포 순서

1. 리전·인스턴스·디스크·도메인·운영 기간과 비용 범위를 정한다. 소스 빌드와 엑셀 적재의 메모리 사용량까지 고려한다.
2. EC2에 Docker Engine과 Compose v2를 설치한다. AWS의 [EC2에서 Docker 설치 안내](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-container-image.html)를 참고한다.
3. `.env.production.example`을 기준으로 운영 값을 AWS Secrets Manager, Parameter Store 또는 컨테이너 실행 환경에 등록한다. 충분히 긴 새 관리자 키를 사용한다.
4. 새 이미지로 `npm run db:migrate`를 한 번 실행하고 성공한 경우에만 API를 `npm start`로 교체한다. 데이터가 비어 있는 최초 배포에서는 별도 작업으로 `npm run db:seed`를 실행하고 `npm run db:verify`로 확인한다.
5. 인스턴스의 HTTPS 프록시를 `127.0.0.1:3000`으로 연결하고 도메인 인증서를 설정한다. 외부에서는 HTTPS로만 관리자 키를 전달한다.
6. [EC2 보안 그룹](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html)은 공개 HTTPS와 필요한 관리 접근만 허용하고, API 3000 포트를 직접 공개하지 않는다. 기본 Compose도 127.0.0.1에만 바인딩한다.
7. DB 볼륨의 백업·복구와 로그 수집, 프록시의 실제 클라이언트 IP 전달 및 요청 제한 동작을 점검한다. 현재 앱은 전달된 IP 헤더를 자동으로 신뢰하지 않는다.
8. 헬스 체크, API 검색, 관리자 변경 작업, 컨테이너 재시작 후 데이터 보존을 확인한 뒤 제출 README에 실제 URL을 추가한다.

컨테이너 이미지를 다른 머신에서 만들었다면 EC2의 CPU 아키텍처와 일치해야 한다. ECR 사용 시에는 빌드 이미지의 태그를 커밋 SHA로 관리하고 서버에서 해당 이미지를 내려받는 방식으로 확장할 수 있다.

백업은 `mariadb-dump` 또는 RDS 자동 백업을 사용하고 정기적으로 복구 절차까지 검증해야 한다.

실제 배포 시에는 AWS 계정·리전·예산·도메인과 사용할 접속 방식을 먼저 확정해야 한다. 이 가이드는 배포 완료 증명이 아니며 HTTPS·백업·외부 운영 환경은 별도 검증 대상이다.
