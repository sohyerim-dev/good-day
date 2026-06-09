export function getCategoryEmoji(category: string | null | undefined): string {
  if (!category) return "";
  const c = category.toLowerCase();

  // 방탈출은 카페보다 먼저 (방탈출카페 등)
  if (c.includes("방탈출")) return "🎮";

  // 카페/디저트 — 음식점>카페,디저트도 여기서 처리
  if (c.includes("카페") || c.includes("디저트") || c.includes("베이커리") ||
      c.includes("아이스크림") || c.includes("케이크")) return "☕";

  // 술집/바
  if (c.includes("술집") || c.includes("주점") || c.includes("바(bar)")) return "🍺";

  // 식당 — 상위 카테고리 없이 단독 사용 포함 (한식, 중식 등)
  if (c.includes("음식점") || c.includes("한식") || c.includes("일식") ||
      c.includes("양식") || c.includes("중식") || c.includes("분식") ||
      c.includes("치킨") || c.includes("피자") || c.includes("도시락") ||
      c.includes("베트남") || c.includes("멕시코") || c.includes("아시아음식") ||
      c.includes("이탈리아음식") || c.includes("초밥") || c.includes("라면") ||
      c.includes("우동") || c.includes("덮밥") || c.includes("돈가스") ||
      c.includes("고기요리") || c.includes("곱창") || c.includes("칼국수") ||
      c.includes("생선회") || c.includes("뷔페")) return "🍽️";

  // 서점
  if (c.includes("서점")) return "📚";

  // 쇼핑 — 가구/인테리어 포함
  if (c.includes("쇼핑") || c.includes("유통") ||
      c.includes("시장") || c.includes("백화점") || c.includes("가구") ||
      c.includes("인테리어") || c.includes("편의점") || c.includes("문구") ||
      c.includes("장난감") || c.includes("패션") || c.includes("음반") ||
      c.includes("마트") || c.includes("슈퍼")) return "🛍️";

  // 사진/스튜디오
  if (c.includes("사진") || c.includes("스튜디오")) return "📸";

  // 문화/예술
  if (c.includes("미술관") || c.includes("갤러리") || c.includes("화랑") ||
      c.includes("전시") || c.includes("공연") || c.includes("영화관") ||
      c.includes("복합문화") || c.includes("문화,예술") || c.includes("문화시설")) return "🎭";

  // 여행/명소/자연
  if (c.includes("여행") || c.includes("명소") || c.includes("공원") ||
      c.includes("궁궐") || c.includes("해수욕장") || c.includes("해변") ||
      c.includes("식물원") || c.includes("수목원") || c.includes("관람") ||
      c.includes("체험") || c.includes("아쿠아리움") || c.includes("사찰") ||
      c.includes("절,") || c.includes("국가유산") || c.includes("문화재")) return "🏛️";

  // 숙박
  if (c.includes("숙박") || c.includes("호텔") || c.includes("모텔") ||
      c.includes("펜션") || c.includes("게스트하우스")) return "🏨";

  // 교통
  if (c.includes("지하철") || c.includes("전철") || c.includes("기차") ||
      c.includes("철도") || c.includes("버스터미널") || c.includes("공항") ||
      c.includes("항공") || c.includes("교통,운수") || c.includes("도로시설")) return "🚉";

  // 교육
  if (c.includes("교육") || c.includes("학문") || c.includes("대학교") ||
      c.includes("고등학교") || c.includes("학원") || c.includes("도서관")) return "📚";

  // 스포츠/오락
  if (c.includes("스포츠") || c.includes("오락시설") || c.includes("노래방") ||
      c.includes("만화방") || c.includes("레저") || c.includes("테마파크") ||
      c.includes("테마공원") || c.includes("스포츠센터") || c.includes("체육")) return "🎡";

  // 생활/편의/공방
  if (c.includes("생활,편의") || c.includes("공방")) return "🛠️";

  // 미용
  if (c.includes("미용") || c.includes("네일") || c.includes("헤어") || c.includes("피부")) return "💇";

  // 병원
  if (c.includes("병원") || c.includes("약국") || c.includes("의원") ||
      c.includes("치과") || c.includes("한의원")) return "🏥";

  return "";
}
