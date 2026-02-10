"use client";

import { useCallback, useRef, useEffect, type HTMLAttributes } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { DriveItem } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, File as FileIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  items: DriveItem[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage?: boolean | undefined;
  isFetchingNextPage?: boolean | undefined;
  fetchNextPage?: () => void;
  onOpenFolder: (item: DriveItem) => void;
  isInKb: (item: DriveItem) => boolean;
  onToggleKb: (item: DriveItem) => void;
  onRemove: (item: DriveItem) => void;
}

export function VirtualizedFileList({
  items,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onOpenFolder,
  isInKb,
  onToggleKb,
  onRemove,
}: Props) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowHeight = 56;

  const visibleRows = 8;
  const placeholderCount = isFetchingNextPage ? 3 : 0;
  const totalCount = items.length + placeholderCount;

  const getViewportElement = (
    root?: HTMLDivElement | null,
  ): HTMLDivElement | null => {
    if (!root) return null;
    const vp = root.querySelector('[data-slot="scroll-area-viewport"]');
    if (vp && vp instanceof HTMLDivElement) return vp;
    return root instanceof HTMLDivElement ? root : null;
  };

  const rowVirtualizer = useVirtualizer<HTMLDivElement, Element>({
    count: totalCount,
    getScrollElement: () => getViewportElement(parentRef.current),
    estimateSize: useCallback(() => rowHeight, []),
    overscan: 0,
  });

  const containerHeight = rowHeight * visibleRows;

  const rowVirtualizerRef = useRef<ReturnType<
    typeof useVirtualizer<HTMLDivElement, Element>
  > | null>(null);
  useEffect(() => {
    rowVirtualizerRef.current = rowVirtualizer;
  }, [rowVirtualizer]);

  const loadMoreIfNeeded = useCallback(() => {
    if (!fetchNextPage || !hasNextPage || isFetchingNextPage) return;
    // If using shadcn ScrollArea, the actual scroll element is the viewport inside the root.
    const root = parentRef.current;
    const el = getViewportElement(root);
    if (el) {
      const distanceFromBottom =
        el.scrollHeight - (el.scrollTop ?? 0) - el.clientHeight;
      if (distanceFromBottom <= 100) fetchNextPage();
      return;
    }
    const virtualItems = rowVirtualizerRef.current?.getVirtualItems() ?? [];
    const lastIndex = virtualItems[virtualItems.length - 1]?.index ?? 0;
    const threshold = 2;
    if (lastIndex >= Math.max(0, items.length - threshold)) fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, items.length]);

  useEffect(() => {
    const root = parentRef.current;
    if (!root) return;
    const scrollEl = getViewportElement(root) ?? root;
    const onScroll = () => loadMoreIfNeeded();
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", onScroll);
  }, [loadMoreIfNeeded]);

  if (isError) {
    return (
      <div className="p-4 text-sm text-red-700">
        Error loading files. Try reloading.
      </div>
    );
  }

  const virtualItems = rowVirtualizer.getVirtualItems();

  const skeletonBase = "rounded bg-zinc-100 dark:bg-slate-800 animate-pulse";

  const Skeleton = ({
    className = "",
    ...props
  }: HTMLAttributes<HTMLDivElement>) => (
    <div {...props} className={`${skeletonBase} ${className}`} />
  );

  const SkeletonRow = ({ top, height }: { top: number; height: number }) => (
    <div
      style={{ top, height }}
      className="absolute left-0 w-full border-b border-zinc-200 dark:border-zinc-800"
    >
      <div className="h-full px-3 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <Skeleton className="inline-block mr-2 h-4 w-4" />
            <Skeleton className="h-4 w-60" />
          </div>
        </div>

        <div className="hidden sm:block w-30">
          <Skeleton className="h-4 w-20" />
        </div>

        <div className="hidden sm:block w-20">
          <Skeleton className="h-4 w-20" />
        </div>

        <div className="w-20 flex justify-end flex-shrink-0 pr-3">
          <Skeleton className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800 mr-2">
        <div className="flex items-center gap-2 px-3 h-9 font-medium text-sm">
          <div className="flex-1">Name</div>
          <div className="hidden sm:block w-30">Modified</div>
          <div className="hidden sm:block w-20 flex-shrink-0">Status</div>
          <div className="w-20 flex justify-end" />
        </div>
      </div>

      <ScrollArea
        ref={parentRef}
        className="rounded-none"
        style={{ height: containerHeight }}
      >
        <div
          style={{
            height: isLoading ? containerHeight : rowVirtualizer.getTotalSize(),
          }}
          className="relative mr-2"
        >
          {isLoading
            ? Array.from({ length: visibleRows }).map((_, i) => {
                const top = i * rowHeight;
                return <SkeletonRow key={i} top={top} height={rowHeight} />;
              })
            : virtualItems.map((virtualRow) => {
                const index = virtualRow.index;
                const top = virtualRow.start;
                const isPlaceholder = index >= items.length;

                if (isPlaceholder) {
                  return (
                    <SkeletonRow
                      key={virtualRow.key}
                      top={top}
                      height={virtualRow.size}
                    />
                  );
                }

                const item = items[index];
                if (!item) return null;
                const folder = item.type === "folder";
                const date = new Date(item.modifiedAt);
                const formattedDate = isNaN(date.getTime())
                  ? "-"
                  : date.toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                    });

                return (
                  <div
                    key={virtualRow.key}
                    style={{ top, height: virtualRow.size }}
                    className="absolute left-0 w-full flex items-center gap-2 px-3 border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-slate-800 cursor-pointer"
                    onClick={() => {
                      if (item.status === "pending") return;
                      if (item.indexed) onRemove(item);
                      else onToggleKb(item);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        title={item.name}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (folder) onOpenFolder(item);
                        }}
                        className={
                          (folder
                            ? "font-medium text-left hover:underline cursor-pointer"
                            : "text-left") +
                          " select-text block truncate max-w-full"
                        }
                      >
                        {folder ? (
                          <Folder className="inline-block mr-2 h-4 w-4" />
                        ) : (
                          <FileIcon className="inline-block mr-2 h-4 w-4" />
                        )}
                        {item.name}
                      </button>
                    </div>

                    <div className="hidden sm:block w-30 text-sm text-zinc-500">
                      <span
                        className="cursor-default"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {formattedDate}
                      </span>
                    </div>

                    <div
                      className="hidden sm:block w-20 cursor-default"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <StatusBadge item={item} />
                    </div>

                    <div className="w-20 flex justify-end flex-shrink-0 pr-3">
                      <Checkbox
                        checked={item.indexed || isInKb(item)}
                        disabled={item.status === "pending"}
                        onCheckedChange={() => {
                          if (item.indexed) onRemove(item);
                          else onToggleKb(item);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                );
              })}
        </div>
      </ScrollArea>
    </div>
  );
}

export default VirtualizedFileList;
