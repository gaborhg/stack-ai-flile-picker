import type { DriveItem } from "./types";

type FolderPage = { items: DriveItem[]; nextCursor?: string | null };

type ListRequest = {
  folderId: string;
  folderPath?: string;
  pageSize?: number;
  cursor?: string | null | undefined;
};

export async function listFolderContentsPage(
  folderId: string,
  folderPath?: string,
  opts?: { pageSize?: number; cursor?: string | null },
): Promise<FolderPage> {
  const body: ListRequest = {
    folderId,
    folderPath,
    pageSize: opts?.pageSize ?? 200,
    cursor: opts?.cursor ?? undefined,
  };

  const resp = await fetch("/api/drive/list", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Failed to list folder contents: ${resp.status} ${text}`);
  }
  const json = (await resp.json()) as FolderPage;
  return json;
}

export async function syncKb(connectionSourceIds: string[]): Promise<void> {
  const resp = await fetch("/api/drive/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ connectionSourceIds }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Failed to sync KB: ${resp.status} ${text}`);
  }
}

export type DeindexVariables = { itemId: string; itemPath: string };
export async function deindexItem(
  itemId: string,
  itemPath: string,
): Promise<DriveItem> {
  const resp = await fetch("/api/drive/deindex", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ itemId, itemPath }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Failed to deindex item: ${resp.status} ${text}`);
  }
  return {
    id: itemId,
    name: "",
    type: "file",
    parentId: null,
    path: itemPath,
    modifiedAt: new Date().toISOString(),
    indexed: false,
    status: "deindexed",
  } as DriveItem;
}
