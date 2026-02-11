"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from "react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { FileToolbar } from "@/components/FileToolbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  folderContentsKey,
  useDeindexItemMutation,
  useFolderContentsInfinite,
  useSyncKbMutation,
  type FolderPage,
} from "@/lib/queries";
import { clearKbStatusCache } from "@/lib/driveClient";
import type { InfiniteData } from "@tanstack/react-query";
import { VirtualizedFileList } from "@/components/VirtualizedFileList";
import type { DriveItem, SortBy, SortDirection } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";

type BreadcrumbEntry = { id: string; label: string; path: string };

const ROOT_ID = "root";
const ROOT_PATH = "";

export function FilePicker() {
  const [currentFolderId, setCurrentFolderId] = useState<string>(ROOT_ID);
  const [currentFolderPath, setCurrentFolderPath] = useState<string>(ROOT_PATH);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([
    { id: ROOT_ID, label: "My Drive", path: ROOT_PATH },
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortBy | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Local KB: set of resource IDs the user has marked for indexing (or loaded from server).
  const [localKbIds, setLocalKbIds] = useState<Set<string>>(new Set());
  // Item for which the "Remove from KB" confirm modal is open.
  const [pendingRemoveItem, setPendingRemoveItem] = useState<DriveItem | null>(
    null,
  );

  const queryClient = useQueryClient();
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFolderContentsInfinite(currentFolderId, currentFolderPath, {
    pageSize: 10,
  });
  const syncMutation = useSyncKbMutation();
  const deindexMutation = useDeindexItemMutation();

  // Merge server state into local KB: items that are indexed or pending go into local KB.
  useEffect(() => {
    if (!data) return;
    const flatItems = data.pages.flatMap((p: FolderPage) => p.items ?? []);
    startTransition(() => {
      setLocalKbIds((prev) => {
        const next = new Set(prev);
        for (const item of flatItems) {
          if (item.indexed || item.status === "pending") {
            next.add(item.id);
          }
        }
        return next;
      });
    });
  }, [data]);

  const handleOpenFolder = (item: DriveItem) => {
    setCurrentFolderId(item.id);
    const path = item.path.replace(/^\//, "") || "";
    setCurrentFolderPath(path);
    setBreadcrumb((previous) => [
      ...previous,
      { id: item.id, label: item.name, path },
    ]);
  };

  const handleBreadcrumbClick = (id: string, path: string) => {
    if (id === currentFolderId) return;
    setCurrentFolderId(id);
    setCurrentFolderPath(path);
    setBreadcrumb((previous) => {
      const index = previous.findIndex((entry) => entry.id === id);
      if (index === -1) return previous;
      return previous.slice(0, index + 1);
    });
  };

  const isInKb = useCallback(
    (item: DriveItem) => localKbIds.has(item.id),
    [localKbIds],
  );

  const handleToggleKb = useCallback((item: DriveItem) => {
    if (item.status === "pending") return;
    setLocalKbIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }, []);

  const handleRemoveClick = useCallback((item: DriveItem) => {
    setPendingRemoveItem(item);
  }, []);

  const handleConfirmRemove = useCallback(() => {
    if (!pendingRemoveItem) return;
    const item = pendingRemoveItem;
    const key = folderContentsKey(currentFolderId, currentFolderPath);
    deindexMutation.mutate(
      { itemId: item.id, itemPath: item.path },
      {
        onSuccess: () => {
          setLocalKbIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
          queryClient.setQueryData(
            key,
            (previous: InfiniteData<FolderPage> | undefined) => {
              if (!previous) return previous;
              const pages = previous.pages?.map((page) => {
                const items = (page.items ?? []).map((i: DriveItem) =>
                  i.id === item.id
                    ? { ...i, indexed: false, status: "deindexed" as const }
                    : i,
                );
                return { ...page, items };
              });
              return { ...previous, pages };
            },
          );
          setPendingRemoveItem(null);
        },
      },
    );
  }, [
    currentFolderId,
    currentFolderPath,
    deindexMutation,
    pendingRemoveItem,
    queryClient,
  ]);

  const handleCancelRemove = useCallback(() => {
    setPendingRemoveItem(null);
  }, []);

  const handleSync = useCallback(() => {
    const key = folderContentsKey(currentFolderId, currentFolderPath);
    queryClient.setQueryData(
      key,
      (previous: InfiniteData<FolderPage> | undefined) => {
        if (!previous) return previous;
        const pages = previous.pages?.map((page) => {
          const items = (page.items ?? []).map((item: DriveItem) =>
            localKbIds.has(item.id) && !item.indexed && item.status !== "pending"
              ? { ...item, status: "pending" as const }
              : item,
          );
          return { ...page, items };
        });
        return { ...previous, pages };
      },
    );

    syncMutation.mutate(Array.from(localKbIds));
  }, [
    localKbIds,
    syncMutation,
    queryClient,
    currentFolderId,
    currentFolderPath,
  ]);

  const flatItems = useMemo(() => {
    if (!data) return [] as DriveItem[];
    const items: DriveItem[] = data.pages.flatMap(
      (p: FolderPage) => p.items ?? [],
    );
    let filtered = items;
    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(query),
      );
    }

    if (sortBy) {
      filtered.sort((a, b) => {
        const comparison =
          sortBy === "name"
            ? a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
            : new Date(a.modifiedAt).getTime() -
              new Date(b.modifiedAt).getTime();
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }
    return filtered;
  }, [data, searchTerm, sortBy, sortDirection]);

  const selectedCount = localKbIds.size;

  return (
    <div className="flex flex-col px-4 py-4">
      <Card className="w-full max-w-5xl self-center">
        <CardHeader className="shrink-0">
          <CardTitle>StackAI File Picker</CardTitle>
          <CardDescription>
            Browse your Google Drive connection, pick files and folders to
            index, or remove already represented items from your knowledge base.
          </CardDescription>
        </CardHeader>
        <div className="w-full border-b border-border" />
        <CardContent className="flex min-h-0 flex-col gap-4 overflow-hidden pt-1 pb-4">
          <FileToolbar
            breadcrumb={breadcrumb}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortByChange={setSortBy}
            onToggleSortDirection={() =>
              setSortDirection((previous) =>
                previous === "asc" ? "desc" : "asc",
              )
            }
            onBreadcrumbClick={(id, path) => handleBreadcrumbClick(id, path)}
          />
          <div className="scroll-area min-h-0 relative">
            <VirtualizedFileList
              items={flatItems}
              isLoading={isLoading}
              isError={isError}
              fetchNextPage={fetchNextPage}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onOpenFolder={handleOpenFolder}
              isInKb={isInKb}
              onToggleKb={handleToggleKb}
              onRemove={handleRemoveClick}
            />
          </div>
          <footer className="flex shrink-0 items-center justify-end gap-2 pt-4 relative z-10">
            <Button
              type="button"
              size="sm"
              variant="outline"
              title="Refetches the current folder. Your selections remain preserved."
              onClick={() => {
                clearKbStatusCache(currentFolderPath);
                queryClient.removeQueries({
                  queryKey: folderContentsKey(
                    currentFolderId,
                    currentFolderPath,
                  ),
                });
                refetch({ cancelRefetch: false });
              }}
            >
              Reload directory
            </Button>

            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={handleSync}
              disabled={syncMutation.isPending || selectedCount === 0}
              title={`Updates the content of the knowledge base with the currently selected items.`}
            >
              Select files {selectedCount > 0 ? ` (${selectedCount})` : ""}
            </Button>
          </footer>
          <ConfirmModal
            open={pendingRemoveItem !== null}
            title="Remove from Knowledge Base?"
            message={`This action will remove the selected item from your knowledge base. Name: ${pendingRemoveItem?.name ?? ""}`}
            confirmLabel="Remove"
            cancelLabel="Cancel"
            onConfirm={handleConfirmRemove}
            onCancel={handleCancelRemove}
            isConfirming={deindexMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
