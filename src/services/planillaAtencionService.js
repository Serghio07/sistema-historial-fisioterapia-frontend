import api from './api';

export const getPlanillasAtencion = async () => {
  const { data } = await api.get('/planillas-atencion');
  return data;
};

export const getPlanillasAtencionPaciente = async (pacienteId) => {
  const { data } = await api.get(`/pacientes/${pacienteId}/planillas-atencion`);
  return data;
};

export const createPlanillaAtencion = async (payload) => {
  const { data } = await api.post('/planillas-atencion', payload);
  return data;
};

export const updatePlanillaAtencion = async (id, payload) => {
  const { data } = await api.put(`/planillas-atencion/${id}`, payload);
  return data;
};

export const deletePlanillaAtencion = async (id) => {
  const { data } = await api.delete(`/planillas-atencion/${id}`);
  return data;
};
