import api from './api';

export const getDocumentosClinicos = async (params = {}) => {
  const { data } = await api.get('/documentos-clinicos', { params });
  return data;
};

export const getDocumentoClinico = async (id) => {
  const { data } = await api.get(`/documentos-clinicos/${id}`);
  return data;
};

export const getDocumentosPaciente = async (pacienteId) => {
  const { data } = await api.get('/documentos-clinicos', { params: { paciente_id: pacienteId } });
  return data;
};

export const getDatosPacienteDocumento = async (pacienteId) => {
  const { data } = await api.get(`/documentos-clinicos/autocompletar/${pacienteId}`);
  return data;
};

export const createDocumentoClinico = async (payload) => {
  const { data } = await api.post('/documentos-clinicos', payload);
  return data;
};

export const updateDocumentoClinico = async (id, payload) => {
  const { data } = await api.put(`/documentos-clinicos/${id}`, payload);
  return data;
};

export const deleteDocumentoClinico = async (id) => {
  const { data } = await api.delete(`/documentos-clinicos/${id}`);
  return data;
};
