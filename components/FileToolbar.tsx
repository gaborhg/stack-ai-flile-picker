import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SortBy, SortDirection } from "@/lib/types";
import SortToggleGroup from "@/components/SortToggleGroup";
import { cn } from "@/lib/utils";

interface FileToolbarProps {
  breadcrumb: { id: string; label: string; path: string }[];
  searchTerm: string;
  sortBy: SortBy | null;
  sortDirection: SortDirection;
  onSearchChange: (value: string) => void;
  onSortByChange: (value: SortBy | null) => void;
  onToggleSortDirection: () => void;
  onBreadcrumbClick: (id: string, path: string) => void;
}

export function FileToolbar({
  breadcrumb,
  searchTerm,
  sortBy,
  sortDirection,
  onSearchChange,
  onSortByChange,
  onToggleSortDirection,
  onBreadcrumbClick,
}: FileToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap sm:self-auto">
        {breadcrumb.map((crumb, index) => {
          const isLast = index === breadcrumb.length - 1;
          return (
            <span key={crumb.id} className="flex items-center gap-1">
              <button
                type="button"
                disabled={isLast}
                onClick={() => onBreadcrumbClick(crumb.id, crumb.path)}
                className={cn(
                  "cursor-pointer rounded px-1 py-0.5 transition-colors",
                  isLast
                    ? "font-medium text-zinc-900 dark:text-zinc-50"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-900",
                )}
              >
                {crumb.label}
              </button>
              {!isLast && <span className="text-zinc-400">/</span>}
            </span>
          );
        })}
      </div>

      <div className="flex flex-col w-full gap-2 sm:flex-row sm:items-center sm:w-auto">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Input
            className="min-w-0 w-full"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 justify-start">
          <SortToggleGroup value={sortBy} onChange={onSortByChange} />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={onToggleSortDirection}
            title="Toggle sort direction"
            disabled={!sortBy}
          >
            {sortDirection === "asc" ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
