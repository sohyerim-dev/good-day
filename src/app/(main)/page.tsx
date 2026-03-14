import PostCard, { type PostWithRelations } from "@/components/PostCard";
import TopNav from "@/components/TopNav";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: posts } = await supabase
    .from("posts")
    .select(
      `id, user_id, content, created_at, profiles ( username, avatar_url ), places ( id, name ), post_images ( image_url, order ), tags ( name ), likes (user_id), saves (user_id), comments ( id, content, created_at, profiles ( username, avatar_url ) )`,
    )
    .order("created_at", { ascending: false })
    .order("order", { ascending: true, referencedTable: "post_images" });

  return (
    <>
      <TopNav />
      <main className="pt-25">
        {posts?.map((post) => (
          <PostCard
            key={post.id}
            post={post as unknown as PostWithRelations}
            userId={user?.id}
          />
        ))}
      </main>
    </>
  );
}
