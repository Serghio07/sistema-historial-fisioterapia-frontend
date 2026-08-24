import api from './api';

export const listContactos = async ({ buscar = '', estado = '', page = 1, limit = 20 } = {}) => (
  await api.get('/contactos', { params: { buscar: buscar || undefined, estado: estado || undefined, page, limit } })
).data;

export const getContacto = async (id) => (await api.get(`/contactos/${id}`)).data;
export const createContacto = async (payload) => (await api.post('/contactos', payload)).data;
export const updateContacto = async (id, payload) => (await api.patch(`/contactos/${id}`, payload)).data;
export const deactivateContacto = async (id) => (await api.post(`/contactos/${id}/desactivar`)).data;
export const reactivateContacto = async (id) => (await api.post(`/contactos/${id}/reactivar`)).data;
export const listPacientesContacto = async (id, incluirHistorial = false) => (
  await api.get(`/contactos/${id}/pacientes`, { params: { incluir_historial: incluirHistorial || undefined } })
).data;

export const listContactosPaciente = async (pacienteId, incluirHistorial = false) => (
  await api.get(`/pacientes/${pacienteId}/contactos`, { params: { incluir_historial: incluirHistorial || undefined } })
).data;

export const linkContactoPaciente = async (pacienteId, payload) => (
  await api.post(`/pacientes/${pacienteId}/contactos`, payload)
).data;

export const createContactoAndLink = async (pacienteId, contacto, relacion) => (
  await api.post(`/pacientes/${pacienteId}/contactos`, { contacto, relacion })
).data;

export const updateRelacionContacto = async (pacienteId, relacionId, payload) => (
  await api.patch(`/pacientes/${pacienteId}/contactos/${relacionId}`, payload)
).data;

export const closeRelacionContacto = async (pacienteId, relacionId) => (
  await api.post(`/pacientes/${pacienteId}/contactos/${relacionId}/cerrar`)
).data;
