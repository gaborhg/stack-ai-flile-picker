import { NextResponse } from "next/server";
import { getSession } from "@/lib/driveApi";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { connectionSourceIds } = body as { connectionSourceIds: string[] };
    if (!Array.isArray(connectionSourceIds)) {
      return new Response("Invalid payload", { status: 400 });
    }

    const { accessToken, orgId, connectionId, knowledgeBaseId } =
      await getSession();
    if (!knowledgeBaseId) {
      return new Response("Knowledge base not configured", { status: 500 });
    }

    const BACKEND_URL = process.env.NEXT_PUBLIC_STACKAI_BACKEND_URL;

    // Update KB config (PUT)
    const putUrl = `${BACKEND_URL}/knowledge_bases/${knowledgeBaseId}`;
    const putResp = await fetch(putUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        connection_id: connectionId,
        connection_source_ids: connectionSourceIds,
        website_sources: [],
        indexing_params: {},
      }),
    });
    if (!putResp.ok) {
      return new Response("Failed to update KB", {
        status: putResp.status,
      });
    }

    // Trigger sync
    const syncUrl = `${BACKEND_URL}/knowledge_bases/sync/trigger/${knowledgeBaseId}/${orgId}`;
    const syncResp = await fetch(syncUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!syncResp.ok) {
      return new Response(
        "Failed to trigger sync",
        { status: syncResp.status },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return new Response("Server error", { status: 500 });
  }
}
