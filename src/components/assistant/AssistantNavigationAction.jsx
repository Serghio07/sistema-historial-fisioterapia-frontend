import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { canAccessModule } from '../../config/permissions';
import { isSafeAssistantRoute } from '../../config/assistant/assistantRoutes';

function AssistantNavigationAction({ action, role }) {
  const navigate = useNavigate();
  if (
    action?.type !== 'navigate'
    || !isSafeAssistantRoute(action.route)
    || (action.permission && !canAccessModule(role, action.permission))
  ) return null;

  return (
    <button
      type="button"
      className="assistant-navigation-action"
      onClick={() => navigate(action.route)}
      aria-label={`${action.label} dentro de Physio Active`}
    >
      <span>{action.label}</span>
      <ArrowRight size={17} aria-hidden="true" />
    </button>
  );
}

export default AssistantNavigationAction;
