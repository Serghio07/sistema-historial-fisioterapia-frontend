export const ASSISTANT_ROUTES = Object.freeze([
  { path: '/blog/editar/:id', module: 'blog', screen: 'editar-blog', label: 'Editar artículo', permission: 'blogAdministracion' },
  { path: '/blog/vista-previa/:id', module: 'blog', screen: 'vista-previa-blog', label: 'Vista previa del blog', permission: 'blogAdministracion' },
  { path: '/historias-clinicas/:id', module: 'historias', screen: 'detalle-historia', label: 'Historia clínica', permission: 'historias' },
  { path: '/pacientes/:id', module: 'pacientes', screen: 'detalle-paciente', label: 'Paciente', permission: 'pacientes' },
  { path: '/documentos/consentimiento-informado', module: 'consentimiento', screen: 'consentimiento', label: 'Consentimiento informado', permission: 'documentosClinicos' },
  { path: '/documentos/administracion-farmacos', module: 'farmacos', screen: 'farmacos', label: 'Administración de fármacos', permission: 'documentosClinicos' },
  { path: '/documentos/signos-vitales', module: 'signos-vitales', screen: 'signos-vitales', label: 'Signos vitales', permission: 'documentosClinicos' },
  { path: '/control-financiero/planilla-pagos', module: 'finanzas', screen: 'pagos', label: 'Planilla de pagos', permission: 'finanzas' },
  { path: '/control-financiero/deudores', module: 'finanzas', screen: 'deudores', label: 'Deudores', permission: 'finanzas' },
  { path: '/control-financiero/arqueos', module: 'finanzas', screen: 'arqueos', label: 'Arqueos', permission: 'finanzas' },
  { path: '/control-financiero/recibos', module: 'finanzas', screen: 'recibos', label: 'Recibos', permission: 'finanzas' },
  { path: '/control-financiero/comprobantes', module: 'finanzas', screen: 'comprobantes', label: 'Comprobantes', permission: 'finanzas' },
  { path: '/whatsapp/monitoring', module: 'monitoreo-whatsapp', screen: 'monitoreo-whatsapp', label: 'Monitoreo WhatsApp', permission: 'monitoreoWhatsapp' },
  { path: '/whatsapp/recepcion', module: 'recepcion-whatsapp', screen: 'recepcion-whatsapp', label: 'Recepción WhatsApp', permission: 'recepcionWhatsapp' },
  { path: '/personal/actividades', module: 'actividades', screen: 'actividades', label: 'Mis actividades', permission: 'actividadesPropias' },
  { path: '/personal/planilla', module: 'sueldos', screen: 'sueldos', label: 'Planilla de sueldos', permission: 'sueldos' },
  { path: '/control-diario/resumen', module: 'resumen-diario', screen: 'resumen-diario', label: 'Resumen diario', permission: 'resumenDiarioClinico' },
  { path: '/control-diario/tareas', module: 'resumen-diario', screen: 'resumen-diario', label: 'Resumen diario', permission: 'resumenDiarioClinico' },
  { path: '/control-diario/incidencias', module: 'resumen-diario', screen: 'resumen-diario', label: 'Resumen diario', permission: 'resumenDiarioClinico' },
  { path: '/sesiones-semanales', module: 'sesiones-semanales', screen: 'sesiones-semanales', label: 'Sesiones semanales', permission: 'sesionesSemanales' },
  { path: '/planillas-atencion', module: 'planillas-atencion', screen: 'planillas-atencion', label: 'Planillas de atención', permission: 'planillasAtencion' },
  { path: '/evolutivos-clinicos', module: 'evoluciones', screen: 'evoluciones', label: 'Evolutivos clínicos', permission: 'evolutivos' },
  { path: '/historias-clinicas', module: 'historias', screen: 'historias', label: 'Historias clínicas', permission: 'historias' },
  { path: '/resumen-pacientes', module: 'pacientes', screen: 'resumen-pacientes', label: 'Resumen de pacientes', permission: 'pacientes' },
  { path: '/informes-medicos', module: 'informes', screen: 'informes', label: 'Informes médicos', permission: 'informes' },
  { path: '/reportes', module: 'informes', screen: 'informes', label: 'Informes médicos', permission: 'informes' },
  { path: '/blog/categorias', module: 'categorias-blog', screen: 'categorias-blog', label: 'Categorías del blog', permission: 'blogCategorias' },
  { path: '/blog/nuevo', module: 'blog', screen: 'nuevo-blog', label: 'Nuevo artículo', permission: 'blogAdministracion' },
  { path: '/roles-permisos', module: 'roles-permisos', screen: 'roles-permisos', label: 'Roles y permisos', permission: 'rolesPermisos' },
  { path: '/notificaciones', module: 'notificaciones', screen: 'notificaciones', label: 'Notificaciones', permission: null },
  { path: '/pacientes', module: 'pacientes', screen: 'pacientes', label: 'Pacientes', permission: 'pacientes' },
  { path: '/sesiones', module: 'sesiones', screen: 'sesiones', label: 'Sesiones', permission: 'sesiones' },
  { path: '/citas', module: 'agenda', screen: 'agenda', label: 'Citas / Agenda', permission: 'agenda' },
  { path: '/usuarios', module: 'usuarios', screen: 'usuarios', label: 'Usuarios y personal', permission: 'usuarios' },
  { path: '/blog', module: 'blog', screen: 'blog', label: 'Blog', permission: 'blogAdministracion' },
  { path: '/', module: 'dashboard', screen: 'dashboard', label: 'Panel principal', permission: 'dashboard' }
]);

export const DEFAULT_ASSISTANT_CONTEXT = Object.freeze({
  module: 'general', screen: 'general', label: 'Physio Active', permission: null
});

export function getAssistantRouteConfig(route) {
  return ASSISTANT_ROUTES.find((entry) => entry.path === route && !entry.path.includes(':')) || null;
}

export function isSafeAssistantRoute(route) {
  return Boolean(typeof route === 'string' && route.startsWith('/') && getAssistantRouteConfig(route));
}
