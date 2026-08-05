import { boliviaTime } from '../../utils/boliviaDateTime.js';

export const greetingForBolivia = (date = new Date()) => {
  const hour = Number(boliviaTime(date).slice(0, 2));
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour >= 12 && hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

export const firstNameForUser = (user) => {
  const value = user?.ficha_personal?.nombres || user?.nombres || user?.nombre || user?.nombre_mostrado || user?.usuario || '';
  const parts = String(value).trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  while (parts.length && /^(doc|dra|dr|ft|lic|prof)\.?$/iu.test(parts[0])) parts.shift();
  return parts[0] || '';
};
