import { Bot, X } from 'lucide-react';

function AssistantHeader({ contextLabel, onClose }) {
  return (
    <header className="assistant-header">
      <span className="assistant-header-icon"><Bot size={21} aria-hidden="true" /></span>
      <div>
        <h2 id="physio-assistant-title">Asistente Physio</h2>
        <p>Ayuda sobre: {contextLabel}</p>
      </div>
      <button type="button" className="assistant-close" onClick={onClose} aria-label="Cerrar Asistente Physio" title="Cerrar">
        <X size={20} aria-hidden="true" />
      </button>
    </header>
  );
}

export default AssistantHeader;
