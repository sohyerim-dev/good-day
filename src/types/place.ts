export interface NaverPlace {
  id: string; // 장소 고유 ID(naverPlaceUrl에서 추출)
  title: string; // 장소명
  address: string; // 지번 주소
  roadAddress: string; // 도로명 주소
  mapx: string; // 경도 (longitude)
  mapy: string; // 위도 (latitude)
  link: string; // 네이버 검색 링크
  naverPlaceUrl: string; // 네이버 플레이스 직접 URL
}

export interface ExploreCoursePlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  naver_url: string;
  course_places: {
    id: string;
    course_id: string;
    place_id: string;
    order: number;
    courses: {
      id: string;
      title: string;
      user_id: string;
    };
  }[];
}

export interface SavedPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  naver_url: string;
}
