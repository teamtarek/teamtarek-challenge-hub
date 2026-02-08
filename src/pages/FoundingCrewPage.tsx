import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Award, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface CrewPost {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

const FoundingCrewPage = () => {
  const { user } = useAuth();
  const { isFoundingMember, isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CrewPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [posting, setPosting] = useState(false);

  const canAccess = isFoundingMember || isAdmin;

  useEffect(() => {
    if (!roleLoading && !canAccess) {
      navigate("/dashboard");
    }
  }, [roleLoading, canAccess, navigate]);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("founding_crew_posts")
      .select("id, content, created_at, user_id")
      .order("created_at", { ascending: true });

    if (error || !data) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(data.map((p) => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = (profiles || []).reduce((acc, p) => {
      acc[p.user_id] = p;
      return acc;
    }, {} as Record<string, { display_name: string | null; avatar_url: string | null }>);

    setPosts(
      data.map((p) => ({
        ...p,
        profile: profileMap[p.user_id] || null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    if (!roleLoading && canAccess) {
      fetchPosts();

      const channel = supabase
        .channel("founding-crew")
        .on("postgres_changes", { event: "*", schema: "public", table: "founding_crew_posts" }, () => fetchPosts())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [roleLoading, canAccess]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newContent.trim()) return;
    setPosting(true);

    const { error } = await supabase.from("founding_crew_posts").insert({
      user_id: user.id,
      content: newContent.trim(),
    } as any);

    if (error) toast.error("Nachricht konnte nicht gesendet werden.");
    else {
      setNewContent("");
    }
    setPosting(false);
  };

  const getInitials = (name: string | null) => name ? name.slice(0, 2).toUpperCase() : "??";

  if (roleLoading || !canAccess) return null;

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Award className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold">Founding Crew</h1>
        </div>

        {/* Welcome banner */}
        <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-3 mb-8 text-sm text-amber-200/90">
          Du gehörst zur Founding Crew – danke, dass du von Anfang an dabei bist.
        </div>

        {/* Posts */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            {posts.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Noch keine Beiträge. Sei der Erste!
              </p>
            )}
            {posts.map((post) => (
              <div key={post.id} className="bg-card border border-border p-4 flex gap-3">
                <Link to={`/profil/${post.user_id}`} className="flex-shrink-0">
                  <Avatar className="w-9 h-9 border border-border">
                    <AvatarImage src={post.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary text-xs">
                      {getInitials(post.profile?.display_name)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      to={`/profil/${post.user_id}`}
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {post.profile?.display_name || "Anonym"}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: de })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Post form */}
        <form onSubmit={handlePost} className="flex gap-2">
          <Textarea
            placeholder="Schreib etwas an die Crew..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={2}
            className="flex-1 resize-none"
            maxLength={2000}
          />
          <Button type="submit" size="icon" disabled={posting || !newContent.trim()} className="self-end h-10 w-10">
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default FoundingCrewPage;
