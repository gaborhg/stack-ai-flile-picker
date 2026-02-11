import type { DriveItem } from "./types";

export type FolderPage = { items: DriveItem[]; nextCursor?: string | null };
export type DeindexVariables = { itemId: string; itemPath: string };

type KbStatusByResourceId = Record<string, string>;
const kbStatusCache = new Map<string, KbStatusByResourceId>();

export function clearKbStatusCache(folderPath?: string): void {
  if (folderPath) {
    kbStatusCache.delete(folderPath);
    return;
  }
  kbStatusCache.clear();
}

async function getKbStatusByFolderPath(
  folderPath: string,
): Promise<KbStatusByResourceId | null> {
  const cached = kbStatusCache.get(folderPath);
  if (cached) {
    return cached;
  }

  const kbResp = await fetch("/api/drive/kb-status", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ folderPath }),
  });
  if (!kbResp.ok) {
    return null;
  }
  const kbJson = await kbResp.json();
  const statusObj: KbStatusByResourceId = kbJson.statusByResourceId ?? {};
  kbStatusCache.set(folderPath, statusObj);
  return statusObj;
}

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
    throw new Error(`Failed to list folder contents`);
  }
  const json = (await resp.json()) as FolderPage;

  if (folderPath !== undefined) {
    const statusObj = await getKbStatusByFolderPath(folderPath);
    if (statusObj) {
      const merged = json.items.map((item) => {
        const status = statusObj[item.id] ?? statusObj[item.name];
        return { ...item, indexed: status === "indexed", status } as DriveItem;
      });
      return { items: merged, nextCursor: json.nextCursor };
    }
  }

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
