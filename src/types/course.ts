export interface Course {
  // 코스 자체 정보 (DB courses 테이블)
  id: string; // 코스 고유 ID
  user_id: string; // 만든 유저 ID
  title: string; // 코스 제목
  description: string | null; // 설명
  course_lat: number; // 코스 중심좌표
  course_lng: number; // 상과 동일
  is_public: boolean; // 공개 여부
  likes_count: number; // 좋아요 수
  bookmarks_count: number; // 북마크 수
  created_at: string; // 생성일
}

export interface CoursePlace {
  // 코스에 포함된 장소 (DB course_places + places JOIN)
  id: string; // course_places 테이블의 ID
  order: number; // 방문 순서
  places: {
    // JOIN된 places 테이블 데이터
    id: string; // 장소 ID
    name: string; // 장소명
    address: string; // 주소
    lat: number; // 좌표
    lng: number; // 상과 동일
    naver_url: string; // 네이버 플레이스 URL
  };
}
