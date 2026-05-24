import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: course } = await supabase
    .from("courses")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!course || course.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from("courses")
    .update({ invite_token: token, invite_token_expires_at: expiresAt })
    .eq("id", id);

  return NextResponse.json({ token, expiresAt });
}
