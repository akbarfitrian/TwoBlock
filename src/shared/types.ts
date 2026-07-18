export type VerificationTier = "free" | "verified" | "verified_pro" | "verified_max";

export interface Profile {
  wallet_address: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  verification_tier: VerificationTier;
  verification_expires_at: string | null;
  username_changed_at: string | null;
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
  post_type: PostType;
  repost_of: string | null;
  poll_options: PollOption[] | null;
  poll_expires_at: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface PostWithAuthor extends Post {
  author: Pick<
    Profile,
    "wallet_address" | "username" | "avatar_url" | "verification_tier"
  >;
  tip_total_usdc: number;
  agree_count: number;
  disagree_count: number;

  my_reaction: "agree" | "disagree" | null;

  reposted_post?: PostWithAuthor | null;

  poll_vote_counts: number[];

  my_poll_vote: number | null;
}
