import { NextResponse } from "next/server";
import { getSession, mapResourceToDriveItem } from "@/lib/driveApi";
import type { ConnectionResourceResponse } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { folderId, pageSize, cursor } = body as {
      folderId: string;
      folderPath?: string;
      pageSize?: number;
      cursor?: string | null;
    };

    const { accessToken, connectionId } = await getSession();
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
      return new Response(`Failed to list: ${resp.status}`, {
        status: resp.status,
      });
    }
    const json = await resp.json();
    const items = ((json.data ?? []) as ConnectionResourceResponse[]).map(
      mapResourceToDriveItem,
    );

    return NextResponse.json({ items, nextCursor: json.next_cursor ?? null });
  } catch  {
    return new Response("Server error", { status: 500 });
  }
}
