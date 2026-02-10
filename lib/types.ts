export type InodeType = "directory" | "file";

export interface InodePath {
  /**
   * Full path within the connection, e.g. "/papers/another folder/file.txt".
   * Mirrors the `inode_path.path` field from the StackAI API.
   */
  path: string;
}

/** Knowledge-base resource status from GET .../resources/children. */
export type KbResourceStatus = "indexed" | "pending" | "not_indexed";

/** UI / drive item status (indexing state). */
export type ResourceStatus =
  | "pending"
  | "indexed"
  | "failed"
  | "deindexed"
  | "not_indexed";

/**
 * Minimal shape of a connection resource as returned by the StackAI
 * connections resources endpoints.
 */
export interface ApiConnectionResource {
  resource_id: string;
  inode_type: InodeType;
  inode_path: InodePath;
}

/**
 * Connection resources/children response item (may include optional timestamp fields).
 */
export interface ConnectionResourceResponse extends ApiConnectionResource {
  modified_at?: string;
  updated_at?: string;
  created_at?: string;
  path?: string;
}

/** Sort field for folder contents list. */
export type SortBy = "name" | "modifiedAt";

/** Sort direction. */
export type SortDirection = "asc" | "desc";

/**
 * Internal representation of a drive item used by the UI and mock API.
 *
 * This is intentionally close to the real API while still being convenient
 * for a folderId-based navigation model.
 */
export type ItemType = "file" | "folder";

export interface DriveItem {
  /**
   * Unique identifier of the item. In the real API this maps to `resource_id`.
   */
  id: string;
  /**
   * Display name of the item, e.g. the last segment of the path.
   */
  name: string;
  /**
   * File vs directory. For the real API this comes from `inode_type`.
   */
  type: ItemType;
  /**
   * Parent folder identifier. `null` means the item lives at the root level
   * of the connection.
   */
  parentId: string | null;
  /**
   * Normalized POSIX-style path for display, e.g. "/papers/notes.txt".
   */
  path: string;
  /**
   * ISO 8601 timestamp used for sorting by date.
   */
  modifiedAt: string;
  /**
   * High-level indexing flag derived from the underlying knowledge-base
   * resource status.
   */
  indexed: boolean;
  /**
   * More detailed status mirroring the knowledge base resource, e.g.
   * "pending" | "indexed".
   */
  status?: ResourceStatus;
}
