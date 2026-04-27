export interface Course {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  course_lat: number;
  course_lng: number;
  is_public: boolean;
  likes_count: number;
  bookmarks_count: number;
  created_at: string;
}

export interface CoursePlace {
  id: string;
  order: number;
  places: {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    naver_url: string;
  };
}
