import { useMutation, useQuery, useInfiniteQuery } from "@tanstack/react-query";
import type { InfiniteData, QueryFunctionContext } from "@tanstack/react-query";
import { deindexItem, listFolderContentsPage, syncKb } from "./driveClient";
import type { DriveItem } from "./types";

export const folderContentsKey = (folderId: string, folderPath?: string) =>
  ["folderContents", folderId, folderPath ?? ""] as const;

export type FolderPage = { items: DriveItem[]; nextCursor?: string | null };

export function useFolderContentsInfinite(
  folderId: string,
  folderPath?: string,
  opts?: { pageSize?: number },
) {
  return useInfiniteQuery<
    FolderPage,
    Error,
    InfiniteData<FolderPage>,
    ReturnType<typeof folderContentsKey>,
    string | null
  >({
    queryKey: folderContentsKey(folderId, folderPath),
    queryFn: (
      context: QueryFunctionContext<
        ReturnType<typeof folderContentsKey>,
        string | null
      >,
    ) => {
      const pageParam = context.pageParam as string | null | undefined;
      return listFolderContentsPage(folderId, folderPath, {
        pageSize: opts?.pageSize ?? 200,
        cursor: pageParam ?? undefined,
      });
    },
    getNextPageParam: (lastPage: FolderPage) =>
      lastPage.nextCursor ?? undefined,
    initialPageParam: null,
  });
}

/** Sync the Knowledge Base with the given list of resource IDs (frontend local KB state). */
export function useSyncKbMutation() {
  return useMutation<void, Error, string[]>({
    mutationFn: (connectionSourceIds) => syncKb(connectionSourceIds),
  });
}

export type DeindexVariables = { itemId: string; itemPath: string };

/** Remove a resource from the KB (DELETE). Caller updates local state and cache on success. */
export function useDeindexItemMutation() {
  return useMutation<DriveItem, Error, DeindexVariables>({
    mutationFn: ({ itemId, itemPath }) => deindexItem(itemId, itemPath),
  });
}
