import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/driveApi";

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
      const text = await putResp.text().catch(() => "");
      return new Response(text || `Failed to update KB: ${putResp.status}`, {
        status: putResp.status,
      });
    }

    // Trigger sync
    const syncUrl = `${BACKEND_URL}/knowledge_bases/sync/trigger/${knowledgeBaseId}/${orgId}`;
    const syncResp = await fetch(syncUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!syncResp.ok) {
      const text = await syncResp.text().catch(() => "");
      return new Response(
        text || `Failed to trigger sync: ${syncResp.status}`,
        { status: syncResp.status },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(msg || "Server error", { status: 500 });
  }
}
