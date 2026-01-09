# 통계 페이지 성능 개선 — 캐시(Invalidate + TTL)

## 핵심 요약 ✅

- 통계는 계산 비용이 크기 때문에 **서버 메모리(in-memory) 캐시**로 결과를 보관하여 응답 속도를 개선합니다.
- 패턴: **Invalidate-on-write + TTL** (무효화 후 일정 시간 내 캐시를 사용).
- **무효화 포인트**(어떤 쓰기가 캐시에 영향 주는지)는 새 통계 항목 추가 시 함께 점검해야 합니다. 설계를 잘하면 수정 범위는 작아집니다.

---

## 지금까지(우리가 한 일) ✔️

- `lib/stats-cache.ts`에 인메모리 캐시 구현
  - getCachedStats(fetcher), warmStats(fetcher), invalidateStatsCache(), getStatsCacheDebug(), peekCachedStats(), maybeWarmStats(fetcher)
  - 기본 TTL: **30_000 ms** (환경변수 `STATS_CACHE_TTL_MS`로 변경 가능)
- `app/api/admin/statistics/route.ts`의 `computeStatistics()` 추출 및 `GET`에서 캐시 사용
- 주요 쓰기 엔드포인트에 **invalidateStatsCache() 호출** 추가
- 무효화 직후 **비동기 워밍(maybeWarmStats)** 호출을 추가(환경변수로 켜고 끌 수 있음)
- 개발용 디버그 엔드포인트 추가:
  - `GET /api/debug/stats-warm` — 강제 웜 (계산 시간 리턴)
  - `GET /api/debug/stats-info` — 캐시 상태
  - `GET /api/debug/stats-invalidate` — 무효화
  - `GET /api/debug/stats-get` — 캐시된 값 직접 확인
- 간단한 측정 결과(로컬):
  - Cold warm: 약 **10–15초** (tookMs)
  - Cached 조회: 약 **0.03–0.4초**

---

## 실무 팁 (권장 방식) 🔧

1. **범용 무효화**: 통계 전체를 한 키로 관리하고, 핵심 모델(orders, quotes, products, users) 변동 시 무효화.
2. **무효화 헬퍼**: `invalidateStatsCache()` 같은 중앙 함수 사용 — 모든 쓰기 라우트에서 호출.
3. **무효화 + 즉시 재계산(워밍)**: 무효화 시점에 비동기로 `maybeWarmStats(computeStatistics)` 호출해 첫 실제 요청 지연을 줄임.
4. **짧은 TTL + SWR**: TTL(예: 30s~1m)을 둔 뒤 만료 시 stale 응답을 바로 반환하고 백그라운드에서 재계산하면 UX가 부드러움.
5. **확장 옵션(장기)**: 다중 인스턴스/영속성이 필요하면 Redis + 태그 기반 무효화를 도입.

---

## 추천 우선순위

1. 우선: **무효화 헬퍼 + 모든 쓰기 엔드포인트에 invalidate 호출** (이미 적용됨) ✅
2. 추가: **무효화 후 워밍(recompute)** 로 첫 요청 지연을 제거 (옵션으로 기능 플래그 제공) ✅
3. 장기: **SWR 또는 Redis 기반**으로 확대

---

## 어떤 라우트에 추가하면 좋을지 (예시)

- `/api/admin/quotes/[id]/convert` — 필수 (견적 → 주문 변경)
- 주문 생성/업데이트 엔드포인트 (`/api/orders`, 관리자 주문 액션 등)
- 상품 생성/수정/삭제 및 가격/재고 변경 엔드포인트
- 사용자 생성 / 권한 변경 엔드포인트

---

## 피쳐 플래그

- **목적**: 운영에서 즉시 워밍을 켜거나 끌 수 있게 함 (운영 안정성 확보)
- **변수**: `STATS_WARM_ON_WRITE`
  - 기본: 워밍 **활성화** (값이 없으면 켜짐)
  - 비활성화: `STATS_WARM_ON_WRITE=false` 설정 → 쓰기 시 워밍 스킵
- 워밍 비활성화 방법 예:

```bash
# 쉘에서
export STATS_WARM_ON_WRITE=false
# 또는 .env 파일에 추가
STATS_WARM_ON_WRITE=false
# 서버 재시작 필요
```

---

## 테스트 / 검증 방법

- 캐시 무효화: `curl -i http://localhost:3000/api/debug/stats-invalidate` → 응답에서 `before/after` 확인
- 강제 웜: `curl -i http://localhost:3000/api/debug/stats-warm` → JSON의 `tookMs` 확인
- 캐시 조회: `curl -i http://localhost:3000/api/debug/stats-get` → `cached: true` / `value` 확인
- 캐시 상태: `curl -i http://localhost:3000/api/debug/stats-info` → `cache` 필드 확인
- 워밍 비활성화 테스트: `export STATS_WARM_ON_WRITE=false` 후 쓰기 경로(예: 상품 생성)를 호출하고 서버 로그에 `stats warm skipped` 메시지 확인

---

## 남은/권장 추가 작업

- TTL(환경변수 `STATS_CACHE_TTL_MS`)을 워크로드에 맞게 조정
- 위젯별(TopProducts/dailySeries 등)로 캐시를 분리해 TTL을 차등화하면 효율 향상
- SWR(프론트) 적용으로 만료 시 이전 값 즉시 노출 + 백그라운드 재계산
- 모니터링: warm `tookMs` 기록, 캐시 히트율, warm 실패율 수집
- 장기: Redis로 전환(다중 인스턴스 배포 시)

---

필요하시면 이 문서를 리포지토리의 README에 요약 추가하거나 `.env.example` 업데이트(플래그 추가)도 바로 해드리겠습니다.

감사합니다. 🙌
