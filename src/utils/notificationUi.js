export const notificationBadge = (count) => { const value = Math.max(0, Number(count) || 0); return value === 0 ? '' : value > 99 ? '99+' : String(value); };
export const notificationDestination = (item) => {
  if (item?.derivacion_id) return { pathname: '/whatsapp/recepcion', state: { derivacionId: Number(item.derivacion_id) } };
  if (item?.entidad_tipo === 'CITA_AGENDA') return { pathname: '/citas', state: { citaId: Number(item.entidad_id) } };
  return null;
};
export const INTERNAL_NOTIFICATION_POLL_MS = 15_000;
