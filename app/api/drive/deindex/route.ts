import { getSession } from "@/lib/driveApi";

export async function POST(request: Request) {
  const body = await request.json();
  const { itemId, itemPath } = body as { itemId?: string; itemPath?: string };
  if (!itemId || itemPath === undefined) {
    return new Response("Invalid payload", { status: 400 });
  }

  const { accessToken, knowledgeBaseId } = await getSession();
  if (!knowledgeBaseId) {
    return new Response("Knowledge base not configured", { status: 500 });
  }

  const BACKEND_URL = process.env.NEXT_PUBLIC_STACKAI_BACKEND_URL;
  const pathForQuery = (itemPath as string).replace(/^\//, "") || "";
  const params = new URLSearchParams();
  params.set("resource_path", pathForQuery);
  const url = `${BACKEND_URL}/knowledge_bases/${knowledgeBaseId}/resources?${params.toString()}`;

  const resp = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return new Response(resp.body, {
    status: resp.status,
    headers: resp.headers,
  });
}
