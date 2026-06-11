export const formatDate = (date) => {
  if (!date) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(`${date}T00:00:00`));
};
