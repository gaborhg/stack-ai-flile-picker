import { NextResponse } from "next/server";
import { getSession, fetchAllKbIndexedStatus } from "@/lib/driveApi";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({} as { folderPath?: string }));
    const { folderPath } = body as { folderPath?: string };
    const { accessToken, knowledgeBaseId } = await getSession();
    if (!knowledgeBaseId) {
      return new Response("Knowledge Base not configured", { status: 400 });
    }

      const statusByResourceId = await fetchAllKbIndexedStatus(
        accessToken,
        knowledgeBaseId,
        folderPath ?? "",
      );

      return NextResponse.json({ statusByResourceId });
  } catch  {
    return new Response("Server error", { status: 500 });
  }
}
