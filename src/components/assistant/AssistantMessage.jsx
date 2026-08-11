import { Bot, UserRound } from 'lucide-react';
import AssistantNavigationAction from './AssistantNavigationAction';

function AssistantMessage({ message, role }) {
  const assistant = message.role === 'assistant';
  return (
    <article className={`assistant-message ${assistant ? 'assistant-message-bot' : 'assistant-message-user'}`}>
      <span className="assistant-message-avatar" aria-hidden="true">
        {assistant ? <Bot size={16} /> : <UserRound size={16} />}
      </span>
      <div className="assistant-message-bubble">
        {message.loading && <span className="assistant-query-loading" aria-label="Consultando información"><i /><i /><i /></span>}
        {message.title && <strong>{message.title}</strong>}
        <p>{message.text}</p>
        {message.steps?.length > 0 && (
          <ol>{message.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        )}
        {message.tips?.map((tip) => <p className="assistant-tip" key={tip}>Consejo: {tip}</p>)}
        {message.warnings?.map((warning) => <p className="assistant-warning" key={warning}>Importante: {warning}</p>)}
        {assistant && message.action && <AssistantNavigationAction action={message.action} role={role} />}
      </div>
    </article>
  );
}

export default AssistantMessage;
