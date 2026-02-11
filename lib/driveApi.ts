import type {
  ConnectionResourceResponse,
  DriveItem,
  KbResourceStatus,
} from "./types";

const SUPABASE_AUTH_URL = process.env.NEXT_PUBLIC_STACKAI_AUTH_URL;
const BACKEND_URL = process.env.NEXT_PUBLIC_STACKAI_BACKEND_URL;
const API_PREFIX = process.env.NEXT_PUBLIC_STACKAI_API_PREFIX;
const ANON_KEY = process.env.STACKAI_ANON_KEY;
const STACKAI_EMAIL = process.env.STACKAI_EMAIL;
const STACKAI_PASSWORD = process.env.STACKAI_PASSWORD;
const KNOWLEDGE_BASE_ID = process.env.NEXT_PUBLIC_STACKAI_KB_ID;

type StackAiSession = {
  accessToken: string;
  orgId: string;
  connectionId: string;
  knowledgeBaseId: string | undefined;
};

type KbResourceItem = {
  resource_id: string;
  status?: KbResourceStatus | null;
  indexed_at?: string | null;
  inode_path?: { path?: string };
  inode_type?: string;
  inode_id?: string;
  [key: string]: unknown;
};

let sessionPromise: Promise<StackAiSession> | null = null;

async function createSession(): Promise<StackAiSession> {
  if (!STACKAI_PASSWORD) {
    throw new Error(
      "StackAI password is not configured. Set NEXT_PUBLIC_STACKAI_PASSWORD in your environment.",
    );
  }

  if (!ANON_KEY) {
    throw new Error(
      "Public anon key is not configured. Set NEXT_PUBLIC_STACKAI_ANON_KEY in your environment.",
    );
  }

  if (!STACKAI_EMAIL) {
    throw new Error(
      "StackAI email is not configured. Set NEXT_PUBLIC_STACKAI_EMAIL in your environment.",
    );
  }

  /**
   * Authentication: get access token using Supabase Auth (email/password flow).
   */
  const authResponse = await fetch(
    `${SUPABASE_AUTH_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Apikey: ANON_KEY,
      },
      body: JSON.stringify({
        email: STACKAI_EMAIL,
        password: STACKAI_PASSWORD,
        gotrue_meta_security: {},
      }),
    },
  );

  if (!authResponse.ok) {
    const txt = await authResponse.text().catch(() => "");
    throw new Error(
      `Failed to authenticate with StackAI. Status=${authResponse.status} Body=${txt}`,
    );
  }

  const authJson = (await authResponse.json()) as { access_token: string };
  const accessToken = authJson.access_token;
  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  const orgResponse = await fetch(`${BACKEND_URL}/organizations/me/current`, {
    headers: authHeaders,
  });
  if (!orgResponse.ok) {
    const txt = await orgResponse.text().catch(() => "");
    throw new Error(
      `Failed to fetch current organization from StackAI. Status=${orgResponse.status} Body=${txt}`,
    );
  }
  const orgJson = (await orgResponse.json()) as { org_id: string };

  const connectionsResponse = await fetch(
    `${BACKEND_URL}${API_PREFIX}/connections?connection_provider=gdrive&limit=1`,
    { headers: authHeaders },
  );
  if (!connectionsResponse.ok) {
    const txt = await connectionsResponse.text().catch(() => "");
    throw new Error(
      `Failed to fetch Google Drive connections from StackAI. Status=${connectionsResponse.status} Body=${txt}`,
    );
  }

  const connectionsJson = (await connectionsResponse.json()) as {
    data?: Array<{ connection_id: string }>;
  };
  const connections = connectionsJson.data ?? [];
  if (connections.length === 0) {
    throw new Error("No Google Drive connections found for this account.");
  }

  return {
    accessToken,
    orgId: orgJson.org_id,
    connectionId: connections[0]!.connection_id,
    knowledgeBaseId: KNOWLEDGE_BASE_ID,
  };
}

export async function getSession(): Promise<StackAiSession> {
  if (!sessionPromise) {
    sessionPromise = createSession().catch((err) => {
      // clear cached promise on failure so callers can retry after fixes
      sessionPromise = null;
      throw err;
    });
  }
  return sessionPromise;
}

/**
 * Maps a ConnectionResourceResponse from the backend to a DriveItem used in the frontend.
 */
export function mapResourceToDriveItem(
  resource: ConnectionResourceResponse,
): DriveItem {
  const rawPath: string =
    resource.inode_path?.path ??
    (typeof resource.path === "string" ? resource.path : "/");

  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

  const segments = path.split("/").filter(Boolean);
  const name = segments.length ? segments[segments.length - 1] : path || "/";

  const type = resource.inode_type === "directory" ? "folder" : "file";

  const modifiedAtRaw =
    resource.modified_at ??
    resource.updated_at ??
    resource.created_at ??
    new Date().toISOString();

  return {
    id: resource.resource_id,
    name,
    type,
    parentId: null,
    path,
    modifiedAt: modifiedAtRaw,
    indexed: false,
    status: "not_indexed",
  };
}

/**
 * Fetches which resources are indexed in the Knowledge Base for a given path.
 * This version will iterate over cursor pages and return a map of resource_id -> status.
 */
export async function fetchAllKbIndexedStatus(
  accessToken: string,
  knowledgeBaseId: string,
  resourcePath: string,
): Promise<Record<string, KbResourceStatus>> {
  const result: Record<string, KbResourceStatus> = {};
  let cursor: string | null = null;
  const pathForQuery =
    resourcePath === "" || resourcePath === "/"
      ? "/"
      : resourcePath.replace(/^\//, "");

  do {
    const params = new URLSearchParams();
    params.set("resource_path", pathForQuery);
    if (cursor) params.set("cursor", cursor);
    params.set("_t", String(Date.now()));
    const url = `${BACKEND_URL}/knowledge_bases/${knowledgeBaseId}/resources/children?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
    if (!response.ok) break;
    const json = (await response.json()) as {
      data?: KbResourceItem[];
      next_cursor?: string | null;
    };
    const data = json.data ?? [];
    for (const item of data) {
      const id = item?.resource_id;
      if (!id) continue;
      if (item.inode_type === "directory") {
        const inodeId = item.inode_id;
        if (inodeId) {
          const status: KbResourceStatus = item.indexed_at
            ? "indexed"
            : "pending";
          result[inodeId] = status;
        }
      } else {
        const status: KbResourceStatus = item.indexed_at
          ? "indexed"
          : (item.status ?? "pending");
        result[id] = status;
      }
    }
    cursor = json.next_cursor ?? null;
  } while (cursor);

  return result;
}

async function putKbUpdate(
  accessToken: string,
  knowledgeBaseId: string,
  body: {
    connection_id: string;
    connection_source_ids: string[];
    website_sources: unknown[];
    indexing_params: Record<string, unknown>;
  },
): Promise<void> {
  const url = `${BACKEND_URL}/knowledge_bases/${knowledgeBaseId}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to update Knowledge Base: ${response.status} ${text}`,
    );
  }
}

async function triggerKbSync(
  accessToken: string,
  knowledgeBaseId: string,
  orgId: string,
): Promise<void> {
  const url = `${BACKEND_URL}/knowledge_bases/sync/trigger/${knowledgeBaseId}/${orgId}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to trigger KB sync: ${response.status}`);
  }
}

/**
 * Sync the Knowledge Base with the given list of resource IDs (frontend local KB state).
 */
export async function syncKb(connectionSourceIds: string[]): Promise<void> {
  const { accessToken, orgId, knowledgeBaseId } = await getSession();
  if (!knowledgeBaseId) {
    throw new Error(
      "Knowledge Base ID not configured. Set NEXT_PUBLIC_STACKAI_KB_ID.",
    );
  }
  // Overwrite the KB configuration with the selected source IDs.
  const { connectionId } = await getSession();
  await putKbUpdate(accessToken, knowledgeBaseId, {
    connection_id: connectionId,
    connection_source_ids: connectionSourceIds,
    website_sources: [],
    indexing_params: {},
  });
  await triggerKbSync(accessToken, knowledgeBaseId, orgId);
}

/**
 * Remove a resource from the Knowledge Base (de-index).
 */
export async function deindexItem(
  id: string,
  resourcePath: string,
): Promise<DriveItem> {
  const { accessToken, knowledgeBaseId } = await getSession();
  if (!knowledgeBaseId) {
    throw new Error(
      "Knowledge Base ID not configured. Set NEXT_PUBLIC_STACKAI_KB_ID.",
    );
  }

  const pathForQuery = resourcePath.replace(/^\//, "") || "";
  const params = new URLSearchParams();
  params.set("resource_path", pathForQuery);
  const url = `${BACKEND_URL}/knowledge_bases/${knowledgeBaseId}/resources?${params.toString()}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to de-index resource: ${response.status} ${text}`);
  }

  return {
    id,
    name: "",
    type: "file",
    parentId: null,
    path: resourcePath,
    modifiedAt: new Date().toISOString(),
    indexed: false,
    status: "deindexed",
  };
}
