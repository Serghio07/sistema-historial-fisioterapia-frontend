import api from './api';

export const getSesiones = async ({ incluirAnuladas = false } = {}) => {
  const { data } = await api.get('/sesiones', { params: incluirAnuladas ? { incluir_anuladas: true } : undefined });
  return data;
};

export const createSesion = async (payload) => {
  const { data } = await api.post('/sesiones', payload);
  return data;
};

export const updateSesion = async (id, payload) => {
  const { data } = await api.put(`/sesiones/${id}`, payload);
  return data;
};

export const deleteSesion = async (id, payload = {}) => {
  const { data } = await api.delete(`/sesiones/${id}`, { data: payload });
  return data;
};
