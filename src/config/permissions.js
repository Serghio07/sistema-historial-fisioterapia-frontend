export const ROLE_LABELS = Object.freeze({
  admin: 'Doctor / Administrador',
  personal: 'Personal'
});

export const MODULE_PERMISSIONS = Object.freeze({
  dashboard: ['admin', 'personal'],
  pacientes: ['admin', 'personal'],
  historias: ['admin', 'personal'],
  evolutivos: ['admin', 'personal'],
  agenda: ['admin', 'personal'],
  recepcionWhatsapp: ['admin', 'personal'],
  monitoreoWhatsapp: ['admin'],
  sesiones: ['admin', 'personal'],
  sesionesSemanales: ['admin', 'personal'],
  documentosClinicos: ['admin', 'personal'],
  planillasAtencion: ['admin', 'personal'],
  informes: ['admin', 'personal'],
  actividadesPropias: ['admin', 'personal'],
  resumenDiarioClinico: ['admin', 'personal'],
  finanzas: ['admin'],
  usuarios: ['admin'],
  personalAdministracion: ['admin'],
  rolesPermisos: ['admin'],
  sueldos: ['admin'],
  blogAdministracion: ['admin', 'personal'],
  blogCategorias: ['admin'],
  auditoria: ['admin'],
  configuracion: ['admin']
});

export const canAccessModule = (role, permission) => (
  Boolean(role && MODULE_PERMISSIONS[permission]?.includes(role))
);

export const getRoleLabel = (role) => ROLE_LABELS[role] || role || 'Sin rol';

export const PERMISSION_ACTIONS = Object.freeze([
  { key: 'view', label: 'Ver' },
  { key: 'create', label: 'Crear' },
  { key: 'edit', label: 'Editar' },
  { key: 'publish', label: 'Publicar' },
  { key: 'annul', label: 'Anular / eliminar' },
  { key: 'print', label: 'Imprimir' },
  { key: 'export', label: 'Exportar' },
  { key: 'administer', label: 'Administrar' }
]);

const allActions = PERMISSION_ACTIONS.map(({ key }) => key);
const clinicalDocumentActions = ['view', 'create', 'edit', 'print', 'export'];

export const ROLE_ACTION_PERMISSIONS = Object.freeze({
  dashboard: {
    admin: ['view'],
    personal: ['view']
  },
  pacientes: {
    admin: allActions,
    personal: ['view', 'create', 'edit', 'print']
  },
  historias: {
    admin: allActions,
    personal: clinicalDocumentActions
  },
  evolutivos: {
    admin: ['view', 'create', 'edit', 'annul', 'print', 'export', 'administer'],
    personal: ['view', 'create', 'edit']
  },
  agenda: {
    admin: allActions,
    personal: ['view', 'create', 'edit', 'print']
  },
  recepcionWhatsapp: {
    admin: allActions,
    personal: ['view', 'edit']
  },
  sesiones: {
    admin: allActions,
    personal: ['view', 'create', 'edit', 'print']
  },
  sesionesSemanales: {
    admin: allActions,
    personal: ['view', 'create', 'edit', 'print', 'export']
  },
  documentosClinicos: {
    admin: allActions,
    personal: clinicalDocumentActions
  },
  planillasAtencion: {
    admin: allActions,
    personal: clinicalDocumentActions
  },
  informes: {
    admin: allActions,
    personal: clinicalDocumentActions
  },
  actividadesPropias: {
    admin: allActions,
    personal: ['view', 'create', 'edit']
  },
  resumenDiarioClinico: {
    admin: ['view', 'create', 'edit', 'print', 'export', 'administer'],
    personal: ['view', 'create', 'edit', 'print', 'export']
  },
  finanzas: {
    admin: allActions,
    personal: []
  },
  usuarios: {
    admin: allActions,
    personal: []
  },
  personalAdministracion: {
    admin: allActions,
    personal: []
  },
  rolesPermisos: {
    admin: ['view', 'administer'],
    personal: []
  },
  sueldos: {
    admin: allActions,
    personal: []
  },
  blogAdministracion: {
    admin: allActions,
    personal: ['view', 'create', 'edit', 'publish']
  },
  blogCategorias: {
    admin: allActions,
    personal: []
  },
  auditoria: {
    admin: ['view', 'print', 'export', 'administer'],
    personal: []
  }
});

export const canPerformAction = (role, permission, action) => (
  Boolean(canAccessModule(role, permission) && ROLE_ACTION_PERMISSIONS[permission]?.[role]?.includes(action))
);

export const ROLE_PERMISSION_MATRIX = Object.freeze([
  { module: 'Panel principal', permission: 'dashboard', description: 'Indicadores clínicos; finanzas únicamente para Administrador.' },
  { module: 'Pacientes', permission: 'pacientes', description: 'Personal puede crear y editar, pero no desactivar, restaurar ni consultar finanzas.' },
  { module: 'Historias clínicas', permission: 'historias', description: 'Personal trabaja con historias activas; anular y restaurar es exclusivo del Administrador.' },
  { module: 'Evolutivos clínicos', permission: 'evolutivos', description: 'Consulta y trabajo clínico activo.' },
  { module: 'Citas y agenda', permission: 'agenda', description: 'Operación de agenda; eliminación histórica y configuración protegidas.' },
  { module: 'Solicitudes de recepción', permission: 'recepcionWhatsapp', description: 'Bandeja administrativa derivada desde WhatsApp.' },
  { module: 'Sesiones diarias', permission: 'sesiones', description: 'Personal registra únicamente información clínica.' },
  { module: 'Sesiones semanales', permission: 'sesionesSemanales', description: 'Personal no recibe ni exporta montos, pagos o deudas.' },
  { module: 'Documentos clínicos', permission: 'documentosClinicos', description: 'Personal no recibe ni modifica datos financieros de fármacos.' },
  { module: 'Planillas de atención', permission: 'planillasAtencion', description: 'Trabajo clínico; anulación exclusiva del Administrador.' },
  { module: 'Informes médicos', permission: 'informes', description: 'Trabajo clínico; anulación exclusiva del Administrador.' },
  { module: 'Mis actividades', permission: 'actividadesPropias', description: 'Personal accede solo a su operación asignada.' },
  { module: 'Resumen diario', permission: 'resumenDiarioClinico', description: 'Personal recibe únicamente el resumen clínico y operativo.' },
  { module: 'Control financiero', permission: 'finanzas', description: 'Pagos, deudas, recibos, comprobantes, arqueos y exportaciones.' },
  { module: 'Usuarios y personal', permission: 'usuarios', description: 'Administración de cuentas, solicitudes y fichas laborales.' },
  { module: 'Roles y permisos', permission: 'rolesPermisos', description: 'Matriz informativa de la política aplicada en código.' },
  { module: 'Planillas de sueldos', permission: 'sueldos', description: 'Información laboral y salarial.' },
  { module: 'Blog y publicaciones', permission: 'blogAdministracion', description: 'El personal puede crear, editar y publicar sus propios borradores.' },
  { module: 'Categorías del blog', permission: 'blogCategorias', description: 'Crear, editar o eliminar categorías del sitio.' },
  { module: 'Auditoría completa', permission: 'auditoria', description: 'Trazabilidad global del sistema.' }
]);
