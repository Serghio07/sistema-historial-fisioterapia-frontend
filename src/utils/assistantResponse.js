export function normalizeAssistantAiResponse(data) {
  if (!data || typeof data.message !== 'string' || !data.message.trim()) {
    throw new Error('Respuesta vacía del asistente');
  }
  return { ...data, message: data.message.trim() };
}
