import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Loader2, Send, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

const PostPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchPost = async () => {
    if (!postId) return;

    const { data: postData, error } = await supabase
      .from("posts")
      .select("id, title, content, created_at, user_id")
      .eq("id", postId)
      .maybeSingle();

    if (error || !postData) {
      navigate("/community");
      return;
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", postData.user_id)
      .maybeSingle();

    setPost({
      ...postData,
      profiles: profile,
    });
  };

  const fetchComments = async () => {
    if (!postId) return;

    const { data: commentsData } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!commentsData) {
      setComments([]);
      return;
    }

    // Fetch profiles for commenters
    const userIds = [...new Set(commentsData.map((c) => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    const profilesMap = (profiles || []).reduce((acc, p) => {
      acc[p.user_id] = p;
      return acc;
    }, {} as Record<string, { display_name: string | null; avatar_url: string | null }>);

    const commentsWithProfiles: Comment[] = commentsData.map((c) => ({
      ...c,
      profiles: profilesMap[c.user_id] || null,
    }));

    setComments(commentsWithProfiles);
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchPost();
      await fetchComments();
      setLoading(false);
    };
    loadData();

    // Subscribe to realtime comments
    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        () => fetchComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Bitte melde dich an, um zu kommentieren.");
      return;
    }

    if (!newComment.trim()) {
      toast.error("Kommentar darf nicht leer sein.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (error) {
      toast.error("Kommentar konnte nicht gesendet werden.");
    } else {
      setNewComment("");
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    setDeleting(commentId);
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      toast.error("Kommentar konnte nicht gelöscht werden.");
    }
    setDeleting(null);
  };

  const handleDeletePost = async () => {
    if (!post || !user || post.user_id !== user.id) return;

    const { error } = await supabase.from("posts").delete().eq("id", post.id);

    if (error) {
      toast.error("Beitrag konnte nicht gelöscht werden.");
    } else {
      toast.success("Beitrag gelöscht.");
      navigate("/community");
    }
  };

  const getInitials = (name: string | null) => {
    return name ? name.slice(0, 2).toUpperCase() : "??";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/community"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Community
          </Link>

          {/* Post */}
          <article className="challenge-card mb-8">
            <div className="flex gap-4">
              <Avatar className="w-12 h-12 border border-border shrink-0">
                <AvatarImage
                  src={post.profiles?.avatar_url || undefined}
                  alt={post.profiles?.display_name || "User"}
                />
                <AvatarFallback className="bg-muted">
                  {getInitials(post.profiles?.display_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{post.title}</h1>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span>{post.profiles?.display_name || "Anonym"}</span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(post.created_at), {
                      addSuffix: true,
                      locale: de,
                    })}
                  </span>
                </div>
              </div>
              {user?.id === post.user_id && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDeletePost}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="mt-4 whitespace-pre-wrap">{post.content}</p>
          </article>

          {/* Comments Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Kommentare ({comments.length})
            </h2>

            {/* Comment Form */}
            <form onSubmit={handleSubmitComment} className="flex gap-3">
              <Textarea
                placeholder={
                  user
                    ? "Schreibe einen Kommentar..."
                    : "Melde dich an, um zu kommentieren"
                }
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={!user}
                className="flex-1"
                rows={2}
                maxLength={2000}
              />
              <Button type="submit" disabled={submitting || !user} size="icon">
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>

            {/* Comments List */}
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Noch keine Kommentare. Sei der Erste!
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex gap-3 p-4 bg-secondary rounded-lg"
                  >
                    <Avatar className="w-8 h-8 border border-border shrink-0">
                      <AvatarImage
                        src={comment.profiles?.avatar_url || undefined}
                        alt={comment.profiles?.display_name || "User"}
                      />
                      <AvatarFallback className="bg-muted text-xs">
                        {getInitials(comment.profiles?.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">
                            {comment.profiles?.display_name || "Anonym"}
                          </span>
                          <span className="text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                              locale: de,
                            })}
                          </span>
                        </div>
                        {user?.id === comment.user_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={deleting === comment.id}
                          >
                            {deleting === comment.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PostPage;
