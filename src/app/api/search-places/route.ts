import { NaverPlace } from "@/types/place";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // URL에서 query 파라미터 추출 (?query=검색어)
  const query = req.nextUrl.searchParams.get("query")?.trim();
  if (!query) return NextResponse.json({ items: [] });

  // 브라우저 대신 서버에서 네이버 API 호출 (CORS 우회)
  const res = await fetch(
    `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=10`,
    {
      headers: {
        // .env.local의 값으로 네이버 API 인증
        "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID!,
        "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET!,
      },
    },
  );

  const data = await res.json();
  // 네이버 응답을 그대로 클라이언트에 전달
  console.log(data);
  const cleaned = data.items.map((item: NaverPlace) => ({
    ...item,
    title: item.title.replace(/<[^>]*>/g, ""),
    naverPlaceUrl: `https://map.naver.com/p/search/${encodeURIComponent(item.title.replace(/<[^>]*>/g, ""))}`,
    id: `${item.title.replace(/<[^>]*>/g, "")}-${item.address}`,
  }));
  return NextResponse.json({ ...data, items: cleaned });
}
