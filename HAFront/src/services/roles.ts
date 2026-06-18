const ADMIN_ROLES = ["ADMIN", "ADMINISTRADOR", "SUPER_ADMIN"];

export function isAdminRole(roleName: string | undefined | null): boolean {
  if (!roleName) return false;
  return ADMIN_ROLES.includes(roleName.toUpperCase());
}