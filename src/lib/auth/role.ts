export type AppRole = 'owner' | 'vendor' | 'admin';
export function resolveRole(data: any): AppRole {
  if (typeof data?.role === 'string' && ['owner','vendor','admin'].includes(data.role)) return data.role;
  if (Array.isArray(data?.roles)) {
    if (data.roles.includes('admin')) return 'admin';
    if (data.roles.includes('vendor')) return 'vendor';
    if (data.roles.includes('owner')) return 'owner';
  }
  return 'owner';
}
