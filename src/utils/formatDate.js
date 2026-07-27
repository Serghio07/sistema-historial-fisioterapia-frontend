import { BOLIVIA_TIME_ZONE } from './boliviaDateTime';

export const formatDate = (date) => {
  if (!date) return 'Sin fecha';
  const value = String(date);
  const normalized = value.includes('T') ? value : `${value}T12:00:00-04:00`;
  const parsedDate = new Date(normalized);
  if (Number.isNaN(parsedDate.getTime())) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-BO', {
    timeZone: BOLIVIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(parsedDate);
};
