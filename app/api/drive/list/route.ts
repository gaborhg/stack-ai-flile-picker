import { NextResponse } from "next/server";
import {
  getSession,
  mapResourceToDriveItem,
  fetchAllKbIndexedStatus,
} from "../../../../lib/driveApi";
import type { ConnectionResourceResponse } from "../../../../lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { folderId, folderPath, pageSize, cursor } = body as {
      folderId: string;
      folderPath?: string;
      pageSize?: number;
      cursor?: string | null;
    };

    const { accessToken, connectionId, knowledgeBaseId } = await getSession();
    const BACKEND_URL = process.env.NEXT_PUBLIC_STACKAI_BACKEND_URL;
    const API_PREFIX = process.env.NEXT_PUBLIC_STACKAI_API_PREFIX;

    const params = new URLSearchParams();
    if (folderId !== "root") params.set("resource_id", folderId);
    params.set("page_size", String(pageSize ?? 10));
    if (cursor) params.set("cursor", cursor);

    let url = `${BACKEND_URL}${API_PREFIX}/connections/${connectionId}/resources/children`;
    const qs = params.toString();
    if (qs) url = `${url}?${qs}`;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return new Response(text || `Failed to list: ${resp.status}`, {
        status: resp.status,
      });
    }
    const json = await resp.json();
    const resources = (json.data ?? []) as ConnectionResourceResponse[];
    let items = resources.map(mapResourceToDriveItem);

    // If KB is configured and folderPath was provided, merge KB indexed status.
    try {
      if (knowledgeBaseId && folderPath !== undefined) {
        const statusByResourceId = await fetchAllKbIndexedStatus(
          accessToken,
          knowledgeBaseId,
          folderPath,
        );
        items = items.map((item) => {
          const kbStatus =
            statusByResourceId.get(item.id) ||
            statusByResourceId.get(item.name);
          if (kbStatus === undefined) return item;
          return {
            ...item,
            indexed: kbStatus === "indexed",
            status: kbStatus,
          };
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
    }

    return NextResponse.json({ items, nextCursor: json.next_cursor ?? null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(msg || "Server error", { status: 500 });
  }
}
