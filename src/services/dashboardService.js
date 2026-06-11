import api from './api';

export const getDashboardResumen = async () => {
  const { data } = await api.get('/dashboard/resumen');
  return data;
};

export const getDashboardProximasCitas = async () => {
  const { data } = await api.get('/dashboard/proximas-citas');
  return data;
};

export const getDashboardSesionesHoy = async () => {
  const { data } = await api.get('/dashboard/sesiones-hoy');
  return data;
};

export const getDashboardPacientesRecientes = async () => {
  const { data } = await api.get('/dashboard/pacientes-recientes');
  return data;
};
