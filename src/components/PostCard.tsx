import Image from "next/image";

interface PostCardProps {
  username: string;
  avatarUrl: string;
  images: string[];
  className: string;
}
export default function PostCard({
  username,
  avatarUrl,
  images,
  className,
}: PostCardProps) {
  return (
    <article className={className}>
      <header className="flex items-center gap-3 px-4 py-3">
        <Image
          src={avatarUrl}
          width={8}
          height={8}
          alt="아바타"
          className="h-8 w-8 rounded-full"
        />
        <span>{username}</span>
      </header>
      <div className="relative w-full aspect-3/4">
        {images.map((img, i) => (
          <Image key={i} src={img} alt="" className="object-cover" fill />
        ))}
      </div>
    </article>
  );
}
