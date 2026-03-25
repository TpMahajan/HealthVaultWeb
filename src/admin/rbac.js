export const ADMIN_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  PRODUCT_ADMIN: "PRODUCT_ADMIN",
  SOS_ADMIN: "SOS_ADMIN",
  SUPPORT_ADMIN: "SUPPORT_ADMIN",
  USER_ADMIN: "USER_ADMIN",
};

export const ADMIN_PERMISSIONS = {
  MANAGE_PRODUCTS: "MANAGE_PRODUCTS",
  MANAGE_ORDERS: "MANAGE_ORDERS",
  VIEW_SOS: "VIEW_SOS",
  HANDLE_SOS: "HANDLE_SOS",
  VIEW_TICKETS: "VIEW_TICKETS",
  REPLY_TICKETS: "REPLY_TICKETS",
  VIEW_AUDIT_LOGS: "VIEW_AUDIT_LOGS",
  VIEW_SECURITY_ALERTS: "VIEW_SECURITY_ALERTS",
};

export const ROLE_PERMISSION_MAP = {
  [ADMIN_ROLES.SUPER_ADMIN]: Object.values(ADMIN_PERMISSIONS),
  [ADMIN_ROLES.PRODUCT_ADMIN]: [
    ADMIN_PERMISSIONS.MANAGE_PRODUCTS,
    ADMIN_PERMISSIONS.MANAGE_ORDERS,
  ],
  [ADMIN_ROLES.SOS_ADMIN]: [
    ADMIN_PERMISSIONS.VIEW_SOS,
    ADMIN_PERMISSIONS.HANDLE_SOS,
  ],
  [ADMIN_ROLES.SUPPORT_ADMIN]: [
    ADMIN_PERMISSIONS.VIEW_TICKETS,
    ADMIN_PERMISSIONS.REPLY_TICKETS,
  ],
  [ADMIN_ROLES.USER_ADMIN]: [
    ADMIN_PERMISSIONS.VIEW_AUDIT_LOGS,
    ADMIN_PERMISSIONS.VIEW_SECURITY_ALERTS,
  ],
};

export const normalizePermissionList = (permissions = []) =>
  [...new Set((Array.isArray(permissions) ? permissions : [])
    .map((entry) => String(entry || "").trim().toUpperCase())
    .filter(Boolean))];

export const hasPermission = (admin, permission) => {
  const role = String(admin?.role || "").toUpperCase();
  if (role === ADMIN_ROLES.SUPER_ADMIN) return true;
  const granted = new Set(normalizePermissionList(admin?.permissions));
  return granted.has(String(permission || "").toUpperCase());
};

export const canAccessAny = (admin, permissions = []) =>
  permissions.some((permission) => hasPermission(admin, permission));
