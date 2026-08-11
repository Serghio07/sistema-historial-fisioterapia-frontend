import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { assistantKnowledge } from '../../config/assistant/assistantKnowledge';
import { assistantQueries, getAssistantQueryQuickQuestions } from '../../config/assistant/assistantQueries';
import { resolveAssistantContext } from '../../utils/assistantContext';
import { findBestAssistantAnswer, getAssistantQuickQuestions } from '../../utils/assistantMatcher';
import { createInitialAssistantGreeting, getConversationResponse } from '../../utils/assistantGreeting';
import { executeAssistantQuery, findAssistantQuery } from '../../utils/assistantQueryHandlers';
import { LOCAL_HIGH_CONFIDENCE, shouldUseAssistantAI } from '../../utils/assistantHybrid';
import { sendAssistantMessage } from '../../services/assistantAiService';
import '../../styles/assistant.css';
import AssistantFloatingButton from './AssistantFloatingButton';
import AssistantPanel from './AssistantPanel';

function PhysioAssistant() {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [querying, setQuerying] = useState(false);
  const sequence = useRef(1);
  const mounted = useRef(true);
  const inputRef = useRef(null);
  const buttonRef = useRef(null);
  const context = useMemo(() => resolveAssistantContext(pathname), [pathname]);
  const role = isAdmin ? 'admin' : user?.rol || 'personal';
  const [messages, setMessages] = useState(() => [{
    id: 0,
    role: 'assistant',
    text: `${createInitialAssistantGreeting(user)}\nActualmente estás en: ${context.label}`
  }]);
  const quickQuestions = useMemo(
    () => [...getAssistantQueryQuickQuestions(context, role), ...getAssistantQuickQuestions(assistantKnowledge, context, role)].slice(0, 4),
    [context, role]
  );

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.clearTimeout(timer);
    };
  }, [open]);

  if (!isAuthenticated) return null;

  const handleSend = async (question, quickQuestionId = null) => {
    if (querying) return;
    const conversation = getConversationResponse(question, user);
    const query = conversation ? null : findAssistantQuery(question, assistantQueries, role);
    const userId = sequence.current++;
    if (conversation) {
      setMessages((current) => [...current, { id: userId, role: 'user', text: question }, { id: sequence.current++, role: 'assistant', text: conversation.answer, title: conversation.title, steps: [] }]);
      return;
    }
    if (query?.type === 'restricted' || query?.type === 'unavailable') {
      setMessages((current) => [...current, { id: userId, role: 'user', text: question }, { id: sequence.current++, role: 'assistant', title: query.type === 'restricted' ? 'Acceso restringido' : 'Consulta no disponible', text: query.answer, steps: [] }]);
      return;
    }
    if (query?.type === 'read_query' && query.score >= LOCAL_HIGH_CONFIDENCE) {
      const loadingId = sequence.current++;
      setQuerying(true);
      setMessages((current) => [...current, { id: userId, role: 'user', text: question }, { id: loadingId, role: 'assistant', loading: true, text: 'Consultando información…' }]);
      try {
        const response = await executeAssistantQuery(query);
        if (!mounted.current) return;
        const targetContext = response.action ? resolveAssistantContext(response.action.route) : null;
        const action = targetContext?.screen === context.screen ? undefined : response.action;
        setMessages((current) => current.map((message) => message.id === loadingId ? { id: loadingId, role: 'assistant', type: 'data', text: response.text, steps: response.steps || [], action } : message));
      } catch (error) {
        if (!mounted.current) return;
        const text = error?.status === 403 ? 'No tienes permiso para consultar esa información.' : 'No pude consultar esa información en este momento.';
        setMessages((current) => current.map((message) => message.id === loadingId ? { id: loadingId, role: 'assistant', text, steps: [] } : message));
      } finally {
        if (mounted.current) setQuerying(false);
      }
      return;
    }
    const result = findBestAssistantAnswer({ question, knowledge: assistantKnowledge, context, role, quickQuestionId });
    if (!shouldUseAssistantAI(result)) {
      const answerId = sequence.current++;
      setMessages((current) => [
        ...current,
        { id: userId, role: 'user', text: question },
        { id: answerId, role: 'assistant', source: 'local', title: result.title, text: result.answer, steps: result.steps, tips: result.tips, warnings: result.warnings, action: result.action }
      ]);
      return;
    }

    const loadingId = sequence.current++;
    setQuerying(true);
    setMessages((current) => [...current, { id: userId, role: 'user', text: question }, { id: loadingId, role: 'assistant', loading: true, text: 'Asistente Physio está pensando...' }]);
    try {
      const response = await sendAssistantMessage({
        message: question,
        context,
        conversation: messages.filter((item) => !item.loading).map(({ role: messageRole, text }) => ({ role: messageRole, text }))
      });
      if (!mounted.current) return;
      const targetContext = response.action ? resolveAssistantContext(response.action.route) : null;
      const action = targetContext?.screen === context.screen ? undefined : response.action;
      const fallbackText = result.type !== 'fallback' ? result.answer : 'No pude encontrar una respuesta segura en este momento. Prueba con una pregunta rápida.';
      setMessages((current) => current.map((item) => item.id === loadingId ? { id: loadingId, role: 'assistant', source: response.source, text: response.unavailable ? fallbackText : response.message, steps: [], action: response.unavailable ? result.action : action } : item));
    } catch {
      if (!mounted.current) return;
      const text = result.type !== 'fallback' ? result.answer : 'No pude procesar esa consulta. Puedes intentar nuevamente o usar una pregunta rápida.';
      setMessages((current) => current.map((item) => item.id === loadingId ? { id: loadingId, role: 'assistant', source: 'local-fallback', text, steps: [], action: result.action } : item));
    } finally {
      if (mounted.current) setQuerying(false);
    }
  };

  const closePanel = () => {
    setOpen(false);
    window.setTimeout(() => buttonRef.current?.focus(), 0);
  };

  return (
    <div className="physio-assistant" data-screen={context.screen}>
      {open && (
        <AssistantPanel
          context={context}
          messages={messages}
          quickQuestions={quickQuestions}
          onClose={closePanel}
          onSend={handleSend}
          inputRef={inputRef}
          role={role}
          querying={querying}
        />
      )}
      <AssistantFloatingButton open={open} onClick={() => setOpen((current) => !current)} buttonRef={buttonRef} />
    </div>
  );
}

export default PhysioAssistant;
