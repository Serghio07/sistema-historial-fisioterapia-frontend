export const LOCAL_HIGH_CONFIDENCE = 12;

export function shouldUseAssistantAI(result) {
  if (!result || result.type === 'fallback') return true;
  if (result.type === 'restricted') return false;
  if (result.type === 'answer' && result.score == null) return false;
  return result.confidence !== 'high' && Number(result.score || 0) < LOCAL_HIGH_CONFIDENCE;
}
