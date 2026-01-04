import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageSquare, Plus, Loader2, ArrowLeft } from "lucide-react";
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
  comment_count: number;
}

const CommunityPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const fetchPosts = async () => {
    const { data: postsData, error } = await supabase
      .from("posts")
      .select("id, title, content, created_at, user_id")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
      setLoading(false);
      return;
    }

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    // Fetch profiles for post authors
    const userIds = [...new Set(postsData.map((p) => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    const profilesMap = (profiles || []).reduce((acc, p) => {
      acc[p.user_id] = p;
      return acc;
    }, {} as Record<string, { display_name: string | null; avatar_url: string | null }>);

    // Fetch comment counts
    const { data: commentCounts } = await supabase
      .from("comments")
      .select("post_id");

    const countMap: Record<string, number> = {};
    (commentCounts || []).forEach((c) => {
      countMap[c.post_id] = (countMap[c.post_id] || 0) + 1;
    });

    const postsWithData: Post[] = postsData.map((p) => ({
      ...p,
      profiles: profilesMap[p.user_id] || null,
      comment_count: countMap[p.id] || 0,
    }));

    setPosts(postsWithData);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("posts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => fetchPosts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Bitte melde dich an, um einen Beitrag zu erstellen.");
      return;
    }

    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("Titel und Inhalt sind erforderlich.");
      return;
    }

    setCreating(true);
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      title: newTitle.trim(),
      content: newContent.trim(),
    });

    if (error) {
      toast.error("Beitrag konnte nicht erstellt werden.");
    } else {
      toast.success("Beitrag erstellt!");
      setNewTitle("");
      setNewContent("");
      setDialogOpen(false);
    }
    setCreating(false);
  };

  const getInitials = (name: string | null) => {
    return name ? name.slice(0, 2).toUpperCase() : "??";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zu den Challenges
          </Link>

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">Community</h1>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Neuer Beitrag
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neuen Beitrag erstellen</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreatePost} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titel</Label>
                    <Input
                      id="title"
                      placeholder="Worum geht es?"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Inhalt</Label>
                    <Textarea
                      id="content"
                      placeholder="Teile deine Gedanken..."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={5}
                      maxLength={5000}
                    />
                  </div>
                  <Button type="submit" disabled={creating} className="w-full">
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Erstellen...
                      </>
                    ) : (
                      "Beitrag erstellen"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-secondary animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Noch keine Beiträge vorhanden.</p>
              <p className="text-sm mt-1">Sei der Erste und starte eine Diskussion!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/community/${post.id}`}
                  className="block challenge-card hover:border-primary/50 transition-colors"
                >
                  <div className="flex gap-4">
                    <Avatar className="w-10 h-10 border border-border shrink-0">
                      <AvatarImage
                        src={post.profiles?.avatar_url || undefined}
                        alt={post.profiles?.display_name || "User"}
                      />
                      <AvatarFallback className="bg-muted text-sm">
                        {getInitials(post.profiles?.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-lg truncate">
                        {post.title}
                      </h2>
                      <p className="text-muted-foreground text-sm line-clamp-2 mt-1">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span>{post.profiles?.display_name || "Anonym"}</span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(post.created_at), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {post.comment_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CommunityPage;
