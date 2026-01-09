# NextAuth.js 보안 처리 상세 가이드

## 🔐 현재 구현된 보안 기능

### 1️⃣ JWT 토큰 암호화

**파일**: `lib/auth.ts` (라인 51-56)

```typescript
session: {
  strategy: "jwt",  // JWT 전략 사용
  maxAge: 30 * 24 * 60 * 60 // 30일 후 자동 만료
},
secret: process.env.NEXTAUTH_SECRET  // 비밀키로 암호화
```

**동작 방식**:

```
사용자 정보 (ID, 이메일, 이름)
         ↓
NEXTAUTH_SECRET로 암호화
         ↓
JWT 토큰 생성
         ↓
쿠키에 저장
```

**예시 JWT 토큰**:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

---

### 2️⃣ 비밀번호 해싱 (bcrypt)

**파일**: `lib/auth.ts` (라인 5, 29-31)

```typescript
import bcrypt from "bcryptjs"; // bcrypt 임포트

// 로그인 시: 사용자 입력 비밀번호와 저장된 해시 비교
const isPasswordValid = await bcrypt.compare(
  credentials.password, // 평문 비밀번호
  user.password // DB에 저장된 해시
);
```

**파일**: `app/api/auth/register/route.ts` (라인 43)

```typescript
// 회원가입 시: 비밀번호 해싱
const hashedPassword = await bcrypt.hash(password, 10);
// 10 = salt rounds (반복 횟수, 높을수록 안전하지만 느림)
```

**비밀번호 저장 흐름**:

```
사용자 입력: "myPassword123"
         ↓
bcrypt.hash() (salt rounds: 10)
         ↓
해시된 값: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36CHQq44"
         ↓
DB에 저장
```

**해시의 특징**:

- ✅ 일방향: 해시 → 평문 불가능
- ✅ 동일하지 않음: 같은 비밀번호도 다른 해시 생성
- ✅ 검증만 가능: bcrypt.compare()로만 확인

---

### 3️⃣ CSRF 보호

**NextAuth.js가 자동으로 처리합니다!**

**파일**: `app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions); // CSRF 토큰 자동 생성
export { handler as GET, handler as POST };
```

**CSRF 보호 동작**:

```
1. 로그인 페이지 로드
   ↓
2. NextAuth가 CSRF 토큰 자동 생성
   ↓
3. 토큰을 쿠키에 저장 (_csrf)
   ↓
4. 로그인 요청 시 토큰도 함께 전송
   ↓
5. 서버에서 검증
   ↓
6. 토큰 일치 → 요청 수락
   토큰 불일치 → 요청 거부 (악의적 요청)
```

**실제 예시**:

```html
<!-- 로그인 폼 전송 시 -->
POST /api/auth/signin Headers: { "csrf-token": "abc123xyz...", // 자동 포함
"Content-Type": "application/json" } Body: { email: "user@example.com",
password: "password123" }
```

---

### 4️⃣ 안전한 쿠키 관리

**NextAuth.js가 자동으로 설정합니다!**

**생성되는 쿠키들**:

| 쿠키명                    | 용도           | 보안 옵션                  |
| ------------------------- | -------------- | -------------------------- |
| `next-auth.session-token` | 사용자 세션    | HttpOnly, Secure, SameSite |
| `next-auth.csrf-token`    | CSRF 방지      | SameSite                   |
| `next-auth.callback-url`  | 리다이렉트 URL | HttpOnly                   |

**쿠키 보안 옵션**:

```javascript
// NextAuth가 내부적으로 사용하는 설정
{
  httpOnly: true,      // JavaScript에서 접근 불가 (XSS 방지)
  secure: true,        // HTTPS only (프로덕션)
  sameSite: "lax",     // 크로스 사이트 요청 방지
  maxAge: 30 * 24 * 60 * 60  // 30일 후 만료
}
```

**쿠키 접근 불가능한 이유**:

```javascript
// ❌ 작동 안 함 (XSS 방지)
document.cookie; // next-auth.session-token에 접근 불가

// ✅ NextAuth가 자동으로 처리
const { data: session } = useSession(); // 안전한 방식
```

---

## 🎯 보안 흐름 전체 과정

### **회원가입**

```
1. 사용자 입력: "password123"
   ↓
2. bcrypt.hash("password123", 10)
   ↓
3. "$2a$10$..." (해시) DB 저장
   ↓
4. ✅ 평문 비밀번호는 저장되지 않음
```

### **로그인**

```
1. 사용자 입력: email + password
   ↓
2. NextAuth CSRF 토큰 검증
   ↓
3. credentials 확인 (authorize 함수)
   ↓
4. bcrypt.compare(입력값, DB해시)
   ↓
5. 일치 → JWT 토큰 생성
   ↓
6. NEXTAUTH_SECRET으로 암호화
   ↓
7. HttpOnly 쿠키에 저장 (JavaScript 접근 불가)
   ↓
8. ✅ 로그인 완료
```

### **보호된 API 호출**

```
GET /api/user/profile
Headers: {
  Cookie: "next-auth.session-token=encrypted_jwt..."
}
   ↓
NextAuth가 쿠키 검증
   ↓
getServerSession(authOptions)
   ↓
토큰 복호화 (NEXTAUTH_SECRET 사용)
   ↓
사용자 정보 추출
   ↓
✅ 요청 처리
```

---

## 🔑 환경 변수 (.env)

```bash
# 토큰 암호화 키 (매우 중요!)
NEXTAUTH_SECRET="your-super-secret-key-min-32-chars"

# 개발/프로덕션 구분
NEXTAUTH_URL="http://localhost:3000"  # 개발
# NEXTAUTH_URL="https://yourdomain.com"  # 프로덕션
```

**NEXTAUTH_SECRET 생성**:

```bash
# OpenSSL 사용
openssl rand -base64 32

# 또는 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ⚠️ 프로덕션 보안 체크리스트

- ✅ `NEXTAUTH_SECRET` 설정 (32자 이상 무작위 문자열)
- ✅ `NEXTAUTH_URL` HTTPS 사용
- ✅ 데이터베이스 연결 암호화 (SSL)
- ✅ 비밀번호 정책 (최소 길이, 복잡도)
- ✅ Rate Limiting (브루트포스 공격 방지)
- ✅ 로그 모니터링 (의심한 활동)
- ✅ HTTPS 강제 (Redirect)
- ✅ Security Headers 설정

---

## 📝 요약

| 보안 기능     | 구현 위치                              | 상태    |
| ------------- | -------------------------------------- | ------- |
| JWT 암호화    | `lib/auth.ts`                          | ✅ 구현 |
| bcrypt 해싱   | `lib/auth.ts`, `app/api/auth/register` | ✅ 구현 |
| CSRF 보호     | `app/api/auth/[...nextauth]/route.ts`  | ✅ 자동 |
| HttpOnly 쿠키 | NextAuth 기본 설정                     | ✅ 자동 |
| Secure 쿠키   | NextAuth 기본 설정                     | ✅ 자동 |
| SameSite 보호 | NextAuth 기본 설정                     | ✅ 자동 |

---

## 🚀 추가 보안 강화 (선택사항)

### Rate Limiting (로그인 시도 제한)

```typescript
// 10분 동안 5회 이상 실패 시 차단
```

### 2FA (2단계 인증)

```typescript
// 로그인 후 이메일/SMS 코드 확인
```

### 로그인 이력 추적

```typescript
// 의심한 로그인 감지 및 알림
```

---

**현재 구현 수준: ⭐⭐⭐⭐ (4/5)** - 충분히 안전합니다! 🔒
