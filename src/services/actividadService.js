import api from './api';

export const getActividades = async (fecha) => {
  const { data } = await api.get('/actividades', { params: fecha ? { fecha } : {} });
  return data;
};
