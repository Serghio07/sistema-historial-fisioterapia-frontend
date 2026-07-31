import api from './api';

export const getNotificaciones = async () => {
  const { data } = await api.get('/dashboard/notificaciones');
  return Array.isArray(data) ? data : [];
};
