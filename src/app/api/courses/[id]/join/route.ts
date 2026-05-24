import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { token } = await req.json();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: course } = await supabase
    .from("courses")
    .select("user_id, invite_token, invite_token_expires_at")
    .eq("id", id)
    .single();

  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (course.user_id === user.id) return NextResponse.json({ error: "Already owner" }, { status: 400 });
  if (course.invite_token !== token) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  if (!course.invite_token_expires_at || new Date(course.invite_token_expires_at) < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 400 });
  }

  const { error } = await supabase
    .from("course_collaborators")
    .upsert({ course_id: id, user_id: user.id }, { onConflict: "course_id,user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
