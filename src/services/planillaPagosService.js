import api from './api';

export const getPlanillaPagos = async (params = {}) => (await api.get('/planilla-pagos', { params })).data;
export const createConceptoCobro = async (payload) => (await api.post('/planilla-pagos/conceptos', payload)).data;
export const registerMovimientoPago = async (conceptoId, payload) => (await api.post(`/planilla-pagos/conceptos/${conceptoId}/movimientos`, payload, { successMessage: 'Pago registrado correctamente.' })).data;
export const updateMovimientoPago = async (id, payload) => (await api.put(`/planilla-pagos/movimientos/${id}`, payload, { successMessage: 'Pago actualizado correctamente.' })).data;
export const annulMovimientoPago = async (id, motivo) => (await api.patch(`/planilla-pagos/movimientos/${id}/anular`, { motivo }, { successMessage: 'Movimiento anulado correctamente.' })).data;
export const getMovimientoHistorial = async (id) => (await api.get(`/planilla-pagos/movimientos/${id}/historial`)).data;
export const getArqueosPago = async () => (await api.get('/planilla-pagos/arqueos')).data;
export const saveArqueoPago = async (payload) => (await api.post('/planilla-pagos/arqueos', payload)).data;
export const reopenArqueoPago = async (id, motivo) => (await api.patch(`/planilla-pagos/arqueos/${id}/reabrir`, { motivo })).data;
