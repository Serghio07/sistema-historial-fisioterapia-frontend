import api from './api';

export const startWhatsappSimulation = async (payload) => {
  const { data } = await api.post('/whatsapp/simulator/start', payload, {
    successMessage: 'Conversación simulada iniciada.'
  });
  return data;
};

export const sendWhatsappSimulationMessage = async (payload) => {
  const { data } = await api.post('/whatsapp/simulator/message', payload, {
    showSuccessToast: false
  });
  return data;
};

export const resetWhatsappSimulation = async (payload) => {
  const { data } = await api.post('/whatsapp/simulator/reset', payload, {
    successMessage: 'Conversación reiniciada sin eliminar el historial.'
  });
  return data;
};

export const getWhatsappSimulationConversation = async (id) => {
  const { data } = await api.get(`/whatsapp/simulator/conversations/${id}`);
  return data;
};

export const getWhatsappSimulationMessages = async (id) => {
  const { data } = await api.get(`/whatsapp/simulator/conversations/${id}/messages`);
  return data;
};

export const getWhatsappSimulationAudit = async (id) => {
  const { data } = await api.get(`/whatsapp/simulator/conversations/${id}/audit`);
  return data;
};
