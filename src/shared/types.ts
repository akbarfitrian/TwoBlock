export interface Profile {
  wallet_address: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_og: boolean;
  og_member_since_block: number | null;
  username_changed_at: string | null;
  total_points: number;
  referral_code: string | null;
  referred_by: string | null;
  referral_slots_used: number;
  created_at: string;
  updated_at: string;
}

export type PostType = "text" | "poll";

export interface PollOption {
  index: number;
  label: string;
}

export interface Post {
  id: string;
  author_wallet: string;
  content: string | null;
  image_urls: string[];
  video_url: string | null;
  post_type: PostType;
  repost_of: string | null;
  poll_options: PollOption[] | null;
  poll_expires_at: string | null;
  is_gated: boolean;
  created_at: string;
  deleted_at: string | null;
}

export interface PostWithAuthor extends Post {
  author: Pick<
    Profile,
    "wallet_address" | "username" | "avatar_url" | "is_og" | "total_points"
  >;
  tip_total_usdc: number;
  love_count: number;

  my_reaction: "love" | null;

  reposted_post?: PostWithAuthor | null;

  poll_vote_counts: number[];

  my_poll_vote: number | null;

  comment_count: number;
}

export interface Comment {
  id: string;
  post_id: string;
  author_wallet: string;
  content: string;
  created_at: string;
}

export interface CommentWithAuthor extends Comment {
  author: Pick<
    Profile,
    "wallet_address" | "username" | "avatar_url" | "is_og" | "total_points"
  >;
}
