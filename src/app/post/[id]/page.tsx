import { PostDetailPage } from "@/frontend/components/PostDetailPage";

export default function Post({ params }: { params: { id: string } }) {
  return <PostDetailPage postId={params.id} />;
}
