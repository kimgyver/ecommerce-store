# ✅ White-label 기능 문서

요약: 본 프로젝트의 White-label 기능은 **개별 유통사(Distributor)** 별로 브랜드(로고, 색상), 도메인 온보딩(검증), 그리고 전용 가격/할인을 설정해 고객에게 해당 유통사의 브랜드로 쇼핑 경험을 제공하도록 설계되어 있습니다.

---

## 🔎 개요

- 목적: 한 코드베이스로 여러 유통사(브랜드)를 호스팅하고, 각 유통사별로 브랜드 UI(로고/색상), 커스텀 도메인, 가격정책을 적용한다.
- 핵심 구성요소:
  - DB 모델: `Distributor`, `DistributorDomain`, `DistributorPrice`
  - 관리자 UI: `B2B Management` (Company / Pricing / Preview)
  - Tenant 해석 로직: 호스트(Host) 또는 도메인 기반으로 테넌트(Distributor) 결정
  - 도메인 검증: 서버에서 DNS(A/CNAME) 레코드 확인, 결과를 `DistributorDomain.details`에 저장

---

## 🗂 데이터 모델 (주요 필드)

- Distributor
  - `id`, `name`, `emailDomain`, `logoUrl`, `brandColor`, `defaultDiscountPercent`
  - 관계: `domains: DistributorDomain[]`, `distributorPrices: DistributorPrice[]`
- DistributorDomain
  - `id`, `domain`, `status` (`pending|verified|failed`), `lastCheckedAt`, `details`(검증 결과 JSON)

참고: Prisma 스키마에서 `Distributor`와 `DistributorDomain`은 이미 정의되어 있으며, 마이그레이션이 적용되어야 합니다.

---

## 🧭 Tenant 결정 로직

- 기본 아이디어: 요청의 Host(hostname) 또는 서브도메인을 보고 관련된 Distributor를 찾습니다.
- 과정(간략):
  1. 요청 호스트에서 정확히 매칭되는 `DistributorDomain`(verified 우선)을 찾음 → 해당 `distributor` 사용
  2. 호스트가 `emailDomain` 또는 회사 키워드와 매칭되는 `Distributor`가 있으면 사용
     2.5. 도메인/서브도메인 매핑 예: `chromet.com` 또는 `chromet.ecommerce-store.com` → Host 헤더로 테넌트 조회 → 해당 디스트리뷰터 컨텍스트로 동작
  3. 없으면 기본(플랫폼) 동작

참고 파일: `lib/tenant.ts` (호스트 기반 매핑), `components/TenantServerProvider.tsx` (headers()를 통해 서버에서 테넌트 주입)

---

## 🛠 관리자 UI & API

관리자 페이지: `/admin/b2b-management`

- 탭 구조: **Company** / **Pricing** / **Preview** (`components/CompanyTabs.tsx`)

Company 탭

- `CompanyBasics` (회사명, emailDomain 설정)
- `DomainsOnboarding` (도메인 추가, 도메인 검증, 삭제)

Pricing 탭

- Default Discount, Category Discounts, Product Pricing (tiered pricing 포함)
- 기본 할인: UI에서 `0`은 서버에 `null`로 보내져 '삭제' 의미로 처리

API 엔드포인트 (관리자용)

- GET `/api/admin/distributors` - 유통사 리스트
- POST `/api/admin/distributors` - 유통사 생성
- PUT `/api/admin/distributors/:id` - 유통사 업데이트
- GET `/api/admin/distributors/:id/domains` - 도메인 목록
- POST `/api/admin/distributors/:id/domains` - 도메인 추가
- POST `/api/admin/distributors/:id/domains/:domainId/verify` - 도메인 검증(서버측 DNS 체크)
- DELETE `/api/admin/distributors/:id/domains/:domainId` - 도메인 삭제

검증작업

- 서버에서 DNS 조회 (A 레코드, CNAME 등)를 수행하고 결과(레코드 목록, error 메시지 등)를 `details` 필드에 저장합니다. 검증 성공 시 `status = verified`로 바꿉니다.

---

## 💸 가격 계산 규칙 (요약)

- 기본 흐름: 제품 가격 → (distributor custom price) → (category discount) → (default discount)
- Helper: `lib/pricing.ts`에 `getProductPrice` 및 `getProductPriceForDistributor` 구현
- 관리 UI에서 기본 할인(0은 제거), 카테고리별 할인, 제품별 맞춤 가격을 설정할 수 있음

---

## ✅ 도메인 온보딩 / 검증 흐름 (관리자 관점)

1. 관리자 → Company 탭에서 도메인 입력 → 서버에 도메인 생성 (status=pending)
2. 관리자 또는 자동 프로세스가 `verify` 호출
3. 서버에서 DNS를 조회해 요구되는 레코드(예: A 또는 CNAME)가 있는지 확인
4. 성공 시 `verified`, 실패 시 `failed`와 상세 에러/레코드 정보를 `details`에 저장
5. 검증된 도메인을 테넌트 결정 로직에 등록하여 해당 도메인으로 접근 시 자동으로 유통사 브랜드 적용

---

## 📦 배포 & 고려사항

- SSL/Proxy: 프록시(Nginx, Vercel 등)에서 해당 도메인을 플랫폼 서비스에 라우팅해야 함
- DNS TTL: 도메인 검증 시 TTL/캐시로 인해 즉시 성공하지 않을 수 있음 — 재시도 로직 권장
- DB 마이그레이션: `prisma migrate`로 `DistributorDomain` 모델이 적용되어 있는지 확인

---

## 🧪 테스트 / QA 체크리스트

- 도메인 추가 → `pending` 상태
- 도메인 검증(정상 도메인) → `verified` 상태, details.records 포함
- 도메인 삭제 → list에서 제거 및 현재 cname 상태가 업데이트 됨
- Pricing: distributor custom price 적용 확인, 카테고리 할인 우선순위 확인
- Tenant resolution: 요청 Host로 접속 시 올바른 브랜드(색/로고)가 적용되는지 수동/자동 테스트

---

## 📌 참고 문서

- `docs/white-label-poc.md` — POC 관련 메모
- `docs/NEW_WEBSITE_REQUIREMENTS.md` — 비즈니스 요구사항과 우선순위
- 코드 참조: `components/CompanyTabs.tsx`, `components/DomainsOnboarding.tsx`, `lib/tenant.ts`, `lib/pricing.ts`, `prisma/schema.prisma`

---

문의: 이 문서에 추가하고 싶은 사용 사례(예: multi-tenant 세션 처리, 쿠키/쿼리 최종 사용자 리다이렉션 등)가 있으면 알려주세요. 필요한 예제 curl, E2E 테스트 시나리오도 추가해 드리겠습니다. ✨
