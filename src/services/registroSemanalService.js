import api from './api';

export const getRegistrosSemanales = async () => {
  const { data } = await api.get('/sesiones-semanales');
  return data;
};

export const createRegistroSemanal = async (payload) => {
  const { data } = await api.post('/sesiones-semanales', payload);
  return data;
};

export const updateRegistroSemanal = async (id, payload) => {
  const { data } = await api.put(`/sesiones-semanales/${id}`, payload);
  return data;
};

export const deleteRegistroSemanal = async (id) => {
  const { data } = await api.delete(`/sesiones-semanales/${id}`);
  return data;
};
