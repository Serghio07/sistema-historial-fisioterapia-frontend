import api from './api';

export const getPacientes = async ({ includeTemporales = false } = {}) => {
  const { data } = await api.get('/pacientes');
  return includeTemporales ? data : data.filter((paciente) => paciente.estado === true && paciente.registro_pendiente !== true);
};

export const getPaciente = async (id) => {
  const { data } = await api.get(`/pacientes/${id}`);
  return data;
};
export const getPacientesPendientesWhatsapp = async () => (await api.get('/pacientes/pendientes-whatsapp')).data;

export const getResumenPaciente = async (id) => {
  const { data } = await api.get(`/pacientes/${id}/resumen`);
  return data;
};

export const auditResumenPaciente = async (id, tipo) => {
  await api.post(`/pacientes/${id}/resumen/auditoria`, { tipo });
};

export const createPaciente = async (payload) => {
  const { data } = await api.post('/pacientes', payload);
  return data;
};

export const createPacienteWithContacts = async (paciente, contactos) => {
  const { data } = await api.post('/pacientes/con-contactos', { paciente, contactos });
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
