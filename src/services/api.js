import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toLowerCase();
    const isMutation = ['post', 'put', 'patch', 'delete'].includes(method);
    const isAuthRequest = response.config.url?.startsWith('/auth/');

    if (isMutation && !isAuthRequest && response.config.showSuccessToast !== false) {
      const defaultMessages = {
        post: 'Registro guardado correctamente.',
        put: 'Cambios actualizados correctamente.',
        patch: 'Estado actualizado correctamente.',
        delete: 'Operación realizada correctamente.'
      };
      window.dispatchEvent(new CustomEvent('app:success', {
        detail: {
          message: response.config.successMessage || response.data?.message || defaultMessages[method]
        }
      }));
    }

    return response;
  },
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.join(', ') ||
      'Error de conexion con el servidor';
    if (!error.config?.hideErrorToast) {
      window.dispatchEvent(new CustomEvent('app:error', { detail: { message } }));
    }
    return Promise.reject(new Error(message));
  }
);

export default api;
