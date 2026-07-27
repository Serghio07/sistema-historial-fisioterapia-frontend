export const BOLIVIA_TIME_ZONE = 'America/La_Paz';

const partsFor = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOLIVIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
};

export const boliviaDate = (value = new Date()) => {
  const parts = partsFor(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
};

export const boliviaTime = (value = new Date(), includeSeconds = false) => {
  const parts = partsFor(value);
  if (!parts) return '';
  return `${parts.hour}:${parts.minute}${includeSeconds ? `:${parts.second}` : ''}`;
};

export const boliviaNow = () => ({
  fecha: boliviaDate(),
  hora: boliviaTime(),
  zonaHoraria: BOLIVIA_TIME_ZONE
});

export const formatBoliviaDateTime = (value, options = {}) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: BOLIVIA_TIME_ZONE,
    ...options
  }).format(date);
};
