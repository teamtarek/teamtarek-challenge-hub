import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Header } from "@/components/Header";
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
import { MessageSquare, Plus, Loader2, ArrowLeft, Heart, Search, Image, Video, X, Pencil, Lock, Trash2 } from "lucide-react";
import { VideoEmbed, isValidVideoUrl } from "@/components/VideoEmbed";
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
  comment_count: number;
  like_count: number;
  user_has_liked: boolean;
}

const CommunityPage = () => {
  const { user } = useAuth();
  const { canAccessCoachesCorner, isAdmin, loading: roleLoading } = useUserRole();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("outdoor-training");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [filterCategory, setFilterCategory] = useState<Category | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [likingPost, setLikingPost] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);

  // Available categories based on user role
  const availableCategories = CATEGORIES.filter(
    (cat) => cat.value !== "coaches-corner" || canAccessCoachesCorner
  );

  const fetchPosts = async () => {
    let query = supabase
      .from("posts")
      .select("id, title, content, created_at, user_id, category, image_url, video_url")
      .order("created_at", { ascending: false });

    if (filterCategory !== "all") {
      query = query.eq("category", filterCategory);
    }

    const { data: postsData, error } = await query as { 
      data: { id: string; title: string; content: string; created_at: string; user_id: string; category: string; image_url: string | null; video_url: string | null }[] | null; 
      error: any 
    };

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

    const commentCountMap: Record<string, number> = {};
    (commentCounts || []).forEach((c) => {
      commentCountMap[c.post_id] = (commentCountMap[c.post_id] || 0) + 1;
    });

    // Fetch like counts for posts
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

    // Filter out coaches-corner posts if user doesn't have access
    const filteredPostsData = postsData.filter(
      (p) => p.category !== "coaches-corner" || canAccessCoachesCorner
    );

    const postsWithData: Post[] = filteredPostsData.map((p) => ({
      ...p,
      category: p.category as Category,
      image_url: p.image_url,
      video_url: p.video_url,
      profiles: profilesMap[p.user_id] || null,
      comment_count: commentCountMap[p.id] || 0,
      like_count: likeCountMap[p.id] || 0,
      user_has_liked: userLikesMap[p.id] || false,
    }));

    setPosts(postsWithData);
    setLoading(false);
  };

  useEffect(() => {
    if (!roleLoading) {
      fetchPosts();
    }

    // Subscribe to realtime updates
    const channel = supabase
      .channel("posts-likes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => fetchPosts()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "likes" },
        () => fetchPosts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, filterCategory, canAccessCoachesCorner, roleLoading]);

  const handleDeletePost = async (e: React.MouseEvent, postId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm("Möchtest du diesen Beitrag wirklich löschen?")) return;
    
    setDeletingPost(postId);
    
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);
    
    if (error) {
      toast.error("Beitrag konnte nicht gelöscht werden.");
    } else {
      toast.success("Beitrag gelöscht!");
      await fetchPosts();
    }
    
    setDeletingPost(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte wähle eine Bilddatei aus.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bild darf maximal 5MB groß sein.");
      return;
    }

    setNewImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setNewImageFile(null);
    setNewImagePreview(null);
    setExistingImageUrl(null);
  };

  const openEditDialog = (post: Post) => {
    setEditingPost(post);
    setNewTitle(post.title);
    setNewContent(post.content);
    setNewCategory(post.category);
    setNewVideoUrl(post.video_url || "");
    setExistingImageUrl(post.image_url);
    setNewImageFile(null);
    setNewImagePreview(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingPost(null);
    setNewTitle("");
    setNewContent("");
    setNewCategory("outdoor-training");
    setNewImageFile(null);
    setNewImagePreview(null);
    setNewVideoUrl("");
    setExistingImageUrl(null);
  };

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

    if (newVideoUrl && !isValidVideoUrl(newVideoUrl)) {
      toast.error("Bitte gib einen gültigen YouTube- oder Vimeo-Link ein.");
      return;
    }

    setCreating(true);

    let imageUrl: string | null = existingImageUrl;

    // Upload image if a new one is selected
    if (newImageFile) {
      setUploadingImage(true);
      const fileExt = newImageFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("post-images")
        .upload(fileName, newImageFile);

      if (uploadError) {
        toast.error("Bild konnte nicht hochgeladen werden.");
        setCreating(false);
        setUploadingImage(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);

      imageUrl = urlData.publicUrl;
      setUploadingImage(false);
    }

    if (editingPost) {
      // Update existing post
      const { error } = await supabase
        .from("posts")
        .update({
          title: newTitle.trim(),
          content: newContent.trim(),
          category: newCategory,
          image_url: imageUrl,
          video_url: newVideoUrl.trim() || null,
        } as any)
        .eq("id", editingPost.id);

      if (error) {
        toast.error("Beitrag konnte nicht aktualisiert werden.");
      } else {
        toast.success("Beitrag aktualisiert!");
        closeDialog();
      }
    } else {
      // Create new post
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        image_url: imageUrl,
        video_url: newVideoUrl.trim() || null,
      } as any);

      if (error) {
        toast.error("Beitrag konnte nicht erstellt werden.");
      } else {
        toast.success("Beitrag erstellt!");
        closeDialog();
      }
    }
    setCreating(false);
  };

  const handleLikePost = async (e: React.MouseEvent, postId: string, hasLiked: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error("Bitte melde dich an, um zu liken.");
      return;
    }

    setLikingPost(postId);

    if (hasLiked) {
      // Remove like
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", postId);

      if (error) {
        toast.error("Like konnte nicht entfernt werden.");
      }
    } else {
      // Add like
      const { error } = await supabase.from("likes").insert({
        user_id: user.id,
        post_id: postId,
      });

      if (error) {
        toast.error("Like konnte nicht gesetzt werden.");
      }
    }

    setLikingPost(null);
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

          <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => { setEditingPost(null); setDialogOpen(true); }}>
                  <Plus className="w-4 h-4" />
                  Neuer Beitrag
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPost ? "Beitrag bearbeiten" : "Neuen Beitrag erstellen"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreatePost} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategorie</Label>
                    <Select value={newCategory} onValueChange={(v) => setNewCategory(v as Category)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kategorie wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCategories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                            {cat.value === "coaches-corner" && " 🔒"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                      rows={4}
                      maxLength={5000}
                    />
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label>Bild (optional)</Label>
                    {(newImagePreview || existingImageUrl) ? (
                      <div className="relative">
                        <img
                          src={newImagePreview || existingImageUrl || ""}
                          alt="Vorschau"
                          className="w-full max-h-48 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8"
                          onClick={handleRemoveImage}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                          id="image-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => document.getElementById("image-upload")?.click()}
                        >
                          <Image className="w-4 h-4 mr-2" />
                          Bild auswählen
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Video URL */}
                  <div className="space-y-2">
                    <Label htmlFor="video-url">Video-Link (optional)</Label>
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Input
                        id="video-url"
                        placeholder="YouTube oder Vimeo Link..."
                        value={newVideoUrl}
                        onChange={(e) => setNewVideoUrl(e.target.value)}
                      />
                    </div>
                    {newVideoUrl && isValidVideoUrl(newVideoUrl) && (
                      <div className="mt-2">
                        <VideoEmbed url={newVideoUrl} />
                      </div>
                    )}
                  </div>

                  <Button type="submit" disabled={creating || uploadingImage} className="w-full">
                    {creating || uploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {uploadingImage ? "Bild wird hochgeladen..." : editingPost ? "Aktualisieren..." : "Erstellen..."}
                      </>
                    ) : (
                      editingPost ? "Beitrag aktualisieren" : "Beitrag erstellen"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Category Filter */}
          <div className="space-y-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Beiträge durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filterCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterCategory("all")}
              >
                Alle
              </Button>
              {availableCategories.map((cat) => (
                <Button
                  key={cat.value}
                  variant={filterCategory === cat.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterCategory(cat.value)}
                  className="gap-1"
                >
                  {cat.label}
                  {cat.value === "coaches-corner" && <Lock className="w-3 h-3" />}
                </Button>
              ))}
            </div>
          </div>

          {(() => {
            const filteredPosts = posts.filter((post) => {
              if (!searchQuery.trim()) return true;
              const query = searchQuery.toLowerCase();
              return (
                post.title.toLowerCase().includes(query) ||
                post.content.toLowerCase().includes(query)
              );
            });

            if (loading) {
              return (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-32 bg-secondary animate-pulse rounded-lg"
                    />
                  ))}
                </div>
              );
            }

            if (filteredPosts.length === 0) {
              return (
                <div className="text-center py-16 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{searchQuery ? "Keine Beiträge gefunden." : "Noch keine Beiträge vorhanden."}</p>
                  <p className="text-sm mt-1">
                    {searchQuery ? "Versuche einen anderen Suchbegriff." : "Sei der Erste und starte eine Diskussion!"}
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {filteredPosts.map((post) => (
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
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {getCategoryLabel(post.category)}
                        </span>
                        {post.image_url && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground flex items-center gap-1">
                            <Image className="w-3 h-3" /> Bild
                          </span>
                        )}
                        {post.video_url && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground flex items-center gap-1">
                            <Video className="w-3 h-3" /> Video
                          </span>
                        )}
                        {(user && post.user_id === user.id) && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openEditDialog(post);
                            }}
                            className="text-xs px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground flex items-center gap-1 transition-colors"
                          >
                            <Pencil className="w-3 h-3" /> Bearbeiten
                          </button>
                        )}
                        {(isAdmin || (user && post.user_id === user.id)) && (
                          <button
                            onClick={(e) => handleDeletePost(e, post.id)}
                            disabled={deletingPost === post.id}
                            className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center gap-1 transition-colors"
                          >
                            {deletingPost === post.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            Löschen
                          </button>
                        )}
                      </div>
                      <h2 className="font-semibold text-lg truncate">
                        {post.title}
                      </h2>
                      <p className="text-muted-foreground text-sm line-clamp-2 mt-1">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <Link 
                          to={`/profil/${post.user_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-primary transition-colors"
                        >
                          {post.profiles?.display_name || "Anonym"}
                        </Link>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(post.created_at), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </span>
                        <span>•</span>
                        <button
                          onClick={(e) => handleLikePost(e, post.id, post.user_has_liked)}
                          disabled={likingPost === post.id}
                          className={`flex items-center gap-1 transition-colors ${
                            post.user_has_liked 
                              ? "text-red-500" 
                              : "hover:text-red-500"
                          }`}
                        >
                          <Heart 
                            className={`w-4 h-4 ${post.user_has_liked ? "fill-current" : ""}`} 
                          />
                          {post.like_count}
                        </button>
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
            );
          })()}
        </div>
      </main>
    </div>
  );
};

export default CommunityPage;
