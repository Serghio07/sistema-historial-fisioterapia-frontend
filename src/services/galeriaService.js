import api from './api';

const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').trim();
const origin = (configuredApiUrl || window.location.origin).replace(/\/api\/?$/, '');
export const galleryImageUrl = (value) => value?.startsWith('http') ? value : `${origin}${value || ''}`;
export const listGallery = async () => (await api.get('/galeria')).data;
export const getGalleryItem = async (id) => (await api.get(`/galeria/${id}`)).data;
export const saveGalleryItem = async (id, form) => {
  const body = new FormData();
  ['titulo', 'descripcion', 'categoria', 'orden', 'estado'].forEach((field) => body.append(field, form[field] ?? ''));
  if (form.archivo) body.append('imagen', form.archivo);
  const config = { headers: { 'Content-Type': 'multipart/form-data' } };
  return (await (id ? api.put(`/galeria/${id}`, body, config) : api.post('/galeria', body, config))).data;
};
export const changeGalleryStatus = async (id, estado) => (await api.patch(`/galeria/${id}/estado`, { estado })).data;
export const deleteGalleryItem = async (id) => (await api.delete(`/galeria/${id}`)).data;
