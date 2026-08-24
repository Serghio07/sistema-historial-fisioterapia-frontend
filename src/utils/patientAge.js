import { boliviaDate } from './boliviaDateTime.js';

export const isMinorByBirthDate = (birthDate, today = boliviaDate()) => {
  if (!birthDate) return false;
  const birth = new Date(`${birthDate}T00:00:00`);
  const current = new Date(`${today}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(current.getTime()) || birth > current) return false;
  let age = current.getFullYear() - birth.getFullYear();
  const beforeBirthday = current.getMonth() < birth.getMonth()
    || (current.getMonth() === birth.getMonth() && current.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age < 18;
};
