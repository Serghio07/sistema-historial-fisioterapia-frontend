import { useState } from 'react';
import { Send } from 'lucide-react';

const MAX_LENGTH = 500;

function AssistantComposer({ onSend, inputRef, disabled = false }) {
  const [value, setValue] = useState('');
  const submit = () => {
    const question = value.trim();
    if (!question || disabled) return;
    onSend(question);
    setValue('');
  };

  return (
    <div className="assistant-composer">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        rows="2"
        maxLength={MAX_LENGTH}
        placeholder="Escribe tu pregunta…"
        aria-label="Pregunta para Asistente Physio"
        disabled={disabled}
      />
      <button type="button" onClick={submit} disabled={disabled || !value.trim()} aria-label="Enviar pregunta" title="Enviar">
        <Send size={19} aria-hidden="true" />
      </button>
    </div>
  );
}

export default AssistantComposer;
