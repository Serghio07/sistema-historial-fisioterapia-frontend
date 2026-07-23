import api from './api';

export const getResumenDiario = async (fecha, seccion = 'resumen') => (await api.get('/resumen-diario', { params: { fecha, seccion } })).data;
export const createObservacionDiaria = async (payload) => (await api.post('/resumen-diario/observaciones', payload)).data;
export const updateObservacionDiaria = async (id, payload) => (await api.put(`/resumen-diario/observaciones/${id}`, payload)).data;
