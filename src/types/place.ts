export interface NaverPlace {
  id: string;
  title: string;
  address: string;
  roadAddress: string;
  mapx: string; // 경도 * 10000000
  mapy: string; // 위도 * 10000000
  link: string;
  naverPlaceUrl: string;
  category?: string;
  google_place_id?: string; // 해외 장소 (Google Places ID)
  source?: "naver" | "google";
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
      profiles: { username: string };
      course_places?: { count: number }[];
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
  collection_id?: string | null;
}

export interface PlaceCollection {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}
