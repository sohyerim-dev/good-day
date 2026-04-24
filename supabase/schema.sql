-- profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique
);

-- places
create table places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  naver_url text not null unique
);

-- courses
create table courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  course_lat double precision,
  course_lng double precision,
  is_public boolean not null default true,
  likes_count integer not null default 0,
  bookmarks_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- course_places
create table course_places (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  place_id uuid not null references places(id) on delete cascade,
  "order" integer not null
);

-- bookmarks
create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, course_id)
);

-- likes
create table likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  unique(user_id, course_id)
);

-- trigger: auto insert profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
