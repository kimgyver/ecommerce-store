# Next.js 학습 노트

## 1. Next.js 기초

### 1.1 App Router vs Pages Router

**App Router (현재 프로젝트 사용)**

- Next.js 13+에서 도입된 새로운 라우팅 시스템
- 디렉토리 기반 라우팅: `/app/products/[id]/page.tsx` → `/products/:id`
- 서버 컴포넌트 기본값 (성능 최적화)
- 점진적 마이그레이션 가능

**Pages Router (레거시)**

- `/pages/api/products.ts` → `/api/products`
- 클라이언트 컴포넌트 기본값
- 호환성 유지하지만 새 프로젝트는 App Router 권장

### 1.2 폴더 구조

```
app/
├── api/                    # API 라우트 (백엔드)
│   ├── auth/              # 인증 관련
│   ├── products/          # 상품 API
│   └── orders/            # 주문 API
├── (admin)/               # Route Group (URL에 포함 X)
│   └── dashboard/         # /dashboard/...
├── products/              # 상품 페이지
│   ├── page.tsx          # /products
│   └── [id]/
│       └── page.tsx      # /products/:id
└── layout.tsx            # 루트 레이아웃 (공통)
```

**Route Group의 목적:**

- URL 구조와 파일 구조 분리
- 공통 레이아웃 공유
- 기능별 구조화
- 예: `(admin)` 그룹은 URL에 나타나지 않음 → `/dashboard/...` (O), `/admin/dashboard/...` (X)

---

## 2. 라우팅 및 네비게이션

### 2.1 동적 라우트 (Dynamic Routes)

```typescript
// app/products/[id]/page.tsx
export default function ProductDetail({ params }: { params: { id: string } }) {
  return <div>Product ID: {params.id}</div>;
}
```

**특징:**

- `[id]` → 단일 매개변수
- `[...slug]` → 캐치올 라우트 (여러 세그먼트)
- `[[...slug]]` → 옵션 캐치올 라우트

**중요:** 폴더 이름의 `[...]` 안의 이름이 곧 `params` 객체의 키가 됩니다.
- `[...slug]` → `params.slug`
- `[...category]` → `params.category`
- `[...name]` → `params.name`

### 2.2 라우트 핸들러 (API Routes)

```typescript
// app/api/products/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  return Response.json({ id: params.id });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 파일 삭제
  await unlink(`/public/uploads/products/${productImage}`);
  // DB 삭제 (CASCADE 설정으로 관련 데이터 자동 삭제)
  return Response.json({ success: true });
}
```

**HTTP 메서드:** GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS

### 2.3 클라이언트 네비게이션

```typescript
"use client";
import { useRouter } from "next/navigation";

export default function Component() {
  const router = useRouter();

  const handleDelete = async () => {
    const response = await fetch("/api/products/123", { method: "DELETE" });
    if (response.ok) {
      router.refresh(); // 서버 데이터 재검색
      router.push("/products"); // 페이지 이동
    }
  };
}
```

**useRouter vs useSearchParams:**

- `useRouter()`: 페이지 이동, 새로고침
- `useSearchParams()`: 쿼리 매개변수 읽기

---

## 3. 렌더링 패턴

### 3.1 서버 컴포넌트 (SSR - Server-Side Rendering)

```typescript
// app/products/page.tsx (기본값: 서버 컴포넌트)
export default async function Products() {
  const products = await fetch("...", { cache: "no-store" });
  return <div>{/* 렌더링 */}</div>;
}
```

**장점:**

- 데이터베이스 직접 접근 가능
- API 키 안전 (클라이언트에 노출 X)
- 큰 번들 크기 감소
- 성능 향상

**단점:**

- 상호작용 불가능 (`'use client'` 필요)
- 느린 데이터 소스 문제

### 3.2 클라이언트 컴포넌트

```typescript
"use client";
import { useState } from "react";

export default function CartComponent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const addToCart = async (productId: string) => {
    setLoading(true);
    const response = await fetch("/api/cart", {
      method: "POST",
      body: JSON.stringify({ productId, quantity: 1 })
    });
    if (response.ok) {
      const data = await response.json();
      setItems(data.items);
    }
    setLoading(false);
  };

  return <button onClick={() => addToCart("123")}>장바구니</button>;
}
```

**사용 시기:**

- 상호작용 필요 (클릭, 입력 등)
- 브라우저 API 사용 (localStorage, window 등)
- 상태 관리 (useState, useContext)

### 3.3 렌더링 전략

| 전략              | 설명                   | 사용 예              |
| ----------------- | ---------------------- | -------------------- |
| **Static (기본)** | 빌드 시 생성, CDN 캐시 | 정적 페이지          |
| **Dynamic**       | 요청마다 서버 생성     | 사용자별 데이터      |
| **ISR**           | 주기적 재생성          | 자주 변경되는 데이터 |
| **Streaming**     | 점진적 렌더링          | 큰 데이터            |

```typescript
// ISR 예제
export const revalidate = 60; // 60초마다 재생성

export default async function Product() {
  const data = await fetch("...", {
    next: { revalidate: 60 }
  });
}
```

---

## 4. 데이터 페칭 및 캐싱

### 4.1 fetch() 옵션

```typescript
// 서버 컴포넌트에서 데이터 가져오기
const response = await fetch("https://api.example.com/data", {
  // 캐싱 전략
  cache: "force-cache", // 항상 캐시 (기본)
  // cache: 'no-store',     // 캐시 안함

  // ISR 설정
  next: {
    revalidate: 3600, // 1시간마다 재검증
    tags: ["products"] // 태그 기반 재검증
  }
});
```

**캐싱 전략:**

- `force-cache`: 캐시된 데이터 사용 (기본값)
- `no-store`: 매번 새로 가져오기 (실시간 데이터)
- `revalidate-interval`: 시간 기반 재검증

### 4.2 서버 액션 (Server Actions)

```typescript
// app/api/products/route.ts 대신 컴포넌트에서 직접
"use server";

export async function deleteProduct(id: string) {
  const product = await db.product.findUnique({ where: { id } });

  // 이미지 삭제
  if (product.imageUrl) {
    await unlink(`/public/uploads/products/${product.imageUrl}`);
  }

  // DB 삭제
  await db.product.delete({ where: { id } });

  revalidatePath("/products"); // 캐시 무효화
  redirect("/products");
}

// 클라이언트에서 사용
("use client");
<form action={deleteProduct}>
  <input type="hidden" name="id" value="123" />
  <button type="submit">삭제</button>
</form>;
```

**장점:**

- API 라우트 불필요
- 자동 캐시 무효화
- 점진적 향상 (Progressive Enhancement)

### 4.3 캐시 무효화

```typescript
// 특정 경로 무효화
revalidatePath("/products");
revalidatePath("/products/[id]", "page");

// 특정 태그 무효화 (fetch 시 tags 옵션 설정한 경우)
revalidateTag("products");

// 전체 경로 무효화 (드물게 사용)
revalidatePath("/", "layout");
```

---

## 5. 인증 (Authentication)

### 5.1 NextAuth.js 설정

```typescript
// lib/auth.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) return null;

        // 비밀번호 검증
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name
        };
      }
    })
  ],
  callbacks: {
    // JWT 토큰 생성
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // 세션 확장
    async session({ session, token }) {
      session.user.id = token.id;
      return session;
    }
  },
  session: {
    strategy: "jwt", // JWT 기반 세션
    maxAge: 30 * 24 * 60 * 60 // 30일
  },
  pages: {
    signIn: "/auth/login"
  }
};
```

### 5.2 NextAuth 라우트 핸들러

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

**NextAuth가 처리하는 경로:**

- `/api/auth/signin` - 로그인 페이지
- `/api/auth/callback/[provider]` - 콜백
- `/api/auth/session` - 세션 조회
- `/api/auth/signout` - 로그아웃

### 5.3 세션 확인 및 사용

```typescript
// 서버 컴포넌트에서
import { auth } from "@/lib/auth";

export default async function Profile() {
  const session = await auth();

  if (!session) {
    return <div>로그인 필요</div>;
  }

  return <div>환영합니다, {session.user.email}</div>;
}

// 클라이언트 컴포넌트에서
("use client");
import { useSession } from "next-auth/react";

export default function ProfileClient() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div>로딩...</div>;
  if (!session) return <div>로그인 필요</div>;

  return <div>{session.user.email}</div>;
}
```

### 5.4 비밀번호 해싱

```typescript
// 회원가입
import bcrypt from "bcryptjs";

const hashedPassword = await bcrypt.hash(password, 10);
// 10 = salt rounds (높을수록 안전하지만 느림)

// 로그인 (비밀번호 검증)
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

**Salt Rounds (보안 수준):**

- 8-10: 권장 (균형)
- 12+: 매우 안전 (느림)
- 5 이하: 위험

---

## 6. 미들웨어

### 6.1 요청 미들웨어

```typescript
// middleware.ts (루트 디렉토리)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // 토큰 확인
  const token = request.cookies.get("next-auth.session-token");

  if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/admin/:path*"]
};
```

### 6.2 응답 헤더 추가

```typescript
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 보안 헤더
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");

  return response;
}
```

---

## 7. API 라우트 (Route Handlers)

### 7.1 기본 구조

```typescript
// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const products = await db.product.findMany({
    where: category ? { category } : {}
  });

  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const data = await request.json();

  const product = await db.product.create({
    data
  });

  return NextResponse.json(product, { status: 201 });
}
```

### 7.2 동적 라우트

```typescript
// app/api/products/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const product = await db.product.findUnique({
    where: { id: params.id }
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const product = await db.product.findUnique({
    where: { id: params.id }
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // 이미지 파일 삭제 (DB 관련 없음)
  if (product.imageUrl && product.imageUrl.startsWith("/uploads/")) {
    const filepath = path.join(process.cwd(), "public", product.imageUrl);
    try {
      await unlink(filepath);
    } catch (error) {
      console.error("Image delete failed:", error);
      // 파일 삭제 실패해도 계속 진행
    }
  }

  // DB 삭제 (CASCADE로 관련 데이터 자동 삭제)
  await db.product.delete({
    where: { id: params.id }
  });

  return NextResponse.json({ success: true });
}
```

**주요 포인트:**

- 파일 삭제는 DB와 별도 처리
- CASCADE 설정으로 관련 데이터 자동 처리
- 에러 발생해도 응답 반환

### 7.3 CORS 처리

```typescript
export async function GET(request: NextRequest) {
  const response = NextResponse.json({ data: "value" });

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST");

  return response;
}
```

---

## 8. 상태 관리

### 8.1 Context API (기본)

```typescript
// lib/cart-context.tsx
"use client";
import { createContext, useContext, useState } from "react";

type CartContextType = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: CartItem) => {
    setItems([...items, item]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  return (
    <CartContext.Provider value={{ items, addItem, removeItem }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
```

### 8.2 상태 업데이트 (낙관적 업데이트)

```typescript
"use client";
import { useOptimistic } from "react";

export function ProductList() {
  const [products, setProducts] = useState(initialProducts);
  const [optimisticProducts, addOptimisticProduct] = useOptimistic(products);

  const handleDelete = async (id: string) => {
    // UI 즉시 업데이트 (낙관적 업데이트)
    addOptimisticProduct({ type: "delete", id });

    // 서버 요청
    const response = await fetch(`/api/products/${id}`, {
      method: "DELETE"
    });

    if (response.ok) {
      setProducts(products.filter(p => p.id !== id));
    } else {
      // 실패하면 원래대로 복구 (자동)
    }
  };

  return (
    <ul>
      {optimisticProducts.map(product => (
        <li key={product.id}>{product.name}</li>
      ))}
    </ul>
  );
}
```

---

## 9. 데이터베이스 (Prisma ORM)

### 9.1 스키마 정의

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  password String

  orders Order[]
  reviews Review[]
}

model Product {
  id        Int     @id @default(autoincrement())
  name      String
  price     Float
  stock     Int     @default(0)
  imageUrl  String?

  orderItems OrderItem[]
  reviews    Review[]

  @@index([name])
}

model Order {
  id        Int     @id @default(autoincrement())
  userId    Int
  total     Float
  status    String  @default("pending")
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])
  items     OrderItem[]

  @@index([userId])
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  orderId   Int
  productId Int
  quantity  Int
  price     Float

  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model Review {
  id        Int     @id @default(autoincrement())
  userId    Int
  productId Int
  rating    Int     @default(5)
  comment   String?
  createdAt DateTime @default(now())

  user      User    @relation(fields: [userId], references: [id])
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}
```

### 9.2 마이그레이션

```bash
# 새 마이그레이션 생성
npx prisma migrate dev --name add_cascade_to_orderitem

# 스키마 확인
npx prisma studio

# 프로덕션 마이그레이션
npx prisma migrate deploy
```

### 9.3 쿼리

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// CRUD
const product = await prisma.product.create({
  data: { name: 'Laptop', price: 999 }
});

const products = await prisma.product.findMany({
  where: { stock: { gt: 0 } }, // 재고 > 0
  include: { reviews: true },   // 관계 포함
  orderBy: { createdAt: 'desc' } // 정렬
});

const product = await prisma.product.findUnique({
  where: { id: 1 }
});

await prisma.product.update({
  where: { id: 1 },
  data: { price: 1199 }
});

await prisma.product.delete({
  where: { id: 1 }
  // CASCADE 설정되면 OrderItem도 자동 삭제
});

// 트랜잭션
await prisma.$transaction([
  prisma.order.create({ data: {...} }),
  prisma.product.update({
    where: { id: 1 },
    data: { stock: { decrement: 1 } }
  })
]);

export default prisma;
```

---

## 10. 실전 패턴

### 10.1 에러 처리

```typescript
// 서버 컴포넌트
export default async function Product({ params }) {
  try {
    const product = await db.product.findUnique({
      where: { id: params.id }
    });

    if (!product) {
      return <div>상품을 찾을 수 없습니다</div>;
    }

    return <ProductDetail product={product} />;
  } catch (error) {
    console.error("Error:", error);
    return <div>오류가 발생했습니다</div>;
  }
}

// API 라우트
export async function DELETE(request: NextRequest, { params }) {
  try {
    const product = await db.product.findUnique({
      where: { id: params.id }
    });

    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.product.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
```

### 10.2 파일 업로드

```typescript
// app/api/upload/route.ts
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // 디렉토리 생성
  const uploadDir = path.join(process.cwd(), "public/uploads/products");
  await mkdir(uploadDir, { recursive: true });

  // 파일 저장
  const filename = `${Date.now()}-${file.name}`;
  const filepath = path.join(uploadDir, filename);

  const buffer = await file.arrayBuffer();
  await writeFile(filepath, new Uint8Array(buffer));

  return NextResponse.json({
    url: `/uploads/products/${filename}`
  });
}
```

### 10.3 이미지 최적화

```typescript
// components/product-image.tsx
import Image from "next/image";

export default function ProductImage({
  src,
  alt
}: {
  src: string;
  alt: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={300}
      height={300}
      quality={75}
      priority={false}
      placeholder="blur"
      blurDataURL="data:image/png;base64,..."
    />
  );
}
```

**Next.js Image 이점:**

- 자동 WebP 변환
- 반응형 이미지
- Lazy loading
- 최적화된 성능

---

## 11. 성능 최적화

### 11.1 코드 분할 (Code Splitting)

```typescript
// 동적 임포트 (자동 분할)
import dynamic from "next/dynamic";

const AdminDashboard = dynamic(() => import("@/components/AdminDashboard"), {
  loading: () => <div>로딩 중...</div>,
  ssr: false // 서버에서 렌더링하지 않음
});

export default function Page() {
  return <AdminDashboard />;
}
```

### 11.2 메모이제이션

```typescript
// 서버 컴포넌트 캐싱
import { cache } from "react";

const getProduct = cache(async (id: string) => {
  return await db.product.findUnique({ where: { id } });
});

// 같은 요청 범위 내에서 반복 호출해도 한 번만 실행
export default async function Page({ params }) {
  const product1 = await getProduct(params.id);
  const product2 = await getProduct(params.id); // 캐시됨
}

// 클라이언트 컴포넌트
("use client");
import { useMemo } from "react";

export default function Component({ items }) {
  const expensiveValue = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price, 0);
  }, [items]);
}
```

### 11.3 번들 크기 확인

```bash
npx next build
# .next/static 폴더에서 크기 확인

npm install --save-dev @next/bundle-analyzer

# next.config.ts에 추가
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)

# 실행
ANALYZE=true npm run build
```

---

## 12. 배포

### 12.1 환경 변수

```bash
# .env.local (로컬 개발)
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
NEXTAUTH_SECRET=random-secret-key
NEXTAUTH_URL=http://localhost:3000
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# .env.production (프로덕션)
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=production-secret
NEXTAUTH_URL=https://yourdomain.com
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

### 12.2 배포 체크리스트

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["yourdomain.com"],
    formats: ["image/webp", "image/avif"]
  },
  compress: true,
  swcMinify: true,
  productionBrowserSourceMaps: false
};

export default nextConfig;
```

**배포 전 확인:**

- [ ] 환경 변수 설정
- [ ] NEXTAUTH_SECRET 설정 (프로덕션)
- [ ] 데이터베이스 마이그레이션 완료
- [ ] 빌드 성공 (`npm run build`)
- [ ] 로그 정리
- [ ] 에러 페이지 설정

---

## 13. 주요 Q&A

### Q1: Server Component와 Client Component의 차이점은?

**Server Component (기본값)**

- 서버에서만 실행
- DB 직접 접근
- API 키 안전
- 번들 크기 작음
- 상호작용 불가능

**Client Component (`'use client'`)**

- 브라우저에서 실행
- 상호작용 가능 (이벤트, 상태)
- 브라우저 API 사용
- 번들 크기 증가
- HTTPS 요청으로 DB 접근

### Q2: NextAuth.js의 JWT와 세션 전략의 차이점은?

**JWT (Token-based)**

- 토큰 저장 (쿠키 또는 로컬스토리지)
- 상태 비저장 (stateless)
- 마이크로서비스 환경 좋음
- 크로스 도메인 요청 가능
- 토큰 갱신 필요

**Session (Database-based)**

- 서버에 세션 저장
- 상태 저장 (stateful)
- 즉시 로그아웃 가능
- 단순한 구현
- 서버 리소스 필요

### Q3: 캐싱 전략은?

```typescript
// 자주 변경 안 되는 데이터 (정적)
export const revalidate = 3600; // 1시간

// 실시간 데이터
const response = await fetch("...", { cache: "no-store" });

// 주기적 재생성 (ISR)
const response = await fetch("...", {
  next: { revalidate: 60, tags: ["products"] }
});
```

### Q4: 상품 삭제 시 관련 데이터 처리는?

**DB 관계 (Prisma CASCADE)**

```prisma
model OrderItem {
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  // product 삭제 → OrderItem 자동 삭제
}
```

**파일 처리 (별도 로직)**

```typescript
// 이미지 파일은 DB CASCADE가 처리 안 함
await unlink(`/public/uploads/products/${imageUrl}`);
```

### Q5: Race condition 처리는?

```typescript
// 트랜잭션 사용
await prisma.$transaction(async tx => {
  const product = await tx.product.findUnique({
    where: { id: 1 }
  });

  if (product.stock < 1) {
    throw new Error("재고 부족");
  }

  await tx.product.update({
    where: { id: 1 },
    data: { stock: { decrement: 1 } }
  });

  await tx.orderItem.create({
    data: { productId: 1, quantity: 1 }
  });
});
```

### Q6: 비밀번호 해싱은?

```typescript
// 회원가입
const hashedPassword = await bcrypt.hash(password, 10);
// 10 = salt rounds (권장값)

// 로그인
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

### Q7: CORS 처리는?

```typescript
// API 라우트에서
export async function GET(request: NextRequest) {
  const response = NextResponse.json({ data: "value" });
  response.headers.set("Access-Control-Allow-Origin", "*");
  return response;
}

// middleware.ts에서 (전역)
export function middleware(request: NextRequest) {
  return NextResponse.next({
    headers: {
      "Access-Control-Allow-Origin": "*"
    }
  });
}
```

---

## 14. 실전 트러블슈팅

### 14.1 상품 삭제 실패

**증상:** DELETE 요청 후 "Product not found" 에러

**원인:**

1. 외래키 제약 조건 (FK constraint)
2. 잘못된 CASCADE 설정
3. 트랜잭션 타이밍 이슈

**해결:**

```prisma
// 1. 스키마에서 CASCADE 확인
model OrderItem {
  product Product @relation(..., onDelete: Cascade)
}

// 2. 마이그레이션 실행
npx prisma migrate dev

// 3. API에서 재시도 로직
export async function DELETE(request, { params }) {
  try {
    await db.product.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### 14.2 이미지 업로드 실패

**증상:** 파일 저장 안 됨, 404 에러

**원인:**

1. 디렉토리 미생성
2. 권한 문제
3. 경로 오류

**해결:**

```typescript
import { mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const uploadDir = path.join(process.cwd(), "public/uploads/products");

  // 디렉토리 생성 (없으면 생성)
  await mkdir(uploadDir, { recursive: true });

  // 파일 저장
  const filename = `${Date.now()}-${file.name}`;
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);

  return NextResponse.json({ url: `/uploads/products/${filename}` });
}
```

### 14.3 NextAuth 로그인 실패

**증상:** 로그인 후 세션 없음

**원인:**

1. NEXTAUTH_SECRET 미설정
2. 콜백 함수 오류
3. 쿠키 설정 문제

**해결:**

```bash
# .env.local
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000
```

```typescript
// lib/auth.ts
callbacks: {
  async jwt({ token, user }) {
    if (user) token.id = user.id;
    return token;
  },
  async session({ session, token }) {
    if (session.user) session.user.id = token.id;
    return session;
  }
}
```

---

## 15. 추가 학습 자료

- **공식 문서:** https://nextjs.org/docs
- **Vercel 배포:** https://vercel.com/docs
- **Prisma:** https://www.prisma.io/docs
- **NextAuth.js:** https://next-auth.js.org
- **Stripe 결제:** https://stripe.com/docs

---

## 학습 체크리스트

- [ ] Server vs Client Component 구분
- [ ] 라우팅 시스템 이해
- [ ] 데이터 페칭 및 캐싱 전략
- [ ] NextAuth.js 인증 흐름
- [ ] Prisma ORM 사용
- [ ] API 라우트 작성
- [ ] 에러 처리
- [ ] 성능 최적화
- [ ] 배포 프로세스
- [ ] 보안 (환경변수, 비밀번호 해싱)
