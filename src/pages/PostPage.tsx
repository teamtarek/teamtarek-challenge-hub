import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

import { MemberBadge } from "@/components/MemberBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Loader2, Send, Trash2, MessageSquare, Heart, Pencil, X, Check } from "lucide-react";
import { EmojiPicker } from "@/components/EmojiPicker";
import { VideoEmbed } from "@/components/VideoEmbed";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

const CATEGORIES = [
  { value: "outdoor-training", label: "Outdoor Training" },
  { value: "challenges", label: "Challenges" },
  { value: "coaches-corner", label: "Coaches Corner (Q&A)" },
] as const;

type Category = typeof CATEGORIES[number]["value"];

const getCategoryLabel = (value: string) => {
  return CATEGORIES.find((c) => c.value === value)?.label || value;
};

type MemberType = "webmaster" | "admin" | "member" | "prospect";

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  category: Category;
  image_url: string | null;
  video_url: string | null;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  member_type: MemberType | null;
  like_count: number;
  user_has_liked: boolean;
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
  member_type: MemberType | null;
  like_count: number;
  user_has_liked: boolean;
}

const PostPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [likingPost, setLikingPost] = useState(false);
  const [likingComment, setLikingComment] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [editPostContent, setEditPostContent] = useState("");
  const [editPostTitle, setEditPostTitle] = useState("");
  const [savingPost, setSavingPost] = useState(false);

  const fetchPost = async () => {
    if (!postId) return;

    const { data: postData, error } = await supabase
      .from("posts")
      .select("id, title, content, created_at, user_id, category, image_url, video_url")
      .eq("id", postId)
      .maybeSingle() as { 
        data: { id: string; title: string; content: string; created_at: string; user_id: string; category: string; image_url: string | null; video_url: string | null } | null; 
        error: any 
      };

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

    // Fetch likes for this post
    const { data: likesData } = await supabase
      .from("likes")
      .select("user_id")
      .eq("post_id", postId);

    const likeCount = likesData?.length || 0;
    const userHasLiked = user ? likesData?.some((l) => l.user_id === user.id) || false : false;

    // Fetch member type for post author
    const { data: memberTypeData } = await supabase
      .rpc("get_user_member_type", { _user_id: postData.user_id });

    setPost({
      ...postData,
      category: postData.category as Category,
      image_url: postData.image_url,
      video_url: postData.video_url,
      profiles: profile,
      member_type: (memberTypeData as MemberType) || null,
      like_count: likeCount,
      user_has_liked: userHasLiked,
    });
  };

  const fetchComments = async () => {
    if (!postId) return;

    const { data: commentsData } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!commentsData || commentsData.length === 0) {
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

    // Fetch likes for comments
    const commentIds = commentsData.map((c) => c.id);
    const { data: likesData } = await supabase
      .from("likes")
      .select("comment_id, user_id")
      .in("comment_id", commentIds);

    const likeCountMap: Record<string, number> = {};
    const userLikesMap: Record<string, boolean> = {};
    (likesData || []).forEach((l) => {
      if (l.comment_id) {
        likeCountMap[l.comment_id] = (likeCountMap[l.comment_id] || 0) + 1;
        if (user && l.user_id === user.id) {
          userLikesMap[l.comment_id] = true;
        }
      }
    });

    // Fetch member types for commenters
    const memberTypesMap: Record<string, MemberType | null> = {};
    for (const userId of userIds) {
      const { data: memberTypeData } = await supabase
        .rpc("get_user_member_type", { _user_id: userId });
      if (memberTypeData) {
        memberTypesMap[userId] = memberTypeData as MemberType;
      }
    }

    const commentsWithData: Comment[] = commentsData.map((c) => ({
      ...c,
      profiles: profilesMap[c.user_id] || null,
      member_type: memberTypesMap[c.user_id] || null,
      like_count: likeCountMap[c.id] || 0,
      user_has_liked: userLikesMap[c.id] || false,
    }));

    setComments(commentsWithData);
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchPost();
      await fetchComments();
      setLoading(false);
    };
    loadData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`post-${postId}-updates`)
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "likes" },
        () => {
          fetchPost();
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, user]);

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

  const handleLikePost = async () => {
    if (!user || !post) {
      toast.error("Bitte melde dich an, um zu liken.");
      return;
    }

    setLikingPost(true);

    if (post.user_has_liked) {
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", post.id);

      if (error) {
        toast.error("Like konnte nicht entfernt werden.");
      }
    } else {
      const { error } = await supabase.from("likes").insert({
        user_id: user.id,
        post_id: post.id,
      });

      if (error) {
        toast.error("Like konnte nicht gesetzt werden.");
      }
    }

    setLikingPost(false);
  };

  const handleLikeComment = async (commentId: string, hasLiked: boolean) => {
    if (!user) {
      toast.error("Bitte melde dich an, um zu liken.");
      return;
    }

    setLikingComment(commentId);

    if (hasLiked) {
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("user_id", user.id)
        .eq("comment_id", commentId);

      if (error) {
        toast.error("Like konnte nicht entfernt werden.");
      }
    } else {
      const { error } = await supabase.from("likes").insert({
        user_id: user.id,
        comment_id: commentId,
      });

      if (error) {
        toast.error("Like konnte nicht gesetzt werden.");
      }
    }

    setLikingComment(null);
  };

  const handleEditPost = () => {
    if (!post) return;
    setEditPostTitle(post.title);
    setEditPostContent(post.content);
    setEditingPost(true);
  };

  const handleSavePost = async () => {
    if (!post || !editPostTitle.trim() || !editPostContent.trim()) return;
    setSavingPost(true);
    const { error } = await supabase
      .from("posts")
      .update({ title: editPostTitle.trim(), content: editPostContent.trim() } as any)
      .eq("id", post.id);
    if (error) toast.error("Beitrag konnte nicht gespeichert werden.");
    else {
      toast.success("Beitrag aktualisiert.");
      setEditingPost(false);
      fetchPost();
    }
    setSavingPost(false);
  };

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  };

  const handleSaveComment = async (commentId: string) => {
    if (!editingCommentContent.trim()) return;
    setSavingComment(true);
    const { error } = await supabase
      .from("comments")
      .update({ content: editingCommentContent.trim() })
      .eq("id", commentId);
    if (error) toast.error("Kommentar konnte nicht gespeichert werden.");
    else {
      toast.success("Kommentar aktualisiert.");
      setEditingCommentId(null);
      fetchComments();
    }
    setSavingComment(false);
  };

  const getInitials = (name: string | null) => {
    return name ? name.slice(0, 2).toUpperCase() : "??";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">

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
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {getCategoryLabel(post.category)}
                  </span>
                </div>
                {editingPost ? (
                  <Input
                    value={editPostTitle}
                    onChange={(e) => setEditPostTitle(e.target.value)}
                    className="text-2xl font-bold"
                    maxLength={200}
                  />
                ) : (
                  <h1 className="text-2xl font-bold">{post.title}</h1>
                )}
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                  <Link 
                    to={`/profil/${post.user_id}`} 
                    className="hover:text-primary transition-colors"
                  >
                    {post.profiles?.display_name || "Anonym"}
                  </Link>
                  {post.member_type && (
                    <MemberBadge memberType={post.member_type} size="sm" />
                  )}
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(post.created_at), {
                      addSuffix: true,
                      locale: de,
                    })}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                {user?.id === post.user_id && !editingPost && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleEditPost}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
                {editingPost && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => setEditingPost(false)} className="text-muted-foreground">
                      <X className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleSavePost} disabled={savingPost} className="text-primary">
                      {savingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </Button>
                  </>
                )}
                {(user?.id === post.user_id || isAdmin) && (
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
            </div>
            {editingPost ? (
              <Textarea
                value={editPostContent}
                onChange={(e) => setEditPostContent(e.target.value)}
                className="mt-4"
                rows={5}
                maxLength={5000}
              />
            ) : (
              <p className="mt-4 whitespace-pre-wrap">{post.content}</p>
            )}

            {/* Post Image */}
            {post.image_url && (
              <div className="mt-4">
                <img
                  src={post.image_url}
                  alt="Beitragsbild"
                  className="w-full max-h-96 object-contain rounded-lg bg-secondary"
                />
              </div>
            )}

            {/* Post Video */}
            {post.video_url && (
              <div className="mt-4">
                <VideoEmbed url={post.video_url} />
              </div>
            )}
            
            {/* Post Like Button */}
            <div className="mt-4 pt-4 border-t border-border">
              <button
                onClick={handleLikePost}
                disabled={likingPost}
                className={`flex items-center gap-2 text-sm transition-colors ${
                  post.user_has_liked
                    ? "text-red-500"
                    : "text-muted-foreground hover:text-red-500"
                }`}
              >
                <Heart
                  className={`w-5 h-5 ${post.user_has_liked ? "fill-current" : ""}`}
                />
                <span>{post.like_count} {post.like_count === 1 ? "Like" : "Likes"}</span>
              </button>
            </div>
          </article>

          {/* Comments Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Kommentare ({comments.length})
            </h2>

            {/* Comment Form */}
            <form onSubmit={handleSubmitComment} className="flex gap-3">
              <div className="flex-1 relative">
                <Textarea
                  placeholder={
                    user
                      ? "Schreibe einen Kommentar..."
                      : "Melde dich an, um zu kommentieren"
                  }
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={!user}
                  rows={2}
                  maxLength={2000}
                />
                {user && (
                  <div className="absolute bottom-2 right-2">
                    <EmojiPicker size="sm" onEmojiSelect={(emoji) => setNewComment((prev) => prev + emoji)} />
                  </div>
                )}
              </div>
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
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <Link 
                            to={`/profil/${comment.user_id}`} 
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {comment.profiles?.display_name || "Anonym"}
                          </Link>
                          {comment.member_type && (
                            <MemberBadge memberType={comment.member_type} size="sm" />
                          )}
                          <span className="text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                              locale: de,
                            })}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {user?.id === comment.user_id && editingCommentId !== comment.id && (
                            <button onClick={() => handleEditComment(comment)} className="p-1 text-muted-foreground hover:text-foreground">
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                          {editingCommentId === comment.id && (
                            <>
                              <button onClick={() => setEditingCommentId(null)} className="p-1 text-muted-foreground"><X className="w-3 h-3" /></button>
                              <button onClick={() => handleSaveComment(comment.id)} disabled={savingComment} className="p-1 text-primary">
                                {savingComment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              </button>
                            </>
                          )}
                          {(user?.id === comment.user_id || isAdmin) && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteComment(comment.id)} disabled={deleting === comment.id}>
                              {deleting === comment.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            </Button>
                          )}
                        </div>
                      </div>
                      {editingCommentId === comment.id ? (
                        <Textarea value={editingCommentContent} onChange={(e) => setEditingCommentContent(e.target.value)} className="mt-1" rows={2} maxLength={2000} />
                      ) : (
                        <p className="mt-1 whitespace-pre-wrap">{comment.content}</p>
                      )}
                      <button
                        onClick={() => handleLikeComment(comment.id, comment.user_has_liked)}
                        disabled={likingComment === comment.id}
                        className={`flex items-center gap-1 mt-2 text-xs transition-colors ${comment.user_has_liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${comment.user_has_liked ? "fill-current" : ""}`} />
                        <span>{comment.like_count}</span>
                      </button>
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
