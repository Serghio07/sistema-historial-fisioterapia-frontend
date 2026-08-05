export const notificationBadge = (count) => { const value = Math.max(0, Number(count) || 0); return value === 0 ? '' : value > 99 ? '99+' : String(value); };
export const notificationDestination = (item) => item?.derivacion_id ? { pathname: '/whatsapp/recepcion', state: { derivacionId: Number(item.derivacion_id) } } : null;
export const INTERNAL_NOTIFICATION_POLL_MS = 60_000;
