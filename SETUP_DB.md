# PostgreSQL + Prisma 설치 및 설정 가이드

## 📋 사전 요구사항

- Node.js 18+
- PostgreSQL 12+ 설치됨
- npm 또는 yarn

---

## 🚀 설치 단계

### 1️⃣ PostgreSQL 설치 (macOS)

```bash
# Homebrew를 사용한 설치
brew install postgresql@15

# 서비스 시작
brew services start postgresql@15

# PostgreSQL 기본 사용자(postgres) 암호 설정 (선택사항)
psql postgres
```

**주의**: Prisma Migrate는 shadow database 생성을 위해 **superuser** 권한이 필요합니다.

- 간단한 로컬 개발: 기본 `postgres` 사용자 사용
- 프로덕션: 전용 사용자 생성 + 마이그레이션 권한 부여

### 2️⃣ 필수 패키지 설치

```bash
npm install @prisma/client prisma
npm install -D ts-node typescript
```

### 3️⃣ 환경 변수 설정

`.env` 파일을 수정하세요:

```bash
# 로컬 개발용 (postgres 기본 사용자)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecommerce_db"

# NextAuth (나중에 구현)
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

**참고**: `.env.local`도 같은 내용으로 유지하세요 (Next.js는 `.env.local` 우선 읽음)

### 4️⃣ Prisma 마이그레이션

```bash
# 스키마 생성 (처음 한 번)
npx prisma migrate dev --name init

# 또는 프로덕션 환경에서
npx prisma migrate deploy
```

### 5️⃣ 샘플 데이터 추가

```bash
npm run prisma:seed
```

### 6️⃣ Prisma Studio (선택사항)

```bash
npm run prisma:studio
```

브라우저에서 `http://localhost:5555`로 데이터베이스 관리

---

## 📊 데이터베이스 스키마

### User (사용자)

- 사용자 계정 및 인증 정보
- 주소, 전화번호 등 기본 정보

### Product (상품)

- 상품 정보, 가격, 재고
- 카테고리별 분류

### Order (주문)

- 주문 정보, 상태 추적
- **트랜잭션 지원**: 주문 시 재고 자동 차감

### OrderItem (주문 항목)

- 각 주문의 상품 목록
- 구매 당시 가격 저장 (가격 변동 대비)

### Wishlist (위시리스트)

- 사용자가 찜한 상품

### Review (리뷰)

- 상품 리뷰 및 평점

---

## 🔄 API 엔드포인트

### 상품

- `GET /api/products` - 모든 상품 조회
- `POST /api/products` - 상품 생성 (관리자)
- `GET /api/products/[id]` - 상품 상세 조회
- `PUT /api/products/[id]` - 상품 수정 (관리자)
- `DELETE /api/products/[id]` - 상품 삭제 (관리자)

### 주문 (트랜잭션 적용)

- `POST /api/orders` - 주문 생성 (재고 자동 차감)
- `GET /api/orders?userId=...` - 사용자 주문 조회

---

## 💡 주요 기능

### ✅ 트랜잭션 (Transaction)

주문 생성 시:

1. 상품 재고 확인
2. 재고 감소
3. 주문 생성

- **모두 성공하거나 모두 실패**: 데이터 무결성 보장

### ✅ 관계형 데이터베이스

- User ↔ Order (1:N)
- Order ↔ OrderItem (1:N)
- OrderItem ↔ Product (N:1)
- User ↔ Wishlist (1:N)
- User ↔ Review (1:N)

---

## 🐛 트러블슈팅

### PostgreSQL 연결 안 됨

```bash
# PostgreSQL 상태 확인
brew services list

# 재시작
brew services restart postgresql@15
```

### 마이그레이션 오류

```bash
# 프리즘 생성 재실행
npx prisma generate

# 이전 마이그레이션 목록 확인
npx prisma migrate status
```

---

## 📚 다음 단계

1. NextAuth.js로 사용자 계정/로그인 구현
2. 장바구니 → DB 저장
3. 결제 통합 (Stripe)
4. 리뷰 시스템
5. 관리자 대시보드

---

## 🔗 참고 자료

- [Prisma 문서](https://www.prisma.io/docs/)
- [PostgreSQL 문서](https://www.postgresql.org/docs/)
- [트랜잭션 개념](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
