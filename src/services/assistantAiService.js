import api from './api.js';
import { normalizeAssistantAiResponse } from '../utils/assistantResponse.js';

export async function sendAssistantMessage({ message, context, conversation }) {
  const payload = {
    message: String(message || '').slice(0, 3000),
    context: { module: context?.module || 'general', screen: context?.screen || 'general' },
    conversation: (Array.isArray(conversation) ? conversation : []).slice(-8).map(({ role, text }) => ({ role, text: String(text || '').slice(0, 1000) }))
  };
  const response = await api.post('/assistant/chat', payload, {
    hideErrorToast: true,
    showSuccessToast: false,
    timeout: 16000
  });
  return normalizeAssistantAiResponse(response.data);
}
