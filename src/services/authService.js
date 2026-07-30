import api from './api';

export const loginRequest = async (credentials) => {
  const { data } = await api.post('/auth/login', credentials);
  return data;
};

export const accessRequest = async (payload) => {
  const { data } = await api.post('/auth/solicitar-acceso', payload);
  return data;
};

export const saveSession = ({ usuario }) => {
  localStorage.setItem('physio_user', JSON.stringify(usuario));
};

export const getStoredUser = () => {
  const raw = localStorage.getItem('physio_user');
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem('physio_user');
    return null;
  }
};

export const clearSession = () => {
  localStorage.removeItem('physio_user');
  api.post('/auth/logout', undefined, { hideErrorToast: true }).catch(() => {});
};
