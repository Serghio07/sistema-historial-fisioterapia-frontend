import { matchPath } from 'react-router-dom';
import { ASSISTANT_ROUTES, DEFAULT_ASSISTANT_CONTEXT } from '../config/assistant/assistantRoutes.js';
import { getAssistantScreen } from '../config/assistant/assistantScreens.js';

export function resolveAssistantContext(pathname = '/') {
  const currentPath = pathname.split('?')[0].split('#')[0] || '/';
  const route = ASSISTANT_ROUTES.find(({ path }) => matchPath({ path, end: true }, currentPath));
  if (!route) return { ...DEFAULT_ASSISTANT_CONTEXT, description: 'Ayuda general de Physio Active.', capabilities: { admin: [], personal: [] }, nextStep: 'Selecciona un módulo desde el menú lateral.' };
  const { module, screen, label, permission } = route;
  const screenConfig = getAssistantScreen(screen) || {};
  return { module, screen, label, permission, ...screenConfig };
}
