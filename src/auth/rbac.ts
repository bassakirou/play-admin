export type RBACAction = "create" | "read" | "update" | "delete" | "manage";
export type RBACResource =
  | "song"
  | "video"
  | "album"
  | "user"
  | "role"
  | "genre"
  | "artist";

export type Permission = { id?: string; action: string; resource: string };

export function canAccess(
  roleName?: string,
  permissions?: Permission[] | null,
  action?: RBACAction,
  resource?: RBACResource,
) {
  if (!action || !resource) return true;
  if (roleName === "ADMIN" || roleName === "SUPER_ADMIN") return true;
  // 1. Si les permissions sont chargées depuis la DB, la liste DB est la source de vérité absolue
  if (Array.isArray(permissions)) {
    return permissions.some(
      (p) => p.action === action && p.resource === resource,
    );
  }
  const matrix: Record<string, Array<[RBACAction, RBACResource]>> = {
    EDITOR: [
      ["create", "song"], ["read", "song"], ["update", "song"], ["delete", "song"], ["manage", "song"],
      ["create", "video"], ["read", "video"], ["update", "video"], ["delete", "video"], ["manage", "video"],
      ["create", "album"], ["read", "album"], ["update", "album"], ["delete", "album"], ["manage", "album"],
      ["create", "artist"], ["read", "artist"], ["update", "artist"], ["delete", "artist"], ["manage", "artist"],
      ["create", "genre"], ["read", "genre"], ["update", "genre"], ["delete", "genre"], ["manage", "genre"],
    ],
    CREATOR: [
      ["create", "song"],
      ["update", "song"],
      ["read", "song"],
      ["create", "video"],
      ["update", "video"],
      ["read", "video"],
      ["read", "album"],
    ],
    LABEL: [
      ["manage", "artist"],
      ["create", "album"],
      ["update", "album"],
      ["read", "album"],
      ["create", "video"],
      ["update", "video"],
      ["read", "video"],
      ["read", "song"],
      ["read", "genre"],
    ],
    USER: [
      ["read", "song"],
      ["read", "video"],
      ["read", "album"],
      ["read", "genre"],
    ],
  };
  const allowed = matrix[roleName || ""] || [];
  return allowed.some(([a, r]) => a === action && r === resource);
}

export const ALL_PERMISSIONS: Permission[] = [
  "song",
  "video",
  "album",
  "artist",
  "genre",
  "user",
  "role",
].flatMap((resource) =>
  ["create", "read", "update", "delete", "manage"].map((action) => ({
    action,
    resource,
  })),
);
