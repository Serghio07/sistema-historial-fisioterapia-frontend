import physioBotIcon from '../../assets/assistant/physio-bot.png';

function AssistantFloatingButton({ open, onClick, buttonRef }) {
  const label = open ? 'Cerrar Asistente Physio' : 'Abrir Asistente Physio';
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`assistant-floating-button ${open ? 'is-open' : ''}`}
      onClick={onClick}
      aria-label={label}
      aria-expanded={open}
      aria-controls="physio-assistant-panel"
      title={label}
    >
      <img src={physioBotIcon} alt="" aria-hidden="true" />
    </button>
  );
}

export default AssistantFloatingButton;
