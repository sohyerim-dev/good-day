# 굿데이 프로젝트 면접 준비

---

## 공부 순서

1. **전체 구조 파악** ← 지금 여기
2. 인증/유저 상태 (AuthProvider → Zustand → hasHydrated)
3. React Query 구조 (QueryProvider, queryKey, staleTime, enabled)
4. 핵심 기능 페이지 코드 (create → CourseDetail → map/[id])
5. API Routes (search-places, route-directions)
6. RLS + OG 메타

---

## 1단계 — 전체 구조 파악

### 폴더 구조

```
src/app/
├── (auth)/                     # 로그인/회원가입
│   ├── login/
│   └── signup/
│
├── (main)/                     # 하단 네비게이션 있는 일반 페이지
│   ├── layout.tsx              # 하단 네비 포함한 레이아웃
│   ├── page.tsx                # 홈 (/)
│   ├── hot/                    # /hot - 인기 코스
│   ├── create/                 # /create - 코스 만들기
│   ├── courses/[id]/           # /courses/123 - 코스 상세
│   │   ├── edit/               # /courses/123/edit - 코스 수정
│   │   └── route/              # /courses/123/route - 경로 보기 (텍스트)
│   └── my-course/              # /my-course - 마이코스
│       ├── courses/            # 내가 만든 코스 목록
│       ├── bookmarks/          # 북마크한 코스
│       └── saved-places/       # 저장된 장소
│
├── (fullscreen)/               # 하단 네비 없는 지도 전용 페이지
│   ├── layout.tsx
│   ├── explore/                # /explore - 지도 기반 코스 탐색
│   └── map/[id]/               # /map/123 - 경로 보기 (지도)
│
└── api/                        # API Routes (서버 전용)
    ├── search-places/          # 네이버 장소 검색
    ├── route-directions/       # TMap 경로 안내
    └── geocode/                # 지역명 → 좌표 변환
```

---

### 그룹 폴더 `(괄호)`의 역할

URL에는 나타나지 않고, **레이아웃을 묶는 용도**로만 쓰여요.

| 그룹           | URL 예시               | 특징                             |
| -------------- | ---------------------- | -------------------------------- |
| `(main)`       | `/`, `/hot`, `/create` | 하단 네비게이션 O                |
| `(fullscreen)` | `/explore`, `/map/123` | 하단 네비게이션 X, 지도 전체화면 |
| `(auth)`       | `/login`, `/signup`    | 로그인 전용 레이아웃             |

예를 들어 `/hot`에 접속하면:

```
app/layout.tsx (루트 레이아웃)
  └── app/(main)/layout.tsx (하단 네비 포함)
        └── app/(main)/hot/page.tsx (인기 코스 내용)
```

---

### `[대괄호]` 동적 경로

```
courses/[id]/page.tsx → /courses/abc123 접속 시 id = "abc123"
map/[id]/page.tsx     → /map/abc123 접속 시 id = "abc123"
```

컴포넌트에서 꺼내 쓰는 방법:

```ts
// Next.js 15 방식 (params가 Promise)
const { id } = use(params);
```

---

### `src/components/` 주요 파일

```
components/
├── AuthProvider.tsx       # 앱 전체 로그인 상태 감지
├── QueryProvider.tsx      # React Query 설정
├── BottomNav.tsx          # 하단 네비게이션
├── SortablePlaceItem.tsx  # DnD 드래그 가능한 장소 아이템
├── CoursePreviewRenderer.tsx  # 지도 위 경로 미리보기
└── ui/
    └── AlertModal.tsx     # 확인 모달
```

---

### `src/store/`

```
store/
└── userStore.ts   # Zustand - 로그인한 유저 정보 전역 관리
```

---

### `src/types/`

```
types/
├── course.ts   # Course, CoursePlace, HotCourse 타입
└── place.ts    # NaverPlace, SavedPlace, ExploreCoursePlace 타입
```

---

### 데이터 흐름 큰 그림

```
사용자 접속
  → AuthProvider (로그인 상태 감지)
    → userStore에 유저 정보 저장 (Zustand)
      → 각 페이지에서 useUserStore()로 꺼내 씀
      → 유저 의존 데이터는 React Query enabled 옵션으로 조건부 요청
```

---

---

## 2단계 — 인증/유저 상태

### AuthProvider.tsx

```ts
"use client"; // 브라우저에서만 실행 (localStorage, sessionStorage 접근 때문)

export default function AuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();         // 현재 URL 경로 (페이지 이동 감지용)
  const setUser = useUserStore(...)        // Zustand에 유저 정보 저장하는 함수
  const setHasHydrated = useUserStore(...) // Zustand에 하이드레이션 완료 알리는 함수


  // ── 리스너 1: 토큰 자동 갱신 감지 ──────────────────────────────
  // Supabase JWT 토큰은 만료 시 자동 갱신됨
  // 갱신됐을 때 유저 정보를 Zustand에 다시 저장
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "TOKEN_REFRESHED" && session?.user) {
          // profiles 테이블에서 username 조회 후 Zustand에 저장
          setUser({ id, email, username })
        }
      }
    )
    return () => subscription.unsubscribe() // 컴포넌트 언마운트 시 리스너 해제
  }, []) // 최초 1회만 등록


  // ── 리스너 2: 페이지 이동 시 인증 체크 ─────────────────────────
  useEffect(() => {
    // 로그인/회원가입 페이지는 체크 불필요 (무한 리다이렉트 방지)
    if (pathname === "/login" || pathname === "/signup") return

    // 로그인 없이 접근 가능한 페이지 목록
    const isPublicPage =
      pathname === "/" ||
      pathname === "/hot" ||
      pathname === "/explore" ||
      /^\/courses\/[^/]+$/.test(pathname) // /courses/123 형태 (정규식)

    supabase.auth.getUser().then(({ data: { user } }) => {

      // [경우 1] 비로그인 상태
      if (!user) {
        setHasHydrated(true)
        if (!isPublicPage) {
          // 비공개 페이지면 로그인으로 리다이렉트 (현재 경로를 redirect 파라미터로 전달)
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
        }
        return
      }

      // [경우 2] 로그인 상태 + 자동로그인 미체크 + 새 탭
      // autoLogin=false 이고 sessionStorage에 activeSession 없으면 → 로그아웃
      // (자동로그인 해제 시 새 탭에서는 세션 유지 안 함)
      const autoLogin = localStorage.getItem("autoLogin")
      const activeSession = sessionStorage.getItem("activeSession")
      if (autoLogin === "false" && !activeSession) {
        supabase.auth.signOut()
        setHasHydrated(true)
        if (!isPublicPage) router.push(`/login?redirect=...`)
        return
      }

      // [경우 3] 정상 로그인 → profiles에서 username 조회 후 Zustand에 저장
      setUser({ id, email, username })
      setHasHydrated(true) // 인증 체크 완료 → 이제 UI 렌더링해도 됨
    })
  }, [pathname]) // 페이지 이동할 때마다 실행


  return <>{children}</> // AuthProvider는 UI 없이 children을 그대로 렌더링
}
```

---

### 흐름 요약

```
앱 실행
  → AuthProvider 마운트
  → 리스너1 등록 (토큰 갱신 감지, 앱 전체 생명주기)
  → 리스너2 실행 (현재 페이지 인증 체크)
    → 비로그인 + 비공개 페이지 → /login으로 이동
    → 자동로그인 OFF + 새 탭 → signOut → /login으로 이동
    → 정상 로그인 → Zustand에 유저 저장 → hasHydrated = true
```

---

### 핵심 포인트

- `pathname`이 바뀔 때마다(페이지 이동) 리스너2가 다시 실행 → **모든 페이지에서 인증 보호**
- `hasHydrated = true`가 되어야 각 페이지 컴포넌트가 유저 의존 UI를 렌더링
- `autoLogin` + `activeSession` 조합으로 **자동로그인 ON/OFF** 구현
  - `localStorage`: 브라우저 닫아도 유지 → 자동로그인 설정값 저장
  - `sessionStorage`: 탭 닫으면 사라짐 → 현재 탭 활성 여부 저장

---

---

### QueryProvider.tsx

```ts
"use client"

export default function QueryProvider({ children }) {

  // useState로 감싸는 이유:
  // 그냥 new QueryClient() 하면 리렌더링마다 새 인스턴스가 생겨서 캐시가 날아감
  // useState(() => new QueryClient()) → 최초 1회만 생성, 이후 재사용
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5분 — 이 시간 안에는 같은 데이터 재요청 안 함
        retry: 1,                  // 요청 실패 시 1번만 재시도
      },
    },
  }))

  // QueryClientProvider로 감싸야 하위 컴포넌트에서 useQuery, useMutation 사용 가능
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

---

### 왜 `layout.tsx`에서 감싸나?

```ts
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <QueryProvider>       // ← 앱 전체를 감쌈
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryProvider>
  )
}
```

`QueryProvider`로 감싼 범위 안에서만 `useQuery`, `useMutation`을 쓸 수 있어요.
루트 레이아웃에서 감싸야 모든 페이지에서 React Query를 사용할 수 있어요.

---

### staleTime이란?

```
useQuery로 데이터 처음 불러옴
  → 캐시에 저장
  → 5분 이내에 같은 queryKey로 다시 요청하면?
    → 서버에 재요청 안 하고 캐시에서 바로 반환 ✅

5분이 지나면?
  → stale(오래된) 상태로 전환
  → 다음 요청 시 서버에서 새로 불러옴
```

---

---

### BottomNav.tsx

```ts
"use client" // usePathname() 때문에 클라이언트 컴포넌트

// 네비게이션 아이템 배열로 관리 (추가/수정 시 여기만 바꾸면 됨)
const NAV_ITEMS = [
  { href: "/",          label: "홈",     icon: "/icons/home.svg" },
  { href: "/hot",       label: "인기코스", icon: "/icons/hot.svg" },
  { href: "/explore",   label: "코스탐색", icon: "/icons/explore.svg" },
  { href: "/my-course", label: "마이코스", icon: "/icons/route.svg" },
]

export default function BottomNav() {
  const pathname = usePathname() // 현재 URL 경로 (활성 탭 표시용)

  return (
    <nav className="fixed bottom-0 ..."> {/* 화면 하단에 고정 */}
      <ul>
        {NAV_ITEMS.map((item) => {

          // 활성 탭 판단
          const isActive =
            item.href === "/"
              ? pathname === "/"              // 홈은 정확히 "/" 일 때만
              : pathname.startsWith(item.href) // 나머지는 해당 경로로 시작하면

          // 예: pathname = "/my-course/bookmarks"
          // → "/my-course".startsWith("/my-course") = true → 마이코스 탭 활성

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={isActive ? "text-[#EE6300]" : "text-[#70758D]"}
                // 활성: 오렌지색 / 비활성: 회색
              >
                <Image
                  src={item.icon}
                  style={isActive ? { filter: "..." } : undefined}
                  // SVG 아이콘 색상을 CSS filter로 오렌지색으로 변환
                  // (SVG가 흰색/검정 기준이라 필터로 색 바꿈)
                />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
```

---

### 핵심 포인트

**홈 탭 활성 조건이 다른 이유:**
```ts
item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
```
`/hot`, `/my-course` 등 모든 경로가 `/`로 시작하기 때문에 홈은 `startsWith` 쓰면 항상 활성이 되어버려요. 그래서 홈만 정확히 `"/"`일 때만 활성으로 처리해요.

---

---

### SortablePlaceItem.tsx

```ts
// @dnd-kit에서 드래그 가능한 아이템을 만드는 훅
const {
  attributes,   // 접근성 속성 (aria-* 등) — 드래그 핸들에 spread
  listeners,    // 마우스/터치 이벤트 핸들러 — 드래그 핸들에 spread
  setNodeRef,   // 이 아이템의 DOM 요소를 dnd-kit에 등록하는 ref
  transform,    // 드래그 중 이동 거리 (x, y)
  transition,   // 드롭 후 제자리로 돌아오는 애니메이션
} = useSortable({ id: place.id }) // 각 아이템의 고유 id로 구분

// transform → CSS로 변환 (드래그 중 실제로 요소를 이동시킴)
const style = {
  transform: CSS.Transform.toString(transform),
  transition,
}

return (
  // setNodeRef: 이 li가 드래그 대상임을 dnd-kit에 알림
  // style: 드래그 중 위치 이동 + 드롭 후 애니메이션
  <li ref={setNodeRef} style={style}>

    {/* 드래그 핸들 영역 */}
    <span
      {...attributes} // 접근성 속성 (aria-roledescription 등)
      {...listeners}  // 여기서 마우스/터치 이벤트 감지 시작
      style={{
        touchAction: "none",           // 브라우저가 터치를 스크롤로 쓰지 못하게
        WebkitTouchCallout: "none",    // iOS 길게 누르기 팝업 차단
        userSelect: "none",            // 드래그 중 텍스트 선택 방지
      }}
      onContextMenu={(e) => e.preventDefault()} // Android 길게 누르기 팝업 차단
    >
      <Image
        draggable={false}                    // HTML 기본 이미지 드래그 비활성화
        style={{ pointerEvents: "none" }}    // 이미지가 터치 이벤트 가로채지 못하게
      />
    </span>

    {/* 장소 이름 */}
    <span>{place.order}. {place.title}</span>

    {/* 삭제 버튼 — 부모에서 onRemove 함수를 받아서 실행 */}
    <button onClick={onRemove}>삭제</button>
  </li>
)
```

---

### 드래그 동작 흐름

```
사용자가 드래그 핸들을 잡음
  → listeners가 이벤트 감지
  → dnd-kit이 transform 값 계산 (이동 거리)
  → style에 적용 → 요소가 실제로 이동해 보임

드롭하면
  → 부모(create/edit page)의 handleDragEnd 실행
  → arrayMove로 배열 순서 변경
  → order 재할당 (1, 2, 3...)
  → transition으로 자연스럽게 제자리 애니메이션
```

---

### 모바일 드래그 방어 코드 총정리

| 코드 | 역할 |
|------|------|
| `touchAction: "none"` | 브라우저의 스크롤 처리 차단 |
| `WebkitTouchCallout: "none"` | iOS 길게 누르기 팝업 차단 |
| `userSelect: "none"` | 드래그 중 텍스트 선택 방지 |
| `onContextMenu preventDefault` | Android 길게 누르기 팝업 차단 |
| `draggable={false}` | 이미지 HTML 기본 드래그 차단 |
| `pointerEvents: "none"` | 이미지가 터치 이벤트 가로채지 못하게 |

---

---

## 3단계 — React Query 구조

> CourseDetail.tsx를 중심으로 배운다. 이 파일 하나에 useQuery 3개 + useMutation 4개가 다 담겨 있음.

---

### queryKey — 캐시의 주소

React Query는 데이터를 `queryKey` 기준으로 캐시에 저장해요.
같은 `queryKey` = 같은 데이터 = **캐시 공유**.

```ts
// CourseDetail.tsx
useQuery({ queryKey: ["course", id], ... })
useQuery({ queryKey: ["coursePlaces", id], ... })

// edit/page.tsx (수정 페이지)
useQuery({ queryKey: ["course", id], ... })        // ← 같은 key!
useQuery({ queryKey: ["coursePlaces", id], ... })  // ← 같은 key!
```

**코스 상세 → 코스 수정**으로 이동하면?
- `staleTime: 5분` 안이면 서버 재요청 없이 캐시에서 바로 데이터 가져옴
- 같은 `queryKey`로 두 페이지가 동일한 캐시를 공유하는 것

```
queryKey: ["course", "abc123"]
                 ↕
      React Query 캐시 (메모리)
                 ↕
       CourseDetail.tsx   ←→   edit/page.tsx
       (코스 상세 페이지)       (코스 수정 페이지)
```

---

### useQuery 기본 구조

```ts
const { data: course, isLoading, isError } = useQuery({
  queryKey: ["course", id],   // 캐시 식별자
  queryFn: () => fetchCourse(id),  // 실제 데이터 fetch 함수
  // staleTime은 QueryProvider에서 전역으로 5분 설정
})
```

- `data`: 받아온 데이터 (처음엔 undefined, 로딩 중엔 캐시값 있으면 그것)
- `isLoading`: 처음 데이터를 불러오는 중 (캐시도 없는 상태)
- `isError`: fetch 함수에서 throw가 발생한 경우

---

### enabled — 조건부 요청

```ts
const { data: userData } = useQuery({
  queryKey: ["courseUserData", id, user?.id],
  queryFn: () => fetchCourseUserData(id, user!.id),
  enabled: !!user?.id,  // user가 있을 때만 요청
})
```

**왜 필요한가?**

```
비로그인 상태로 /courses/123 접속
  → user = null
  → enabled: !!null = false
  → 좋아요/북마크 쿼리 실행 안 함 ✅

로그인 후
  → user.id = "abc"
  → enabled: !!"abc" = true
  → 쿼리 실행 → 내 좋아요 여부 확인 ✅
```

`user!.id`처럼 non-null assertion(`!`)을 쓰는 이유:
→ `enabled: !!user?.id`가 true가 될 때는 항상 `user?.id`가 있기 때문에 안전함.

---

### queryKey 배열에 user?.id 포함하는 이유

```ts
queryKey: ["courseUserData", id, user?.id]
//                          ↑    ↑
//                       코스ID  유저ID
```

- 캐시는 queryKey 전체가 같아야 히트
- 유저 A, 유저 B가 같은 코스를 봐도 각자 다른 캐시를 가져야 함
- `user?.id`를 포함하면 `["courseUserData", "abc123", "userA"]`와 `["courseUserData", "abc123", "userB"]`는 다른 캐시

---

### useMutation — 서버 데이터 변경

```ts
const likeMutation = useMutation({
  mutationFn: async () => {
    const supabase = createClient()
    if (liked) {
      await supabase.from("likes").delete().eq(...)  // 좋아요 취소
    } else {
      await supabase.from("likes").insert(...)       // 좋아요 추가
    }
  },
  onSuccess: () => {
    // 서버 요청 성공 후 실행
    queryClient.setQueryData(userDataQueryKey, (prev) =>
      prev ? { ...prev, liked: !liked, likeCount: liked ? likeCount - 1 : likeCount + 1 } : prev
    )
  }
})

// 버튼 클릭 시
<button onClick={() => likeMutation.mutate()} />
```

**흐름:**
```
버튼 클릭 → likeMutation.mutate()
  → mutationFn 실행 (서버에 좋아요 INSERT/DELETE)
  → 성공 → onSuccess 실행
    → setQueryData로 캐시 즉시 업데이트
    → UI 바로 반영 (서버 재요청 없음)
```

---

### setQueryData vs invalidateQueries

두 방법 다 UI를 업데이트하지만 전략이 다름.

| 방법 | 동작 | 언제 쓰나 |
|------|------|-----------|
| `setQueryData` | 캐시를 직접 덮어씀 | 서버 응답 예측 가능할 때 (낙관적 업데이트) |
| `invalidateQueries` | 캐시를 stale로 만들어 재요청 | 서버 응답 결과를 다시 받아야 할 때 |

```ts
// setQueryData — 낙관적 업데이트 (즉각 반응, 재요청 없음)
queryClient.setQueryData<CourseUserData>(userDataQueryKey, (prev) =>
  prev ? { ...prev, liked: !liked } : prev
)

// invalidateQueries — 재요청 트리거 (확실하지만 약간의 딜레이)
queryClient.invalidateQueries({ queryKey: ["course", id] })
```

CourseDetail에서는:
- **좋아요/북마크/장소저장** → `setQueryData` (결과를 알 수 있음: true ↔ false 토글)
- **코스 수정 저장 후** → `invalidateQueries` (서버에서 최신 데이터를 다시 받아야 함)

---

### isLoading/isError로 상태 처리

```ts
const { data: course, isLoading, isError } = useQuery(...)

if (isLoading) return <스켈레톤 UI />
if (isError) return <에러 UI />

return <실제 컨텐츠 />
```

- `isLoading = true` 일 때: 회색 박스가 깜빡이는 스켈레톤 애니메이션 표시
- `isError = true` 일 때: "코스를 찾을 수 없어요" + 뒤로 가기 버튼 표시

---

### 이 페이지의 React Query 전체 구조 요약

```
CourseDetail.tsx
  ├── useQuery("course", id)             → 코스 기본 정보 (제목, 설명)
  ├── useQuery("coursePlaces", id)       → 장소 목록
  ├── useQuery("courseUserData", id, uid) → 내 좋아요/북마크/저장 상태 (로그인 시만)
  │
  ├── useMutation(delete)                → 코스 삭제 → onSuccess: router.push("/")
  ├── useMutation(like)                  → 좋아요 토글 → onSuccess: setQueryData
  ├── useMutation(bookmark)              → 북마크 토글 → onSuccess: setQueryData
  └── useMutation(savePlace)             → 장소 저장 토글 → onSuccess: setQueryData
```

---

## (나중에 읽기)

## 1. 프로젝트 한 줄 / 30초 소개

> "굿데이는 내 취향대로 놀기 코스를 만들고 공유할 수 있는 웹 서비스입니다.
> 장소 검색, 드래그로 순서 변경, 경로 안내, 카카오톡 공유까지 한 곳에서 할 수 있고,
> 실제 배포 후 150명 이상의 사용자가 사용하며 피드백을 반영해 기능을 개선한 프로젝트입니다."

---

## 2. 기술 스택 선택 이유

### Next.js (App Router)

- **이유**: OG 메타데이터를 서버에서 동적으로 생성해야 해서 SSR이 필요했음
- **효과**: 코스 링크 공유 시 카카오톡에서 제목·이미지 미리보기 표시 가능
- **App Router 선택 이유**: generateMetadata로 서버에서 동적 OG 메타 생성,
  파일 기반 레이아웃 분리로 (main)/(fullscreen)/(auth) 레이아웃 구조 구성

### TypeScript

- 외부 API(Naver, Google Maps, Supabase) 응답 타입을 명확히 정의해 런타임 오류 예방

### Supabase

- PostgreSQL + Auth + RLS를 하나로 제공해 백엔드 없이 빠르게 구축 가능
- **RLS(Row Level Security)**: DB 레벨에서 사용자별 데이터 접근 제어 → 클라이언트에서 `user_id` 체크를 신뢰할 수 없으므로 DB 정책으로 강제

### Zustand

- Redux보다 보일러플레이트가 적고 `persist` 미들웨어로 로그인 상태 유지가 간단
- `hasHydrated` 플래그로 SSR/CSR 하이드레이션 불일치 방지

### React Query (TanStack Query v5)

- `useEffect` + 직접 fetch 패턴의 문제점: 중복 요청, 로딩/에러 상태 관리 복잡, 캐시 없음
- **도입 효과**:
  - 동일한 `queryKey`로 여러 페이지 간 캐시 공유 (예: 코스 상세 → 경로 보기 재요청 없음)
  - `setQueryData`로 낙관적 업데이트 → 좋아요/북마크 즉시 반응
  - `enabled` 옵션으로 조건부 요청 (로그인한 경우에만 유저 데이터 요청)

### @dnd-kit

- 모바일 터치 지원, 접근성, 커스텀 핸들이 쉬운 라이브러리

---

## 3. 핵심 기능 구현 설명

### 코스 생성 흐름

1. 네이버 검색 API → Next.js API Route `/api/search-places`에서 서버 사이드 호출 (CORS 우회)
2. 장소 선택 → `selectedPlaces` state에 추가 (`order` 포함)
3. @dnd-kit으로 순서 변경 → `arrayMove` 후 `order` 재할당
4. 저장 시 places 테이블 upsert (naver_url unique 기준) → course_places 삽입

### 경로 보기

- Google Maps API(`@vis.gl/react-google-maps`)로 지도 렌더링
- 도보: Google Maps Directions API로 장소 간 polyline 그리기
- 대중교통: TMap Transit API 호출 → 구간별 경로 정보 표시
- **구간 선택**: 전체 or 특정 구간만 표시 가능

### 좋아요/북마크 낙관적 업데이트

```
버튼 클릭
→ likeMutation.mutate()
→ onSuccess에서 setQueryData로 캐시 즉시 업데이트
→ UI 바로 반응 (서버 응답 기다리지 않음)
→ 실패 시 React Query가 이전 상태로 자동 복구 가능
```

### RLS 구성 예시

- `courses`: SELECT는 `is_public = true` OR `user_id = auth.uid()`
- `likes`, `bookmarks`: INSERT/DELETE는 `user_id = auth.uid()`
- `course_places`: DELETE는 courses 테이블의 `user_id = auth.uid()` 조인 조건

### OG 메타데이터 동적 생성

```ts
// app/(main)/courses/[id]/page.tsx
export async function generateMetadata({ params }) {
  const course = await fetch(supabase REST API with anon key)
  return { title: course.title, openGraph: { ... } }
}
```

- **주의**: `generateMetadata`는 서버에서 실행 → 쿠키 기반 클라이언트 사용 불가 → anon 키로 직접 REST 호출 + RLS에 anon 역할 허용 필요

---

## 4. 트러블슈팅 (문제-원인-해결 구조로 말하기)

### ① Next.js prerender 빌드 오류

- **문제**: Vercel 빌드 시 `/login` 페이지 프리렌더링 실패
- **원인**: `useSearchParams()`를 `<Suspense>` 없이 사용하면 정적 빌드 시 오류 발생
- **해결**: 로그인 폼을 `LoginForm.tsx` 클라이언트 컴포넌트로 분리, `page.tsx`에서 `<Suspense>`로 래핑
- **배운 점**: Next.js App Router에서 클라이언트 훅은 반드시 클라이언트 컴포넌트 안에 있어야 함

### ② 모바일 드래그 앤 드롭 불가

- **문제**: 모바일에서 드래그가 안 되고 스크롤만 발생, 이미지 길게 누르면 팝업 뜸
- **원인**: `PointerSensor`만으로는 터치 이벤트 구분 불가 / `touch-action` 미설정으로 브라우저가 스크롤로 해석
- **해결**:
  - `TouchSensor` 추가 + `delay: 250ms`, `tolerance: 5px` 설정
  - `touch-action: none`, `draggable={false}`, `-webkit-touch-callout: none` 적용
- **배운 점**: 모바일 환경은 데스크탑과 이벤트 처리 방식이 다름, CSS로 브라우저 기본 동작을 먼저 차단해야 함

### ③ 경로 일부만 표시

- **문제**: 여러 구간 중 마지막 구간만 지도에 렌더링
- **원인**: `for` 루프 순차 fetch + React Strict Mode 이중 실행 → cleanup 타이밍 충돌
- **해결**: `Promise.all` 병렬 fetch + `cancelled` 플래그로 cleanup 시 렌더링 중단

### ④ 코스 수정 시 장소 중복 삽입

- **문제**: 편집 저장 시 장소가 중복 생성
- **원인**: `course_places` DELETE RLS 정책 누락 → 기존 장소 삭제가 무시됨
- **해결**: Supabase에서 DELETE 정책 추가
- **배운 점**: RLS는 테이블마다, 작업마다(SELECT/INSERT/UPDATE/DELETE) 각각 정의해야 함

### ⑤ 공유 URL 로그인 후 홈으로 이동

- **문제**: 공유 링크 접속 → 로그인 → 해당 코스가 아닌 홈으로 이동
- **원인**: `router.push("login")` (슬래시 없는 상대경로) → `/courses/login` 으로 이동 → redirect 없이 다시 `/login` → 로그인 후 기본값 `/`
- **해결**: `router.push("/login?redirect=" + encodeURIComponent(pathname))`
- **배운 점**: Next.js에서 라우팅 시 절대경로(`/`) 사용 습관화

### ⑥ OG 메타 미적용

- **문제**: 카카오톡 공유 시 기본 이미지만 표시
- **원인**: `generateMetadata`는 서버 실행 → anon 키로 Supabase REST 호출했으나 RLS가 `authenticated`만 허용
- **해결**: SELECT 정책에 `anon` 역할 추가

---

## 5. React Query 도입 배경 (자세히)

### 도입 전 문제

```ts
// 기존 패턴 — 모든 페이지에서 반복
useEffect(() => {
  supabase
    .from("courses")
    .select("*")
    .then(({ data }) => {
      setLoading(false);
      setCourses(data);
    });
}, []);
```

- 페이지 이동 시 매번 동일한 데이터 재요청
- 로딩/에러 상태를 직접 관리해야 해서 코드 중복
- 좋아요 클릭 후 UI 반영에 딜레이

### 도입 후 개선

- `staleTime: 5분` → 5분 내 같은 데이터 재요청 없음
- 캐시 공유: 코스 상세에서 불러온 장소 목록을 경로 보기 페이지에서 재사용 (`queryKey: ["coursePlaces", id]`)
- 낙관적 업데이트: `setQueryData`로 서버 응답 전 UI 즉시 반영
- `enabled` 옵션: 로그인한 경우에만 유저 데이터 요청, 저장 장소는 바텀시트 열 때만 요청

---

## 6. 실제 서비스 운영 경험

### 지표

- Visitors 1,700+ / Page Views 7,500+ / 가입 사용자 150+

### 사용자 피드백 → 기능 개선

| 피드백                       | 개선                            |
| ---------------------------- | ------------------------------- |
| 앱처럼 쓰고 싶다             | PWA 적용 (Web App Manifest)     |
| 친구랑 같이 코스 짜고 싶다   | 초대 링크 기반 공동 편집 구현   |
| 장소마다 메모 남기고 싶다    | 장소별 시간 메모/메모 기능 추가 |
| 해외 여행 코스도 만들고 싶다 | Google Places API 연동          |
| 회원 탈퇴가 안 된다          | 계정 삭제 API 구현              |

### 배운 점

- 개발자가 중요하다고 생각한 기능 ≠ 사용자가 원하는 기능
- 실제 운영하면 생각지 못한 엣지케이스와 니즈가 나옴

---

## 7. 예상 면접 질문 & 답변 포인트

### Q. 이 프로젝트에서 가장 어려웠던 점은?

> 모바일 드래그 앤 드롭 이슈. 데스크탑에서는 잘 됐는데 모바일에서 안 돼서 처음엔 원인을 못 찾았음. 터치 이벤트와 스크롤 이벤트가 충돌한다는 걸 알고 TouchSensor 추가 + CSS touch-action으로 해결. 모바일 환경은 브라우저가 터치를 먼저 가로채기 때문에 명시적으로 권한을 뺏어와야 한다는 걸 배움.

### Q. React Query를 왜 도입했나요?

> useEffect로 직접 fetch하는 방식은 캐싱이 없어서 페이지 이동 시마다 재요청이 발생하고, 로딩/에러 상태도 모든 페이지에서 직접 관리해야 했음. React Query 도입 후 staleTime 5분 설정으로 중복 요청을 줄이고, 동일한 queryKey로 여러 페이지 간 캐시를 공유할 수 있게 됐음. 좋아요/북마크는 setQueryData로 낙관적 업데이트를 적용해 UX도 개선됨.

### Q. Supabase RLS가 무엇인가요?

> Row Level Security는 PostgreSQL의 기능으로, 테이블 행 단위로 접근 정책을 설정하는 것. 예를 들어 courses 테이블에 "본인이 만든 코스 또는 공개 코스만 조회 가능"이라는 정책을 DB에 설정하면, 클라이언트에서 아무리 다른 user_id로 요청해도 DB에서 차단됨. 클라이언트 코드는 변조 가능하기 때문에 보안은 DB 레벨에서 처리하는 게 맞다고 생각해서 RLS를 적극 활용함.

### Q. Next.js App Router를 쓴 이유는?

> 코스 공유 기능에서 OG 메타데이터를 동적으로 생성해야 했음. App Router의 `generateMetadata`를 사용하면 서버에서 코스 정보를 가져와 제목·설명·이미지를 동적으로 설정할 수 있음. Pages Router에서도 가능하지만 App Router가 레이아웃 중첩, 서버 컴포넌트 등 최신 기능을 더 잘 지원해서 선택함.

### Q. 개인 프로젝트인데 왜 이렇게 많은 기능을?

> 처음에는 코스 생성/공유만 있었는데, 실제로 배포하고 사용자 피드백을 받으면서 기능이 확장됨. "같이 코스 짜고 싶다", "메모 남기고 싶다" 같은 피드백을 반영하다 보니 자연스럽게 늘어남. 사용자 요청이 있을 때만 개발해서 불필요한 기능은 없다고 생각함.

### Q. 아쉬운 점이나 개선하고 싶은 점은?

> 에러 처리와 로딩 UI가 페이지마다 제각각인 점. 공통 컴포넌트나 Error Boundary로 통일하고 싶음. 그리고 explore 페이지는 아직 useEffect 기반인데 React Query로 전환하면 실시간 뷰포트 변경 시 캐싱 전략을 더 잘 짤 수 있을 것 같음.

### Q. 혼자 만든 프로젝트에서 협업 경험을 어떻게 증명하나요?

> 이 프로젝트에서 직접적인 협업은 없었지만, 공동편집 기능을 구현하면서 권한 분리(오너/공동편집자/일반 사용자), 초대 토큰 만료, 동시 편집 시나리오 등을 설계하는 경험을 했음. 이 과정이 실제 협업에서 API 설계나 권한 구조를 고민하는 것과 비슷하다고 생각함.

---

## 8. 기술 용어 빠른 정리

| 용어            | 한 줄 설명                                                            |
| --------------- | --------------------------------------------------------------------- |
| SSR             | 서버에서 HTML을 만들어 보내는 방식. OG 메타 생성에 사용               |
| RLS             | DB 행 단위 접근 제어 정책. 클라이언트 변조 방어                       |
| 낙관적 업데이트 | 서버 응답 전 UI를 먼저 업데이트. 실패 시 롤백                         |
| staleTime       | React Query에서 캐시를 "신선하다"고 보는 시간. 이 안에는 재요청 안 함 |
| queryKey        | React Query 캐시 식별자. 동일 key = 캐시 공유                         |
| App Router      | Next.js 13+의 라우팅 시스템. 서버 컴포넌트, generateMetadata 지원     |
| BaaS            | Backend as a Service. Supabase가 DB/Auth/Storage를 제공               |
| PWA             | 웹을 앱처럼 설치·사용 가능하게 하는 기술. manifest.json으로 설정      |

---

## 9. 숫자로 기억하기

- **유저**: 150명+
- **페이지뷰**: 7,500+
- **방문자**: 1,700+
- **staleTime**: 5분
- **초대 토큰 유효기간**: 7일
- **트러블슈팅**: 6건
- **핵심 구현 기능**: 10개
- **사용자 피드백 기반 개선**: 7건
- **TouchSensor delay**: 250ms

---

## 10. 면접 전날 체크리스트

- [ ] 프로젝트 30초 소개 말해보기
- [ ] 트러블슈팅 6건 문제-원인-해결 순으로 말해보기
- [ ] React Query 도입 이유 설명해보기
- [ ] RLS가 뭔지 설명해보기
- [ ] 실제 서비스 URL 열어서 직접 사용해보기 (https://www.good-day-out.com)
- [ ] 개선하고 싶은 점 1~2개 준비해두기
