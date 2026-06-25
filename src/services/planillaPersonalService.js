import api from './api';

export const getPlanillasPersonal = async () => {
  const { data } = await api.get('/planillas-personal');
  return data;
};

export const getPlanillaPeriodo = async (anio, mes) => {
  try {
    const { data } = await api.get(`/planillas-personal/periodo/${anio}/${mes}`);
    return data;
  } catch (error) {
    if (error.message === 'No existe planilla para este periodo.') return null;
    throw error;
  }
};

export const createPlanillaPersonal = async (payload) => {
  const { data } = await api.post('/planillas-personal', payload);
  return data;
};

export const updatePlanillaPersonal = async (id, payload) => {
  const { data } = await api.put(`/planillas-personal/${id}`, payload);
  return data;
};
