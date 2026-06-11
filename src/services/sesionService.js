import api from './api';

export const getSesiones = async () => {
  const { data } = await api.get('/sesiones');
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

export const deleteSesion = async (id) => {
  const { data } = await api.delete(`/sesiones/${id}`);
  return data;
};
