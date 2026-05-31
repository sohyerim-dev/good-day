import { NaverPlace } from "@/types/place";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // URL에서 query 파라미터 추출 (?query=검색어)
  const query = req.nextUrl.searchParams.get("query")?.trim();
  if (!query) return NextResponse.json({ items: [] });

  // 브라우저 대신 서버에서 네이버 API 호출 (CORS 우회)
  const res = await fetch(
    `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5`,
    {
      headers: {
        // .env.local의 값으로 네이버 API 인증
        "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID!,
        "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET!,
      },
    },
  );

  const data = await res.json();
  const decode = (s: string) =>
    s.replace(/<[^>]*>/g, "")
     .replace(/&amp;/g, "&")
     .replace(/&lt;/g, "<")
     .replace(/&gt;/g, ">")
     .replace(/&quot;/g, '"')
     .replace(/&#39;/g, "'");

  const cleaned = data.items.map((item: NaverPlace) => {
    const title = decode(item.title);
    return {
      ...item,
      title,
      naverPlaceUrl: `https://map.naver.com/p/search/${encodeURIComponent(title)}`,
      id: `${title}-${item.address}`,
    };
  });
  return NextResponse.json({ ...data, items: cleaned });
}
