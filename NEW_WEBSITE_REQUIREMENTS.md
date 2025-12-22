# 완전히 새로운 Pizazz 웹사이트 요구사항

> **배경**: 기존 possessystems.com을 대체할 새로운 웹사이트 구축  
> **목표**: B2B(디스트리뷰터) + B2C(일반 고객) 통합 플랫폼  
> **핵심**: White-label, 맞춤 가격/할인, Quote & PO 시스템

---

## 📋 기능 요구사항

### 1️⃣ 고객 유형 자동 식별 (이메일 도메인 기반)

```
사용자 로그인
  ↓
이메일 도메인 확인
  ↓
┌─────────────────────────────────┐
│ distributor.com → DISTRIBUTOR   │ (디스트리뷰터)
│ gmail.com → B2C_CUSTOMER        │ (일반 고객)
│ @company.com → DISTRIBUTOR      │ (등록된 회사)
└─────────────────────────────────┘
  ↓
다른 UI/가격/결제 방식 제공
```

**구현:**

- 이메일 도메인 → 디스트리뷰터 DB 조회
- 일치하면 DISTRIBUTOR 권한 + 할인 가격 로드
- 불일치하면 B2C_CUSTOMER (일반 고객)

---

### 2️⃣ 가격 관리 시스템

#### B2C 가격 (일반 고객)

```
SKU: ABC-123
기본가격: $100
```

#### B2B 가격 (디스트리뷰터별 맞춤)

```
디스트리뷰터: Chromet Inc.
SKU: ABC-123
├─ 기본가격: $100
├─ Chromet가격: $80 (20% 할인)
└─ 할인스케줄:
    ├─ 1-10개: $80 (20%)
    ├─ 11-50개: $75 (25%)
    └─ 51개+: $70 (30%)
```

**DB 구조:**

```
products
├─ id
├─ sku
├─ name
├─ base_price (B2C 가격)
└─ distributor_prices[]
    ├─ distributor_id
    ├─ price
    ├─ discount_schedule (JSON)
    └─ updated_at
```

---

### 3️⃣ 주문 프로세스 - Quote vs PO

#### A. Quote (견적 요청) - 영업사원용

**흐름:**

```
영업사원
  ↓
[Quote 요청] 버튼 클릭
  ↓
- 위치 선택 (드롭다운)
- PO 번호 입력 (선택사항)
- 제품 선택
  ↓
[Quote 이메일 전송] 버튼
  ↓
Pizazz에게 이메일:
"From: john@chromet.com
Subject: Quote Request from Chromet
PO#: 2025-001
Location: New York
Products:
- SKU-ABC-123 x 10 @ $80
- SKU-XYZ-456 x 5 @ $150
Total: $1,450"
```

**특징:**

- 아무 기록도 남기지 않음 (Draft 같은 느낌)
- 영업사원이 현장에서 빠르게 고객에게 가격 제시
- 자동 이메일로 Pizazz 확인

#### B. PO (구매주문) - 공식 주문

**흐름:**

```
디스트리뷰터/고객
  ↓
장바구니에 제품 추가
  ↓
[Checkout] → [주문 확정]
  ↓
자동으로 PO 생성
  ↓
┌─────────────────────┐
│ PO#: 2025-0001      │
│ Status: PENDING     │
│ Date: 2025-12-22    │
│ Total: $1,450       │
└─────────────────────┘
  ↓
┌─ 디스트리뷰터에게: PO 확인 이메일
│  "주문이 접수되었습니다"
│
└─ Pizazz에게: PO 상세 이메일
   "새로운 주문 #2025-0001
    From: Chromet Inc.
    Location: New York
    Items: ...
    Total: $1,450
    Action: 발송 준비"
```

**특징:**

- 공식 주문 기록 남음 (DB에 저장)
- 디스트리뷰터 대시보드에서 주문 조회 가능
- Pizazz 대시보드에서 모든 PO 관리
- 상태 추적: PENDING → PROCESSING → SHIPPED → DELIVERED

---

### 4️⃣ 결제 방식 분기

#### B2C: Stripe 신용카드 (즉시 결제)

```
[결제하기] → Stripe 팝업
  ↓
카드 입력 → 승인 → 즉시 처리
```

#### B2B: 30일 Net Invoice (외상)

```
[주문 확정]
  ↓
송장 생성 (invoice 생성)
  ↓
Pizazz가 DHL로 발송
  ↓
디스트리뷰터는 30일 내 송금
  ↓
결제 완료
```

---

### 5️⃣ White-Label 시스템

각 디스트리뷰터가 자신의 도메인으로 접근할 때:

```
chromet.com/shop → Chromet 브랜딩으로 표시
  ├─ 로고: Chromet 로고
  ├─ 색상 스킴: Chromet 브랜드 컬러
  ├─ 가격: Chromet 맞춤 가격
  ├─ 할인: Chromet 할인 스케줄
  └─ 제품: 같은 840 SKU (Chromet 가격 적용)

vs

pizazzstore.com → Pizazz 브랜딩
  ├─ 로고: Pizazz 로고
  ├─ 색상 스킴: Pizazz 컬러
  ├─ 가격: B2C 가격
  ├─ 할인: 없음
  └─ 제품: 같은 840 SKU (B2C 가격)
```

**구현:**

- 도메인별 또는 서브도메인별 설정 로드
- 같은 DB, 다른 UI 렌더링
- 각 디스트리뷰터별 설정 저장

---

### 6️⃣ 대시보드

#### A. 디스트리뷰터 대시보드

```
Chromet Inc. Dashboard
├─ 📊 요약
│  ├─ 총 주문: 45개
│  ├─ 총 매출: $50,000
│  └─ 미지급금: $12,500
│
├─ 📦 주문 관리
│  ├─ 진행 중: 5개
│  ├─ 배송 중: 3개
│  └─ 완료: 37개
│
├─ 💰 결제
│  ├─ 미지급 인보이스 (30일 내)
│  ├─ 결제 이력
│  └─ 송장 다운로드
│
├─ 🛍️ 제품
│  ├─ 가격 리스트 (Chromet 가격)
│  ├─ 할인 스케줄
│  └─ SKU 840개 검색/필터
│
└─ ⚙️ 설정
   ├─ 회사 정보
   ├─ 위치 관리
   └─ 연락처
```

#### B. Pizazz 관리자 대시보드

```
Pizazz Admin Dashboard
├─ 📊 전체 매출
│  ├─ 총 매출
│  ├─ 디스트리뷰터별 매출
│  └─ 월별 추이
│
├─ 📋 모든 PO 관리
│  ├─ 상태별 필터
│  ├─ 디스트리뷰터별 필터
│  └─ 배송 관리
│
├─ 👥 디스트리뷰터 관리
│  ├─ 34개 디스트리뷰터 목록
│  ├─ 각 디스트리뷰터 가격 설정
│  ├─ 할인 스케줄 관리
│  └─ White-label 설정
│
├─ 📦 인벤토리
│  ├─ SKU 관리 (840개)
│  ├─ 재고 수량
│  └─ 배송 상태
│
└─ 💬 커뮤니케이션
   ├─ Quote 요청 기록
   ├─ 이메일 템플릿
   └─ 자동 이메일 로그
```

---

### 7️⃣ 자동 이메일 시스템

**발송되어야 할 이메일들:**

```
Quote 요청 시 (영업사원)
  → Pizazz에게: "새로운 Quote 요청"

PO 생성 시 (디스트리뷰터)
  → 디스트리뷰터에게: "주문 확인"
  → Pizazz에게: "새로운 PO"

배송 시
  → 디스트리뷰터에게: "배송 공지 + 추적 링크"

배송 완료 시
  → 디스트리뷰터에게: "배송 완료"

결제 예정일 전
  → 디스트리뷰터에게: "지불 예정 알림 (30일 Net)"
```

**템플릿 필요:**

- Quote 요청 (Pizazz용)
- PO 확인 (고객용)
- PO 상세 (Pizazz용)
- 배송 공지 (고객용)
- 결제 알림 (고객용)

---

### 8️⃣ 보안 & 인증

**로그인:**

- NextAuth.js 또는 유사 솔루션
- 이메일/비밀번호 또는 SSO (OAuth)

**역할 기반 접근 제어 (RBAC):**

```
Roles:
├─ DISTRIBUTOR (디스트리뷰터 사원)
│  └─ 자신의 디스트리뷰터 데이터만 조회
├─ DISTRIBUTOR_ADMIN (디스트리뷰터 관리자)
│  └─ 전체 디스트리뷰터 데이터 + 설정
├─ PIZAZZ_STAFF (Pizazz 직원)
│  └─ 한정된 관리자 기능
├─ PIZAZZ_ADMIN (Pizazz 관리자)
│  └─ 전체 시스템 관리
└─ B2C_CUSTOMER (일반 고객)
   └─ 구매만 가능
```

---

### 9️⃣ 기술 스택 권장사항

**Frontend:**

- Next.js 14+ (SSR + SSG)
- React 18+
- Tailwind CSS 또는 Material-UI
- SWR 또는 TanStack Query (데이터 페칭)

**Backend:**

- Next.js API Routes 또는 별도 Node.js 서버
- Prisma ORM (DB 관리)
- TypeScript

**Database:**

- PostgreSQL 또는 MongoDB
  - 추천: **PostgreSQL** (트랜잭션, 복잡한 쿼리 필요)

**External Services:**

- Stripe (B2C 결제)
- SendGrid 또는 AWS SES (이메일)
- AWS S3 또는 Cloudinary (이미지 저장)
- Getty Images API (이미지 검색)

**Deployment:**

- Vercel (Next.js 최적화)
- AWS (확장성)
- Docker + Kubernetes (대규모)

---

### 🔟 데이터베이스 스키마 개요

```sql
-- 사용자/인증
users
├─ id (UUID)
├─ email (unique)
├─ password_hash
├─ role (DISTRIBUTOR, B2C_CUSTOMER, ADMIN)
├─ distributor_id (FK → distributors)
└─ created_at, updated_at

-- 디스트리뷰터
distributors
├─ id (UUID)
├─ name
├─ domain (예: chromet.com)
├─ logo_url
├─ brand_color
├─ locations[] (JSON: 지역별 주문)
└─ created_at

-- 제품
products
├─ id (UUID)
├─ sku (unique)
├─ name
├─ base_price (B2C)
├─ stock_quantity
└─ created_at

-- 디스트리뷰터 가격
distributor_prices
├─ id (UUID)
├─ distributor_id (FK)
├─ product_id (FK)
├─ price
├─ discount_schedule (JSON)
└─ updated_at

-- 주문 (PO)
orders
├─ id (UUID)
├─ po_number (unique)
├─ user_id (FK)
├─ distributor_id (FK, nullable)
├─ total_amount
├─ status (PENDING, PROCESSING, SHIPPED, DELIVERED)
├─ payment_status (UNPAID, PAID)
├─ payment_due_date (30일 후)
├─ created_at
└─ updated_at

-- 주문 상세
order_items
├─ id (UUID)
├─ order_id (FK)
├─ product_id (FK)
├─ quantity
├─ unit_price (실제 적용된 가격)
└─ subtotal

-- Quote 요청 기록
quotes
├─ id (UUID)
├─ user_id (FK)
├─ distributor_id (FK)
├─ items[] (JSON: 제품 + 수량)
├─ po_number (선택사항)
├─ location (선택사항)
├─ email_sent_at
└─ created_at
```

---

## 📅 구현 순서 (우선순위)

### Phase 1 (핵심): 2-3주

- [ ] 기본 인증 시스템 (사용자 로그인)
- [ ] 고객 유형 자동 식별 (이메일 도메인)
- [ ] 제품 + 가격 관리 (SKU 840개)
- [ ] B2C 기본 구매 (Stripe)

### Phase 2 (B2B): 2-3주

- [ ] 디스트리뷰터 가격 + 할인 시스템
- [ ] PO 생성 + 관리
- [ ] 30일 Net Invoice 결제
- [ ] 디스트리뷰터 대시보드

### Phase 3 (고급): 2-3주

- [ ] Quote 요청 시스템
- [ ] White-label 시스템 (도메인별 커스터마이징)
- [ ] 자동 이메일 시스템
- [ ] 관리자 대시보드

### Phase 4 (신기능): 2-3주

- [ ] 이미지 선택 + 마운팅 자동 추천
- [ ] Getty Images 연동
- [ ] 고급 주문 관리

---

## ✅ 성공 조건

새 웹사이트가 성공하려면:

1. **34개 디스트리뷰터 모두 white-label로 전환 가능**
2. **각 디스트리뷰터별 맞춤 가격/할인 자동 적용**
3. **Quote & PO 시스템이 자동화되어 영업사원/고객 시간 절감**
4. **30일 Net Invoice 결제로 디스트리뷰터 현금 흐름 개선**
5. **Pizazz 관리자가 모든 주문을 한곳에서 관리**

---

## 🚀 다음 단계

1. **기술 스택 확정** (Next.js + PostgreSQL + Stripe?)
2. **상세 DB 설계** (Prisma schema 작성)
3. **Phase 1 착수** (기본 인증 + 제품 관리)
4. **팀 역할 분담** (누가 frontend, backend, 데이터 마이그레이션?)

감사합니다!
