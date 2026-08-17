export const isCompletedSession = (session) => (
  !session?.anulada
  && String(session?.estado || '').toLowerCase() !== 'anulada'
  && String(session?.asistencia || '').toLowerCase() === 'asistio'
);

export const historyProgress = (history, sessions = [], editingId = null) => {
  const contracted = Number(history?.evaluacion_final?.sesiones_contratadas || 0);
  const completed = sessions.filter((session) => (
    String(session.historia_clinica_id || session.historia_clinica?.id) === String(history?.id)
    && isCompletedSession(session)
    && (!editingId || String(session.id) !== String(editingId))
  )).length;
  return { contracted, completed, remaining: Math.max(contracted - completed, 0), isComplete: contracted > 0 && completed >= contracted };
};

export const nextIncompleteHistory = (histories = [], sessions = []) => histories.find((history) => {
  const progress = historyProgress(history, sessions);
  return progress.contracted > 0 && !progress.isComplete;
}) || null;
