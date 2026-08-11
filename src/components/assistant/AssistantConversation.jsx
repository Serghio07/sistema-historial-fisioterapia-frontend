import { useEffect, useRef } from 'react';
import AssistantMessage from './AssistantMessage';

function AssistantConversation({ messages, role }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="assistant-conversation" aria-live="polite" aria-label="Conversación con Asistente Physio">
      {messages.map((message) => <AssistantMessage key={message.id} message={message} role={role} />)}
      <div ref={endRef} />
    </div>
  );
}

export default AssistantConversation;
