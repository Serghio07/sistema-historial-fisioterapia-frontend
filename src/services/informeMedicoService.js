import api from './api';

export const getInformesMedicos = async () => {
  const { data } = await api.get('/informes-medicos');
  return data;
};

export const createInformeMedico = async (payload) => {
  const { data } = await api.post('/informes-medicos', payload);
  return data;
};

export const updateInformeMedico = async (id, payload) => {
  const { data } = await api.put(`/informes-medicos/${id}`, payload);
  return data;
};

export const deleteInformeMedico = async (id) => {
  const { data } = await api.delete(`/informes-medicos/${id}`);
  return data;
};
