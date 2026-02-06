import { useState } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const EMOJI_CATEGORIES = [
  {
    label: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😋", "😜", "🤪", "😎", "🤓", "🧐", "😏", "😌", "😴", "🤤", "😷", "🤒", "🤕", "🤢", "🤮"],
  },
  {
    label: "Gesten",
    emojis: ["👍", "👎", "👊", "✊", "🤛", "🤜", "👏", "🙌", "🤝", "💪", "🙏", "✌️", "🤟", "🤘", "👌", "🤙", "👋", "🖐️", "✋", "👆", "👇", "👈", "👉", "🫡", "🫶", "❤️‍🔥"],
  },
  {
    label: "Sport",
    emojis: ["🏋️", "🏃", "🚴", "🧗", "🤸", "🏊", "⛹️", "🤾", "🏌️", "🧘", "🥇", "🥈", "🥉", "🏆", "🎯", "💯", "🔥", "⚡", "💥", "✨", "🌟", "⭐", "🎉", "🎊", "👑", "🦾"],
  },
  {
    label: "Natur",
    emojis: ["🌞", "🌈", "🌊", "🏔️", "🌲", "🌿", "☀️", "⛅", "🌧️", "❄️", "💧", "🍀", "🌻", "🌺", "🐾", "🦅"],
  },
  {
    label: "Essen",
    emojis: ["🍎", "🍌", "🥑", "🥦", "🍗", "🥩", "🍳", "🥗", "🍕", "🍔", "☕", "🧃", "💊", "🧬"],
  },
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  size?: "sm" | "default";
}

export const EmojiPicker = ({ onEmojiSelect, size = "default" }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  const handleSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={size === "sm" ? "icon" : "icon"}
          className={size === "sm" ? "h-8 w-8" : "h-10 w-10"}
          title="Emoji einfügen"
        >
          <Smile className={size === "sm" ? "w-4 h-4" : "w-5 h-5"} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-2"
        align="start"
        side="top"
        sideOffset={8}
      >
        {/* Category tabs */}
        <div className="flex gap-1 mb-2 border-b border-border pb-2 overflow-x-auto">
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={cat.label}
              type="button"
              onClick={() => setActiveCategory(i)}
              className={`text-xs px-2 py-1 rounded whitespace-nowrap transition-colors ${
                activeCategory === i
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Emoji grid */}
        <div className="grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
          {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleSelect(emoji)}
              className="p-1.5 text-xl hover:bg-secondary rounded transition-colors text-center leading-none"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
