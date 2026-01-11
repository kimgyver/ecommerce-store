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

## 🔗 데모 페이지

- **로컬 데모:** `http://chromet.localhost:3000/tenant-demo` — 방문하면 `Chromet` 테넌트의 데모 페이지(브랜딩 및 가격 적용 예시)를 확인할 수 있습니다.

---

## 🧾 운영 가이드 (DNS / SSL / 라우팅)

- **DNS 레코드 예시:** A 레코드 또는 CNAME을 사용합니다. 예: `A  123.123.123.123` 또는 `CNAME  app.yourplatform.com`.
- **권장 TTL / 재시도:** 검증 시 TTL로 인해 지연이 생길 수 있으므로 재시도(backoff) 로직을 두고 최대 10분 내 반복 검사 권장.
- **SSL/프록시:** 프로덕션에서는 TLS를 프록시(예: Vercel, Cloudflare, Nginx)에서 종료하고 플랫폼으로 리버스 프록시하세요. 서브도메인 기반 라우팅을 권장합니다.

## 🔒 보안·운영 권장 사항

- **검증된 도메인만 허용:** `DistributorDomain.status === 'verified'` 인 경우에만 도메인을 테넌트 매핑에 사용하세요(도메인 테이크오버 방지).
- **권한 제어:** 도메인 추가/검증/삭제는 관리자 권한으로 제한하고, 도메인 검증 API에 rate limiting 적용.
- **이메일 보안:** 테넌트별 송신 도메인은 SPF/DKIM/Dmarc 설정을 권장하며, 바운스/반송 처리를 마련하세요.

## ⚡ 캐싱·CDN 고려사항

- **캐시 키에 호스트 포함:** CDN/엣지 캐시 키에 `Host` 또는 `x-tenant-host` 를 포함해야 다른 테넌트의 페이지가 섞이지 않습니다.
- **브랜딩/가격 변경 시 인밸리데이션:** 브랜드나 가격이 바뀌면 관련 URL/페이지의 캐시를 무효화하세요.

## 🧪 테스트 & QA (로컬 재현 및 자동화)

- **로컬 재현:** `/etc/hosts` 에 `127.0.0.1 chromet.localhost` 같은 항목을 추가하고 브라우저에서 `http://chromet.localhost:3000/tenant-demo`로 접속해 브랜딩과 가격 적용을 확인하세요.
- **네트워크 확인:** DevTools Network 탭에서 `/api/products/:id` 요청의 `x-tenant-host` 헤더와 응답의 `price` 필드를 확인하세요.
- **E2E 시나리오 제안:** Playwright 테스트로 `chromet.localhost:3000/tenant-demo` 열기 → 브랜드(로고/색상) 확인 → 특정 제품에서 할인된 `price`가 표시되는지 검증.

## 🔍 문제 해결(즉시 확인 체크리스트)

- 프론트에서 기본가만 보일 때: 1) 요청이 `samsung.localhost` 등 테넌트 호스트로 되어 있는지 확인, 2) `/api/products/:id` 응답의 `price` 값을 확인, 3) 서버 로그에 들어오는 `x-tenant-host` 값 확인.
- 도메인 검증 실패 시: `DistributorDomain.details`에 저장된 DNS 레코드와 에러 메시지를 확인하세요.

## 💡 개발자 팁 & 명령어 예시

- API 호출 예시 (curl):

```bash
curl -s -H "x-tenant-host: chromet.localhost:3000" http://localhost:3000/api/products/<productId>
```

- 유용한 스크립트: `scripts/add-samsung-domain.ts`, `scripts/check-product-api-with-host.ts`, `scripts/list-distributors.ts` 를 참고하면 로컬 테넌트/도메인 재현에 도움이 됩니다.

## 📌 참고 문서

- `docs/white-label-poc.md` — POC 관련 메모
- `docs/NEW_WEBSITE_REQUIREMENTS.md` — 비즈니스 요구사항과 우선순위
- 코드 참조: `components/CompanyTabs.tsx`, `components/DomainsOnboarding.tsx`, `lib/tenant.ts`, `lib/pricing.ts`, `prisma/schema.prisma`

---

문의: 이 문서에 추가하고 싶은 사용 사례(예: multi-tenant 세션 처리, 쿠키/쿼리 최종 사용자 리다이렉션 등)가 있으면 알려주세요. 필요한 예제 curl, E2E 테스트 시나리오도 추가해 드리겠습니다. ✨
