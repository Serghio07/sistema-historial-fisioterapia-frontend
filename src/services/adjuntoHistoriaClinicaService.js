import api from './api';

export const getAdjuntosHistoria = async (historiaId) => (await api.get(`/historias-clinicas/${historiaId}/adjuntos`)).data;
export const getConteosAdjuntosHistoria = async () => (await api.get('/adjuntos-historia/conteos')).data;

export const createAdjuntosHistoria = async (historiaId, pacienteId, items) => {
  const data = new FormData();
  data.append('paciente_id', pacienteId);
  items.forEach((item) => data.append('archivos', item.file));
  data.append('metadatos', JSON.stringify(items.map(({ file: _file, ...metadata }) => metadata)));
  return (await api.post(`/historias-clinicas/${historiaId}/adjuntos`, data, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
};

export const getArchivoAdjunto = async (id) => (await api.get(`/adjuntos-historia/${id}/archivo`, { responseType: 'blob' })).data;
export const downloadArchivoAdjunto = async (id) => (await api.get(`/adjuntos-historia/${id}/descargar`, { responseType: 'blob' })).data;
export const deleteAdjuntoHistoria = async (id) => (await api.delete(`/adjuntos-historia/${id}`)).data;
