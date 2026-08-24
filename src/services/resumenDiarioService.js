import api from './api';

export const getResumenDiario = async (fechaInicio, seccion = 'resumen', fechaFin = fechaInicio) => (await api.get('/resumen-diario', { params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin, seccion } })).data;
export const createObservacionDiaria = async (payload) => (await api.post('/resumen-diario/observaciones', payload)).data;
export const updateObservacionDiaria = async (id, payload) => (await api.put(`/resumen-diario/observaciones/${id}`, payload)).data;
