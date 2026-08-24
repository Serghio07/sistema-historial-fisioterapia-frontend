import api from './api';

const base = '/finanzas/movimientos-caja';
export const getMovimientosCaja = async (params = {}) => (await api.get(base, { params })).data;
export const getResumenMovimientosCaja = async (params = {}) => (await api.get(`${base}/resumen`, { params })).data;
export const getSaldoCaja = async (fecha) => (await api.get(`${base}/saldo`, { params: { fecha } })).data;
export const getMovimientoCaja = async (id) => (await api.get(`${base}/${id}`)).data;
export const createMovimientoCaja = async (payload) => (await api.post(base, payload, { successMessage: 'Movimiento registrado correctamente.' })).data;
export const annulMovimientoCaja = async (id, motivo) => (await api.post(`${base}/${id}/anular`, { motivo }, { successMessage: 'Movimiento anulado correctamente.' })).data;
