import api from './api';

export const getPersonal = async () => {
  const { data } = await api.get('/personal');
  return data;
};

export const createPersonal = async (payload) => {
  const { data } = await api.post('/personal', payload);
  return data;
};

export const updatePersonal = async (id, payload) => {
  const { data } = await api.put(`/personal/${id}`, payload);
  return data;
};

export const updatePersonalEstado = async (id, estado) => {
  const { data } = await api.patch(`/personal/${id}/estado`, { estado });
  return data;
};
