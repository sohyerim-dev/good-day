export function getCategoryEmoji(category: string | null | undefined): string {
  if (!category) return "";
  const top = category.split(">")[0].toLowerCase();
  if (top.includes("음식점")) return "🍽️";
  if (top.includes("카페") || top.includes("디저트")) return "☕";
  if (top.includes("쇼핑") || top.includes("상점")) return "🛍️";
  if (top.includes("여가") || top.includes("오락")) return "🎡";
  if (top.includes("관광") || top.includes("명소")) return "🏛️";
  if (top.includes("숙박")) return "🏨";
  if (top.includes("미용")) return "💇";
  if (top.includes("스포츠") || top.includes("레저")) return "🏃";
  if (top.includes("병원") || top.includes("약국")) return "🏥";
  if (top.includes("교육")) return "📚";
  if (top.includes("교통") || top.includes("수송")) return "🚉";
  return "";
}
