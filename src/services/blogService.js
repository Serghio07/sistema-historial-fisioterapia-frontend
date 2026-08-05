import api from './api';

const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').trim();
if (import.meta.env.PROD && !configuredApiUrl) throw new Error('VITE_API_URL es obligatoria para compilar producción');
const developmentApiUrl = import.meta.env.DEV ? 'http://localhost:3000/api' : '';
export const API_ORIGIN = (configuredApiUrl || developmentApiUrl).replace(/\/api\/?$/, '');
export const mediaUrl = (path) => path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;

export const getBlogPosts = async (params) => (await api.get('/blogs', { params })).data;
export const getBlogPost = async (id) => (await api.get(`/blogs/${id}`)).data;
export const createBlogPost = async (payload) => (await api.post('/blogs', payload)).data;
export const updateBlogPost = async (id, payload) => (await api.put(`/blogs/${id}`, payload)).data;
export const publishBlogPost = async (id) => (await api.post(`/blogs/${id}/publicar`)).data;
export const hideBlogPost = async (id) => (await api.post(`/blogs/${id}/ocultar`)).data;
export const archiveBlogPost = async (id) => (await api.post(`/blogs/${id}/archivar`)).data;
export const restoreBlogPost = async (id) => (await api.post(`/blogs/${id}/restaurar`)).data;
export const deleteBlogPost = async (id) => (await api.delete(`/blogs/${id}`)).data;
export const uploadBlogImage = async (file) => {
  const data = new FormData();
  data.append('imagen', file);
  return (await api.post('/blogs/upload/imagen', data, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
};

export const getBlogCategories = async () => (await api.get('/blog-categories')).data;
export const createBlogCategory = async (payload) => (await api.post('/blog-categories', payload)).data;
export const updateBlogCategory = async (id, payload) => (await api.put(`/blog-categories/${id}`, payload)).data;
export const toggleBlogCategory = async (id, activo) => (await api.patch(`/blog-categories/${id}/estado`, { activo })).data;
export const deleteBlogCategory = async (id) => (await api.delete(`/blog-categories/${id}`)).data;
