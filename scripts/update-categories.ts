import { readFileSync } from "fs";
import { join } from "path";

// .env.local 로드
try {
  const content = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !(key in process.env)) process.env[key] = val;
  }
} catch {}

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const decode = (s: string) => s.replace(/<[^>]*>/g, "");

async function run() {
  const { data: places, error } = await supabase
    .from("places")
    .select("id, name, address")
    .is("category", null)
    .not("naver_url", "is", null);

  if (error || !places) {
    console.error("DB 조회 실패", error);
    return;
  }
  console.log(`총 ${places.length}개 처리 시작`);

  let success = 0;
  let skipped = 0;

  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    process.stdout.write(`[${i + 1}/${places.length}] ${place.name} ... `);

    const res = await fetch(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(place.name)}&display=5`,
      {
        headers: {
          "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID!,
          "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET!,
        },
      },
    );

    if (!res.ok) {
      console.log(`API 에러 (${res.status})`);
      skipped++;
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }

    const data = await res.json();

    // 이름 일치 우선, 없으면 주소 앞 6자리로 매칭
    const match = data.items?.find((item: { title: string; address: string }) =>
      decode(item.title) === place.name
    ) ?? data.items?.find((item: { title: string; address: string }) =>
      place.address && item.address && item.address.slice(0, 6) === place.address.slice(0, 6)
    );

    if (match?.category) {
      await supabase.from("places").update({ category: match.category }).eq("id", place.id);
      console.log(`✅ ${match.category}`);
      success++;
    } else {
      console.log(`⬜ 미매칭`);
      skipped++;
    }

    await new Promise((r) => setTimeout(r, 60));
  }

  console.log(`\n완료: 성공 ${success} / 미매칭 ${skipped}`);
}

run().catch(console.error);
