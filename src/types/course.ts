export interface Course {
  id: string;
  title: string;
  description: string | null;
  course_lat: number;
  course_lng: number;
  is_public: boolean;
  likes_count: number;
  bookmarks_count: number;
  created_at: string;
}
