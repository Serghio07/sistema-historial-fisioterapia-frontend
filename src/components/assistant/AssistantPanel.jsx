import AssistantComposer from './AssistantComposer';
import AssistantConversation from './AssistantConversation';
import AssistantHeader from './AssistantHeader';
import AssistantQuickQuestions from './AssistantQuickQuestions';

function AssistantPanel({ context, messages, quickQuestions, onClose, onSend, inputRef, role, querying }) {
  return (
    <section
      id="physio-assistant-panel"
      className="assistant-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="physio-assistant-title"
    >
      <AssistantHeader contextLabel={context.label} onClose={onClose} />
      <AssistantConversation messages={messages} role={role} />
      <AssistantQuickQuestions questions={quickQuestions} onSelect={onSend} disabled={querying} />
      <AssistantComposer onSend={onSend} inputRef={inputRef} disabled={querying} />
      <p className="assistant-local-note">Guía interna · Consultas operativas de solo lectura</p>
    </section>
  );
}

export default AssistantPanel;
