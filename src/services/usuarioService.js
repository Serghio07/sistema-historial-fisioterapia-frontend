import api from './api';

export const getUsuarios = async () => {
  const { data } = await api.get('/usuarios');
  return data;
};

export const createUsuario = async (payload) => {
  const { data } = await api.post('/usuarios', payload);
  return data;
};

export const updateUsuario = async (id, payload) => {
  const { data } = await api.put(`/usuarios/${id}`, payload);
  return data;
};

export const updateUsuarioEstado = async (id, estado) => {
  const { data } = await api.patch(`/usuarios/${id}/estado`, { estado });
  return data;
};

export const deleteUsuario = async (id) => {
  const { data } = await api.delete(`/usuarios/${id}`);
  return data;
};
