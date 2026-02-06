import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { MemberBadge } from "@/components/MemberBadge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Plus, Loader2, Heart, Search, Image, X, Pencil, Trash2 } from "lucide-react";
import { EmojiPicker } from "@/components/EmojiPicker";
import { VideoEmbed, isValidVideoUrl } from "@/components/VideoEmbed";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

const CATEGORIES = [
  { value: "allgemein", label: "Allgemein" },
  { value: "training-draussen", label: "Training draußen" },
  { value: "challenges-ergebnisse", label: "Challenges & Ergebnisse" },
  { value: "technik-fragen", label: "Technik & Fragen" },
  { value: "motivation-mindset", label: "Motivation / Mindset" },
  { value: "off-topic", label: "Off-Topic" },
  { value: "training-logs", label: "Training Logs" },
] as const;

type Category = typeof CATEGORIES[number]["value"];

const getCategoryLabel = (value: string) => {
  return CATEGORIES.find((c) => c.value === value)?.label || value;
};

type MemberType = "webmaster" | "admin" | "member" | "prospect";

interface Thread {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  category: string;
  image_url: string | null;
  video_url: string | null;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  member_type: MemberType | null;
  comment_count: number;
  like_count: number;
  user_has_liked: boolean;
}

const CommunityPage = () => {
  const { user } = useAuth();
  const { isMember, isAdmin, loading: roleLoading } = useUserRole();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingThread, setEditingThread] = useState<Thread | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("allgemein");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [likingThread, setLikingThread] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [deletingThread, setDeletingThread] = useState<string | null>(null);

  const canPost = isMember || isAdmin;

  const fetchThreads = async () => {
    let query = supabase
      .from("posts")
      .select("id, title, content, created_at, user_id, category, image_url, video_url")
      .order("created_at", { ascending: false });

    if (filterCategory !== "all") {
      query = query.eq("category", filterCategory);
    }

    const { data: postsData, error } = await query as {
      data: { id: string; title: string; content: string; created_at: string; user_id: string; category: string; image_url: string | null; video_url: string | null }[] | null;
      error: any;
    };

    if (error || !postsData || postsData.length === 0) {
      setThreads([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(postsData.map((p) => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    const profilesMap = (profiles || []).reduce((acc, p) => {
      acc[p.user_id] = p;
      return acc;
    }, {} as Record<string, { display_name: string | null; avatar_url: string | null }>);

    const { data: commentCounts } = await supabase.from("comments").select("post_id");
    const commentCountMap: Record<string, number> = {};
    (commentCounts || []).forEach((c) => {
      commentCountMap[c.post_id] = (commentCountMap[c.post_id] || 0) + 1;
    });

    const postIds = postsData.map((p) => p.id);
    const { data: likesData } = await supabase
      .from("likes")
      .select("post_id, user_id")
      .in("post_id", postIds);

    const likeCountMap: Record<string, number> = {};
    const userLikesMap: Record<string, boolean> = {};
    (likesData || []).forEach((l) => {
      if (l.post_id) {
        likeCountMap[l.post_id] = (likeCountMap[l.post_id] || 0) + 1;
        if (user && l.user_id === user.id) {
          userLikesMap[l.post_id] = true;
        }
      }
    });

    const memberTypesMap: Record<string, MemberType | null> = {};
    for (const userId of userIds) {
      const { data: memberTypeData } = await supabase.rpc("get_user_member_type", { _user_id: userId });
      if (memberTypeData) memberTypesMap[userId] = memberTypeData as MemberType;
    }

    const threadsWithData: Thread[] = postsData.map((p) => ({
      ...p,
      profiles: profilesMap[p.user_id] || null,
      member_type: memberTypesMap[p.user_id] || null,
      comment_count: commentCountMap[p.id] || 0,
      like_count: likeCountMap[p.id] || 0,
      user_has_liked: userLikesMap[p.id] || false,
    }));

    setThreads(threadsWithData);
    setLoading(false);
  };

  useEffect(() => {
    if (!roleLoading) fetchThreads();

    const channel = supabase
      .channel("community-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => fetchThreads())
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, () => fetchThreads())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, filterCategory, roleLoading]);

  const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Möchtest du diesen Thread wirklich löschen?")) return;
    setDeletingThread(threadId);
    const { error } = await supabase.from("posts").delete().eq("id", threadId);
    if (error) toast.error("Thread konnte nicht gelöscht werden.");
    else { toast.success("Thread gelöscht!"); await fetchThreads(); }
    setDeletingThread(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Bitte wähle eine Bilddatei aus."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Bild darf maximal 5MB groß sein."); return; }
    setNewImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setNewImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setNewImageFile(null);
    setNewImagePreview(null);
    setExistingImageUrl(null);
  };

  const openEditDialog = (thread: Thread) => {
    setEditingThread(thread);
    setNewTitle(thread.title);
    setNewContent(thread.content);
    setNewCategory(thread.category as Category);
    setNewVideoUrl(thread.video_url || "");
    setExistingImageUrl(thread.image_url);
    setNewImageFile(null);
    setNewImagePreview(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingThread(null);
    setNewTitle("");
    setNewContent("");
    setNewCategory("allgemein");
    setNewImageFile(null);
    setNewImagePreview(null);
    setNewVideoUrl("");
    setExistingImageUrl(null);
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Bitte melde dich an."); return; }
    if (!newTitle.trim() || !newContent.trim()) { toast.error("Titel und Inhalt sind erforderlich."); return; }
    if (newVideoUrl && !isValidVideoUrl(newVideoUrl)) { toast.error("Bitte einen gültigen Video-Link eingeben."); return; }

    setCreating(true);
    let imageUrl: string | null = existingImageUrl;

    if (newImageFile) {
      setUploadingImage(true);
      const fileExt = newImageFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("post-images").upload(fileName, newImageFile);
      if (uploadError) { toast.error("Bild konnte nicht hochgeladen werden."); setCreating(false); setUploadingImage(false); return; }
      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
      setUploadingImage(false);
    }

    if (editingThread) {
      const { error } = await supabase.from("posts").update({
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        image_url: imageUrl,
        video_url: newVideoUrl.trim() || null,
      } as any).eq("id", editingThread.id);
      if (error) toast.error("Thread konnte nicht aktualisiert werden.");
      else { toast.success("Thread aktualisiert!"); closeDialog(); }
    } else {
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        image_url: imageUrl,
        video_url: newVideoUrl.trim() || null,
      } as any);
      if (error) toast.error("Thread konnte nicht erstellt werden.");
      else { toast.success("Thread erstellt!"); closeDialog(); }
    }
    setCreating(false);
  };

  const handleLikeThread = async (e: React.MouseEvent, threadId: string, hasLiked: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error("Bitte melde dich an."); return; }
    setLikingThread(threadId);
    if (hasLiked) {
      await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", threadId);
    } else {
      await supabase.from("likes").insert({ user_id: user.id, post_id: threadId });
    }
    setLikingThread(null);
  };

  const getInitials = (name: string | null) => name ? name.slice(0, 2).toUpperCase() : "??";

  const filteredThreads = searchQuery
    ? threads.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : threads;

  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <MessageSquare className="w-7 h-7 text-primary" />
              Community
            </h1>
            <p className="text-muted-foreground mt-1">Forum für die Team Tarek Community</p>
          </div>

          {canPost && (
            <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => { setEditingThread(null); setDialogOpen(true); }}>
                  <Plus className="w-4 h-4" />
                  Neuer Thread
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingThread ? "Thread bearbeiten" : "Neuen Thread erstellen"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateThread} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategorie</Label>
                    <Select value={newCategory} onValueChange={(v) => setNewCategory(v as Category)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kategorie wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Titel</Label>
                    <div className="flex gap-1 items-center">
                      <Input id="title" placeholder="Worum geht es?" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={200} className="flex-1" />
                      <EmojiPicker size="sm" onEmojiSelect={(emoji) => setNewTitle((prev) => prev + emoji)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Inhalt</Label>
                    <div className="relative">
                      <Textarea id="content" placeholder="Dein Beitrag..." value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={5} maxLength={5000} />
                      <div className="absolute bottom-2 right-2">
                        <EmojiPicker size="sm" onEmojiSelect={(emoji) => setNewContent((prev) => prev + emoji)} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Bild (optional)</Label>
                    {(newImagePreview || existingImageUrl) ? (
                      <div className="relative">
                        <img src={newImagePreview || existingImageUrl || ""} alt="Vorschau" className="w-full max-h-48 object-cover rounded" />
                        <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={handleRemoveImage}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <Image className="w-4 h-4" />
                        Bild hinzufügen
                        <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                      </label>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Video URL (optional)</Label>
                    <Input placeholder="https://youtube.com/..." value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} />
                    {newVideoUrl.trim() && isValidVideoUrl(newVideoUrl.trim()) && (
                      <div className="mt-2">
                        <VideoEmbed url={newVideoUrl.trim()} />
                      </div>
                    )}
                    {newVideoUrl.trim() && !isValidVideoUrl(newVideoUrl.trim()) && (
                      <p className="text-xs text-destructive">Ungültiger Video-Link. Unterstützt: YouTube, Vimeo.</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {editingThread ? "Speichern" : "Thread erstellen"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Categories & Search */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Kategorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kategorien</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Threads durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Thread List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-card animate-pulse" />
            ))}
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="bg-card border border-border p-12 text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">Keine Threads gefunden</p>
            <p className="text-sm">Starte die erste Diskussion!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredThreads.map((thread) => (
              <Link
                key={thread.id}
                to={`/community/${thread.id}`}
                className="block bg-card border border-border p-5 hover:border-primary/30 transition-colors"
              >
                <div className="flex gap-4">
                  <Avatar className="w-10 h-10 border border-border flex-shrink-0">
                    <AvatarImage src={thread.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary text-xs">
                      {getInitials(thread.profiles?.display_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 bg-secondary text-muted-foreground uppercase tracking-wider">
                        {getCategoryLabel(thread.category)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg leading-tight mb-1 line-clamp-1">{thread.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{thread.content}</p>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <Link
                        to={`/profil/${thread.user_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-primary transition-colors"
                      >
                        {thread.profiles?.display_name || "Anonym"}
                      </Link>
                      {thread.member_type && (
                        <MemberBadge memberType={thread.member_type} size="sm" />
                      )}
                      <span>
                        {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true, locale: de })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" /> {thread.comment_count}
                      </span>
                      <button
                        onClick={(e) => handleLikeThread(e, thread.id, thread.user_has_liked)}
                        className={`flex items-center gap-1 transition-colors ${thread.user_has_liked ? "text-red-500" : "hover:text-red-500"}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${thread.user_has_liked ? "fill-current" : ""}`} />
                        {thread.like_count}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  {(user?.id === thread.user_id || isAdmin) && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {user?.id === thread.user_id && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditDialog(thread); }}
                          className="p-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteThread(e, thread.id)}
                        disabled={deletingThread === thread.id}
                        className="p-1.5 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityPage;
