"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { SortBy } from "@/lib/types";

interface Props {
  value: SortBy | null;
  onChange: (value: SortBy | null) => void;
}

export function SortToggleGroup({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">Sort by:</span>
      <ToggleGroup
        type="single"
        size="sm"
        variant="outline"
        spacing={0}
        value={value ?? undefined}
        onValueChange={(v) => {
          const next = (v as SortBy) ?? null;
          if (next === value) onChange(null);
          else onChange(next);
        }}
      >
        <ToggleGroupItem value="name">Name</ToggleGroupItem>
        <ToggleGroupItem value="modifiedAt">Modified</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export default SortToggleGroup;
