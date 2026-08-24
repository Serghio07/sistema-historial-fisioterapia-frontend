import api from './api';

export const getMyPermissions = async () => (await api.get('/roles-permisos/me', { hideErrorToast: true })).data;
export const getRolePermissions = async () => (await api.get('/roles-permisos')).data;
export const updateRolePermissions = async (role, permissions) => (await api.put(`/roles-permisos/${role}`, { permissions }, { successMessage: 'Permisos actualizados correctamente.' })).data;
