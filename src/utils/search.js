export const normalizeSearch = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es-BO')
  .trim();

export const matchesSearch = (value, query) => {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const searchable = normalizeSearch(value);
  return words.every((word) => searchable.includes(word));
};
