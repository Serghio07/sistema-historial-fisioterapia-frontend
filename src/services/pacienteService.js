import api from './api';

export const getPacientes = async () => {
  const { data } = await api.get('/pacientes');
  return data;
};

export const getPaciente = async (id) => {
  const { data } = await api.get(`/pacientes/${id}`);
  return data;
};

export const createPaciente = async (payload) => {
  const { data } = await api.post('/pacientes', payload);
  return data;
};

export const updatePaciente = async (id, payload) => {
  const { data } = await api.put(`/pacientes/${id}`, payload);
  return data;
};

export const deactivatePaciente = async (id) => {
  const { data } = await api.delete(`/pacientes/${id}`);
  return data;
};
