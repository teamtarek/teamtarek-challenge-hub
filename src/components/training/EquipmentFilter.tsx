import { EQUIPMENT_TAGS } from "@/lib/workoutLibrary";
import { Badge } from "@/components/ui/badge";
import { Filter } from "lucide-react";

interface EquipmentFilterProps {
  selected: string[];
  onChange: (tags: string[]) => void;
}

const EquipmentFilter = ({ selected, onChange }: EquipmentFilterProps) => {
  const toggle = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter((t) => t !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="w-4 h-4" />
        <span>Equipment Filter</span>
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="text-xs text-primary hover:underline ml-auto"
          >
            Alle zurücksetzen
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {EQUIPMENT_TAGS.map((tag) => (
          <Badge
            key={tag.key}
            variant={selected.includes(tag.key) ? "default" : "outline"}
            className="cursor-pointer select-none transition-colors"
            onClick={() => toggle(tag.key)}
          >
            {tag.label}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default EquipmentFilter;
