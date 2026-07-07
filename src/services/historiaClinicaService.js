import api from './api';

export const getHistoriasClinicas = async () => {
  const { data } = await api.get('/historias-clinicas');
  return data;
};

export const getHistoriaClinica = async (id) => {
  const { data } = await api.get(`/historias-clinicas/${id}`);
  return data;
};

export const createHistoriaClinica = async (payload) => {
  const { data } = await api.post('/historias-clinicas', payload);
  return data;
};

export const updateHistoriaClinica = async (id, payload) => {
  const { data } = await api.put(`/historias-clinicas/${id}`, payload);
  return data;
};

export const deleteHistoriaClinica = async (id, payload = {}) => {
  const { data } = await api.delete(`/historias-clinicas/${id}`, { data: payload });
  return data;
};

export const restoreHistoriaClinica = async (id) => {
  const { data } = await api.patch(`/historias-clinicas/${id}/restaurar`);
  return data;
};
