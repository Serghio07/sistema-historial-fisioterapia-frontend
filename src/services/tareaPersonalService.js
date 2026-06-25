import api from './api';

export const getTareasPersonal = async () => (await api.get('/tareas-personal')).data;
export const createTareaPersonal = async (payload) => (await api.post('/tareas-personal', payload)).data;
export const updateTareaPersonal = async (id, payload) => (await api.put(`/tareas-personal/${id}`, payload)).data;
export const updateTareaEstado = async (id, estado) => (await api.patch(`/tareas-personal/${id}/estado`, { estado })).data;
export const deleteTareaPersonal = async (id) => (await api.delete(`/tareas-personal/${id}`)).data;
