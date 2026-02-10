import { describe, it, expect } from "vitest";
import { mapResourceToDriveItem } from "../lib/driveApi";
import type { ConnectionResourceResponse } from "../lib/types";

describe("mapResourceToDriveItem", () => {
  it("maps connection resource to DriveItem with defaults", () => {
    const resource = {
      resource_id: "r1",
      inode_type: "directory",
      inode_path: { path: "/foo/bar" },
      modified_at: "2024-01-01T00:00:00.000Z",
    } as unknown as ConnectionResourceResponse;

    const item = mapResourceToDriveItem(resource);
    expect(item.id).toBe("r1");
    expect(item.type).toBe("folder");
    expect(item.path).toBe("/foo/bar");
    expect(item.name).toBe("bar");
    expect(item.modifiedAt).toBe("2024-01-01T00:00:00.000Z");
  });
});
