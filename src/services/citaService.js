import api from './api';

export const getCitas = async (params = {}) => {
  const { data } = await api.get('/citas', { params });
  return data;
};

export const getCitasCalendario = async (params = {}) => {
  const { data } = await api.get('/citas/calendario', { params });
  return data;
};

export const getCitasPaciente = async (pacienteId) => {
  const { data } = await api.get(`/pacientes/${pacienteId}/citas`);
  return data;
};

export const createCita = async (payload) => {
  const { data } = await api.post('/citas', payload);
  return data;
};

export const updateCita = async (id, payload) => {
  const { data } = await api.put(`/citas/${id}`, payload);
  return data;
};

export const updateCitaEstado = async (id, estado) => {
  const { data } = await api.patch(`/citas/${id}/estado`, { estado });
  return data;
};

export const deleteCita = async (id) => {
  const { data } = await api.delete(`/citas/${id}`);
  return data;
};

export const getProgramacionHistoria = async (historiaId) => {
  const { data } = await api.get(`/citas/programacion/historia/${historiaId}`);
  return data;
};

export const validarDisponibilidadCita = async (payload) => {
  const { data } = await api.post('/citas/disponibilidad', payload, {
    hideErrorToast: true,
    showSuccessToast: false
  });
  return data;
};

export const createProgramacionHistoria = async (historiaId, programaciones) => {
  const { data } = await api.post(`/citas/programacion/historia/${historiaId}`, { programaciones });
  return data;
};

export const removeSessionFromProgramacion = async (historiaId) => {
  const { data } = await api.post(`/citas/programacion/historia/${historiaId}/reducir`);
  return data;
};
