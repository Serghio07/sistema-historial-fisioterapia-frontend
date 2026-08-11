import api from './api';

export const getAssistantOperationalSummary = async () => (
  await api.get('/asistente/resumen-operativo', { hideErrorToast: true })
).data;
