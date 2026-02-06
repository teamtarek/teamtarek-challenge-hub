import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    setOpen(false);
  };

  const getNotificationText = (n: typeof notifications[0]) => {
    const actor = n.actor_name || "Jemand";
    const postTitle = n.post_title
      ? n.post_title.length > 30
        ? n.post_title.slice(0, 30) + "…"
        : n.post_title
      : "deinem Thread";

    if (n.type === "thread_reply") {
      return `${actor} hat auf „${postTitle}" geantwortet`;
    }
    return `${actor} hat auf deinen Kommentar geantwortet`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">Benachrichtigungen</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Check className="w-3 h-3" />
              Alle gelesen
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Keine Benachrichtigungen
            </div>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                to={n.post_id ? `/community/${n.post_id}` : "/community"}
                onClick={() => handleNotificationClick(n)}
                className={`block px-4 py-3 border-b border-border last:border-0 hover:bg-accent/50 transition-colors ${
                  !n.is_read ? "bg-accent/20" : ""
                }`}
              >
                <p className="text-sm leading-snug">
                  {!n.is_read && (
                    <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2 flex-shrink-0" />
                  )}
                  {getNotificationText(n)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: de })}
                </p>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
