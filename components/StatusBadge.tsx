import { Badge, type BadgeVariant } from "@/components/ui/badge";
import type { DriveItem } from "@/lib/types";

function getLabelAndVariant(item: DriveItem): {
  label: string;
  variant: BadgeVariant;
} {
  if (item.status === "pending") {
    return { label: "Pending", variant: "secondary" };
  }
  if (item.indexed) {
    return { label: "Indexed", variant: "success" };
  }
  if (item.status === "deindexed") {
    return { label: "De-indexed", variant: "destructive" };
  }
  return { label: "Not indexed", variant: "outline" };
}

export function StatusBadge({ item }: { item: DriveItem }) {
  const { label, variant } = getLabelAndVariant(item);
  return <Badge variant={variant}>{label}</Badge>;
}
