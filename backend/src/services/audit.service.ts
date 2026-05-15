import { supabase } from '../utils/supabase';

/**
 * Log a critical system action
 */
export async function logAudit(params: {
  userId?: string;
  adminId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddr?: string;
}) {
  const { userId, adminId, action, resource, resourceId, details, ipAddr } = params;

  await supabase.from('moderation_logs').insert({
    admin_id: adminId || userId,
    action: `${resource}:${action}`,
    target_id: resourceId,
    target_type: resource,
    details: {
      ...details,
      ip_addr: ipAddr
    }
  });
}
