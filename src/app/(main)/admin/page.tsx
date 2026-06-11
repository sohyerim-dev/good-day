"use client";

import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Stats {
  totalCourses: number;
  publicCourses: number;
  totalUsers: number;
  newUsersThisWeek: number;
  pendingReports: number;
}

interface Report {
  id: string;
  target_type: "course" | "place_photo";
  target_id: string;
  reason: string;
  created_at: string;
  reporter_id: string;
  // 조인된 데이터
  courseTitle?: string;
  photoUrl?: string;
}

interface AdminCourse {
  id: string;
  title: string;
  user_id: string;
  is_public: boolean;
  is_hidden: boolean;
  created_at: string;
  username?: string;
  placeCount?: number;
}

interface AdminUser {
  id: string;
  username: string;
  created_at: string;
  role: string;
  courseCount: number;
}

interface AdminPhoto {
  id: string;
  storage_url: string;
  place_id: string;
  created_at: string;
  placeName: string;
  placeAddress: string;
}

export default function AdminPage() {
  const user = useUserStore((s) => s.user);
  const hasHydrated = useUserStore((s) => s.hasHydrated);
  const router = useRouter();
  const [tab, setTab] = useState<"reports" | "courses" | "photos" | "users">("reports");
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [photoPage, setPhotoPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const USER_PAGE_SIZE = 20;
  const PHOTO_PAGE_SIZE = 20;

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user || user.role !== "admin") { router.replace("/"); return; }
    loadAll();
  }, [user, hasHydrated]);

  async function loadAll() {
    const supabase = createClient();
    const weekAgoDate = new Date();
    weekAgoDate.setDate(weekAgoDate.getDate() - 7);
    weekAgoDate.setHours(0, 0, 0, 0);
    const weekAgo = weekAgoDate.toISOString();

    const [
      { count: totalCourses },
      { count: publicCourses },
      { count: totalUsers },
      { count: newUsers },
      { count: pendingReports },
    ] = await Promise.all([
      supabase.from("courses").select("id", { count: "exact", head: true }),
      supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_public", true).eq("is_hidden", false),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    setStats({
      totalCourses: totalCourses ?? 0,
      publicCourses: publicCourses ?? 0,
      totalUsers: totalUsers ?? 0,
      newUsersThisWeek: newUsers ?? 0,
      pendingReports: pendingReports ?? 0,
    });

    await Promise.all([loadReports(supabase), loadCourses(supabase), loadUsers(supabase), loadPhotos(supabase)]);
    setLoading(false);
  }

  async function loadReports(supabase: ReturnType<typeof createClient>) {
    const { data } = await supabase
      .from("reports")
      .select("id, target_type, target_id, reason, created_at, reporter_id")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!data) return;

    const courseIds = data.filter((r) => r.target_type === "course").map((r) => r.target_id);
    const photoIds = data.filter((r) => r.target_type === "place_photo").map((r) => r.target_id);

    const [coursesRes, photosRes] = await Promise.all([
      courseIds.length > 0 ? supabase.from("courses").select("id, title").in("id", courseIds) : Promise.resolve({ data: [] }),
      photoIds.length > 0 ? supabase.from("place_photos").select("id, storage_url").in("id", photoIds) : Promise.resolve({ data: [] }),
    ]);

    const courseMap: Record<string, string> = {};
    (coursesRes.data ?? []).forEach((c) => { courseMap[c.id] = c.title; });
    const photoMap: Record<string, string> = {};
    (photosRes.data ?? []).forEach((p) => { photoMap[p.id] = p.storage_url; });

    setReports(data.map((r) => ({
      ...r,
      courseTitle: r.target_type === "course" ? courseMap[r.target_id] : undefined,
      photoUrl: r.target_type === "place_photo" ? photoMap[r.target_id] : undefined,
    })));
  }

  async function loadCourses(supabase: ReturnType<typeof createClient>) {
    const { data: coursesData } = await supabase
      .from("courses")
      .select("id, title, user_id, is_public, is_hidden, created_at, course_places(count)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(200);
    if (!coursesData) return;

    const userIds = [...new Set(coursesData.map((c) => c.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);
    const profileMap: Record<string, string> = {};
    (profilesData ?? []).forEach((p) => { profileMap[p.id] = p.username; });

    setCourses(coursesData.map((c) => ({
      id: c.id,
      title: c.title,
      user_id: c.user_id,
      is_public: c.is_public,
      is_hidden: c.is_hidden,
      created_at: c.created_at,
      username: profileMap[c.user_id] ?? "-",
      placeCount: (c.course_places as unknown as { count: number }[])[0]?.count ?? 0,
    })));
  }

  async function loadUsers(supabase: ReturnType<typeof createClient>) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username, created_at, role")
      .order("created_at", { ascending: false });
    if (!profilesData) return;

    const userIds = profilesData.map((p) => p.id);
    const { data: courseCounts } = await supabase
      .from("courses")
      .select("user_id")
      .in("user_id", userIds);
    const countMap: Record<string, number> = {};
    (courseCounts ?? []).forEach((c) => { countMap[c.user_id] = (countMap[c.user_id] ?? 0) + 1; });

    setUsers(profilesData.map((p) => ({
      id: p.id,
      username: p.username,
      created_at: p.created_at,
      role: p.role ?? "user",
      courseCount: countMap[p.id] ?? 0,
    })));
  }

  async function loadPhotos(supabase: ReturnType<typeof createClient>) {
    const { data } = await supabase
      .from("place_photos")
      .select("id, storage_url, place_id, created_at")
      .order("created_at", { ascending: false });
    if (!data) return;

    const placeIds = [...new Set(data.map((p) => p.place_id))];
    const { data: placesData } = await supabase
      .from("places")
      .select("id, name, address")
      .in("id", placeIds);
    const placeMap: Record<string, { name: string; address: string }> = {};
    (placesData ?? []).forEach((p) => { placeMap[p.id] = { name: p.name, address: p.address }; });

    setPhotos(data.map((p) => ({
      id: p.id,
      storage_url: p.storage_url,
      place_id: p.place_id,
      created_at: p.created_at,
      placeName: placeMap[p.place_id]?.name ?? "-",
      placeAddress: placeMap[p.place_id]?.address ?? "",
    })));
  }

  async function handleDeleteAdminPhoto(photoId: string, photoUrl: string) {
    if (!confirm("이 사진을 삭제할까요?")) return;
    const supabase = createClient();
    const path = photoUrl.split("/place-photos/")[1];
    if (path) await supabase.storage.from("place-photos").remove([path]);
    await supabase.from("place_photos").delete().eq("id", photoId);
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }


  async function handleRenameUser(userId: string, currentUsername: string) {
    const newUsername = prompt(`새 닉네임 입력 (현재: ${currentUsername})`);
    if (!newUsername || newUsername.trim() === currentUsername) return;
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ username: newUsername.trim() }).eq("id", userId);
    if (!error) {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, username: newUsername.trim() } : u));
    } else {
      alert("닉네임 변경 중 오류가 발생했어요.");
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("정말 이 회원을 탈퇴 처리하시겠어요? 되돌릴 수 없어요.")) return;
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setStats((prev) => prev ? { ...prev, totalUsers: prev.totalUsers - 1 } : prev);
    } else {
      alert("탈퇴 처리 중 오류가 발생했어요.");
    }
  }

  async function handleReportAction(reportId: string, status: "resolved" | "dismissed") {
    const supabase = createClient();
    await supabase.from("reports").update({ status }).eq("id", reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    setStats((prev) => prev ? { ...prev, pendingReports: prev.pendingReports - 1 } : prev);
  }

  async function handleHideAndResolve(reportId: string, courseId: string) {
    const supabase = createClient();
    await supabase.from("courses").update({ is_hidden: true }).eq("id", courseId);
    await handleReportAction(reportId, "resolved");
    setCourses((prev) => prev.map((c) => c.id === courseId ? { ...c, is_hidden: true } : c));
  }

  async function handleDeletePhoto(reportId: string, photoId: string, photoUrl: string) {
    const supabase = createClient();
    const path = photoUrl.split("/place-photos/")[1];
    if (path) await supabase.storage.from("place-photos").remove([path]);
    await supabase.from("place_photos").delete().eq("id", photoId);
    await handleReportAction(reportId, "resolved");
  }

  async function handleToggleHidden(courseId: string, isHidden: boolean) {
    const supabase = createClient();
    await supabase.from("courses").update({ is_hidden: !isHidden }).eq("id", courseId);
    setCourses((prev) => prev.map((c) => c.id === courseId ? { ...c, is_hidden: !isHidden } : c));
  }

  async function handleTogglePublic(courseId: string, isPublic: boolean) {
    const supabase = createClient();
    await supabase.from("courses").update({ is_public: !isPublic }).eq("id", courseId);
    setCourses((prev) => prev.map((c) => c.id === courseId ? { ...c, is_public: !isPublic } : c));
  }

  if (!hasHydrated || loading) {
    return <main className="p-4"><p className="text-gray-400 text-[14px]">불러오는 중...</p></main>;
  }

  return (
    <main className="p-4 pb-28 flex flex-col gap-5">
      <h1 className="text-[20px] font-bold">관리자 대시보드</h1>

      {/* 통계 */}
      {stats && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { label: "총 코스", value: stats.totalCourses },
            { label: "공개 코스", value: stats.publicCourses },
            { label: "총 유저", value: stats.totalUsers },
            { label: "이번주 신규 가입", value: stats.newUsersThisWeek },
            { label: "미처리 신고", value: stats.pendingReports, highlight: stats.pendingReports > 0 },
          ].map(({ label, value, highlight }) => (
            <div key={label} className={`rounded-2xl p-4 flex flex-col gap-1 ${highlight ? "bg-red-50" : "bg-gray-50"}`}>
              <span className={`text-[12px] ${highlight ? "text-red-400" : "text-gray-400"}`}>{label}</span>
              <span className={`text-[22px] font-bold ${highlight ? "text-red-500" : ""}`}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("reports")}
          className={`text-[13px] rounded-xl px-4 py-2 cursor-pointer ${tab === "reports" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500"}`}
        >
          신고 관리 {stats && stats.pendingReports > 0 && <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 text-[10px]">{stats.pendingReports}</span>}
        </button>
        <button
          onClick={() => setTab("courses")}
          className={`text-[13px] rounded-xl px-4 py-2 cursor-pointer ${tab === "courses" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500"}`}
        >
          코스 관리
        </button>
        <button
          onClick={() => setTab("photos")}
          className={`text-[13px] rounded-xl px-4 py-2 cursor-pointer ${tab === "photos" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500"}`}
        >
          사진 관리
        </button>
        <button
          onClick={() => setTab("users")}
          className={`text-[13px] rounded-xl px-4 py-2 cursor-pointer ${tab === "users" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500"}`}
        >
          회원 관리
        </button>
      </div>

      {/* 신고 관리 */}
      {tab === "reports" && (
        <div className="flex flex-col gap-3">
          {reports.length === 0 ? (
            <p className="text-gray-400 text-[14px] text-center py-8">미처리 신고가 없어요</p>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] rounded-full px-2 py-0.5 ${report.target_type === "course" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"}`}>
                        {report.target_type === "course" ? "코스" : "사진"}
                      </span>
                      <span className="text-[12px] text-gray-500">{report.reason}</span>
                    </div>
                    {report.target_type === "course" && report.courseTitle && (
                      <p className="text-[13px] font-medium">{report.courseTitle}</p>
                    )}
                    {report.target_type === "place_photo" && report.photoUrl && (
                      <img src={report.photoUrl} alt="" className="w-16 h-16 rounded-lg object-cover mt-1" />
                    )}
                    <p className="text-[11px] text-gray-400">{new Date(report.created_at).toLocaleDateString("ko-KR")}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {report.target_type === "course" && (
                    <>
                      <button
                        onClick={() => router.push(`/courses/${report.target_id}`)}
                        className="text-[12px] border border-gray-300 text-gray-500 rounded-xl px-3 py-1.5 cursor-pointer hover:border-gray-500"
                      >
                        코스 보기
                      </button>
                      <button
                        onClick={() => handleHideAndResolve(report.id, report.target_id)}
                        className="text-[12px] border border-red-300 text-red-500 rounded-xl px-3 py-1.5 cursor-pointer hover:bg-red-50"
                      >
                        숨김 + 처리완료
                      </button>
                    </>
                  )}
                  {report.target_type === "place_photo" && report.photoUrl && (
                    <button
                      onClick={() => handleDeletePhoto(report.id, report.target_id, report.photoUrl!)}
                      className="text-[12px] border border-red-300 text-red-400 rounded-xl px-3 py-1.5 cursor-pointer hover:bg-red-50"
                    >
                      사진 삭제
                    </button>
                  )}
                  <button
                    onClick={() => handleReportAction(report.id, "resolved")}
                    className="text-[12px] border border-green-300 text-green-600 rounded-xl px-3 py-1.5 cursor-pointer hover:bg-green-50"
                  >
                    처리 완료
                  </button>
                  <button
                    onClick={() => handleReportAction(report.id, "dismissed")}
                    className="text-[12px] border border-gray-200 text-gray-400 rounded-xl px-3 py-1.5 cursor-pointer hover:border-gray-400"
                  >
                    기각
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 사진 관리 */}
      {tab === "photos" && (
        <div className="flex flex-col gap-3">
          {photos.length === 0 ? (
            <p className="text-gray-400 text-[14px] text-center py-8">등록된 사진이 없어요</p>
          ) : (
            <>
              <p className="text-[12px] text-gray-400">전체 {photos.length}장</p>
              <div className="grid grid-cols-2 gap-3">
                {photos.slice((photoPage - 1) * PHOTO_PAGE_SIZE, photoPage * PHOTO_PAGE_SIZE).map((photo) => (
                  <div key={photo.id} className="bg-gray-50 rounded-2xl overflow-hidden flex flex-col">
                    <img src={photo.storage_url} alt="" className="w-full aspect-square object-cover" />
                    <div className="p-3 flex flex-col gap-1.5">
                      <p className="text-[13px] font-medium truncate">{photo.placeName}</p>
                      <p className="text-[11px] text-gray-400 truncate">{photo.placeAddress}</p>
                      <p className="text-[10px] text-gray-300">{new Date(photo.created_at).toLocaleDateString("ko-KR")}</p>
                      <button
                        onClick={() => handleDeleteAdminPhoto(photo.id, photo.storage_url)}
                        className="mt-1 text-[11px] border border-red-300 text-red-400 rounded-xl py-1.5 cursor-pointer hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {Math.ceil(photos.length / PHOTO_PAGE_SIZE) > 1 && (
                <div className="flex justify-center items-center gap-2 pt-2">
                  <button
                    onClick={() => setPhotoPage((p) => Math.max(1, p - 1))}
                    disabled={photoPage === 1}
                    className="px-3 py-1.5 rounded-xl text-[13px] bg-gray-100 text-gray-500 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                  >
                    이전
                  </button>
                  <span className="text-[13px] text-gray-500">{photoPage} / {Math.ceil(photos.length / PHOTO_PAGE_SIZE)}</span>
                  <button
                    onClick={() => setPhotoPage((p) => Math.min(Math.ceil(photos.length / PHOTO_PAGE_SIZE), p + 1))}
                    disabled={photoPage === Math.ceil(photos.length / PHOTO_PAGE_SIZE)}
                    className="px-3 py-1.5 rounded-xl text-[13px] bg-gray-100 text-gray-500 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                  >
                    다음
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 회원 관리 */}
      {tab === "users" && (
        <div className="flex flex-col gap-2">
          {users.slice((userPage - 1) * USER_PAGE_SIZE, userPage * USER_PAGE_SIZE).map((u) => (
            <div key={u.id} className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between gap-2">
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[14px] truncate">@{u.username}</p>
                  {u.role === "admin" && (
                    <span className="text-[10px] bg-gray-800 text-white rounded-full px-2 py-0.5">관리자</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">코스 {u.courseCount}개 · 가입 {new Date(u.created_at).toLocaleDateString("ko-KR")}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleRenameUser(u.id, u.username)}
                  className="text-[11px] border border-gray-300 text-gray-500 rounded-xl px-3 py-1.5 cursor-pointer hover:border-gray-500"
                >
                  닉네임 변경
                </button>
                {u.role !== "admin" && (
                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    className="text-[11px] border border-red-300 text-red-400 rounded-xl px-3 py-1.5 cursor-pointer hover:bg-red-50"
                  >
                    탈퇴 처리
                  </button>
                )}
              </div>
            </div>
          ))}
          {Math.ceil(users.length / USER_PAGE_SIZE) > 1 && (
            <div className="flex justify-center items-center gap-2 pt-2">
              <button
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                disabled={userPage === 1}
                className="px-3 py-1.5 rounded-xl text-[13px] bg-gray-100 text-gray-500 disabled:opacity-30 cursor-pointer disabled:cursor-default"
              >
                이전
              </button>
              <span className="text-[13px] text-gray-500">{userPage} / {Math.ceil(users.length / USER_PAGE_SIZE)}</span>
              <button
                onClick={() => setUserPage((p) => Math.min(Math.ceil(users.length / USER_PAGE_SIZE), p + 1))}
                disabled={userPage === Math.ceil(users.length / USER_PAGE_SIZE)}
                className="px-3 py-1.5 rounded-xl text-[13px] bg-gray-100 text-gray-500 disabled:opacity-30 cursor-pointer disabled:cursor-default"
              >
                다음
              </button>
            </div>
          )}
        </div>
      )}

      {/* 코스 관리 */}
      {tab === "courses" && (
        <div className="flex flex-col gap-2">
          {courses.map((course) => (
            <div key={course.id} className={`rounded-2xl p-4 flex items-center justify-between gap-2 ${course.is_hidden ? "bg-gray-100 opacity-60" : "bg-gray-50"}`}>
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <p className="font-medium text-[14px] truncate">{course.title}</p>
                <p className="text-[11px] text-gray-400">@{course.username} · 장소 {course.placeCount}개 · {new Date(course.created_at).toLocaleDateString("ko-KR")}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => router.push(`/courses/${course.id}`)}
                  className="text-[11px] border border-gray-300 text-gray-500 rounded-xl px-2 py-1 cursor-pointer hover:border-gray-500"
                >
                  보기
                </button>
                <button
                  onClick={() => handleTogglePublic(course.id, course.is_public)}
                  className={`text-[11px] rounded-xl px-2 py-1 cursor-pointer border ${course.is_public ? "border-orange-300 text-orange-500 hover:bg-orange-50" : "border-gray-300 text-gray-500 hover:bg-gray-100"}`}
                >
                  {course.is_public ? "비공개 전환" : "공개 전환"}
                </button>
                <button
                  onClick={() => handleToggleHidden(course.id, course.is_hidden)}
                  className={`text-[11px] rounded-xl px-2 py-1 cursor-pointer border ${course.is_hidden ? "border-green-300 text-green-600 hover:bg-green-50" : "border-red-300 text-red-400 hover:bg-red-50"}`}
                >
                  {course.is_hidden ? "숨김 해제" : "숨김"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
