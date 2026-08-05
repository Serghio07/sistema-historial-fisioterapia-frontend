import api from './api';
export const getNotificaciones = async (params = {}) => (await api.get('/notificaciones', { params })).data;
export const getNotificacionesRecientes = async (limit = 5) => (await api.get('/notificaciones/recientes', { params: { limit } })).data;
export const getResumenNotificaciones = async () => (await api.get('/notificaciones/resumen')).data;
export const marcarNotificacionLeida = async (id) => (await api.patch(`/notificaciones/${id}/leer`)).data;
export const marcarTodasNotificacionesLeidas = async () => (await api.patch('/notificaciones/leer-todas')).data;
