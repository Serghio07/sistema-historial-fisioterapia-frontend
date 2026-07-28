import { useState } from 'react';
import { Activity, Banknote, CalendarClock, CalendarDays, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, ClipboardList, FileBarChart, FileText, FolderOpen, HeartPulse, Landmark, ListChecks, LogOut, Newspaper, Pill, ShieldCheck, Tags, UserCog, Users, WalletCards } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import icono from '../../assets/images/icono.png';

const groups = [
  {
    key: 'pacientes',
    label: 'Gestion de Pacientes',
    icon: Users,
    items: [
      { to: '/pacientes', label: 'Pacientes', icon: Users },
      { to: '/resumen-pacientes', label: 'Resumen de Pacientes', icon: FileText },
      { to: '/historias-clinicas', label: 'Historias Clinicas', icon: ClipboardList },
      { to: '/evolutivos-clinicos', label: 'Evoluciones clínicas', icon: Activity },
      { to: '/informes-medicos', label: 'Informes Medicos', icon: FileBarChart }
    ]
  },
  {
    key: 'atencion',
    label: 'Atencion y Agenda',
    icon: CalendarClock,
    items: [
      { to: '/citas', label: 'Citas / Agenda', icon: CalendarClock },
      { to: '/sesiones', label: 'Sesiones Diarias', icon: CalendarDays },
      { to: '/sesiones-semanales', label: 'Sesiones Semanales', icon: CalendarRange }
    ]
  },
  {
    key: 'documentos',
    label: 'Documentos Clinicos',
    icon: FolderOpen,
    items: [
      { to: '/documentos/consentimiento-informado', label: 'Consentimiento Informado', icon: FileText },
      { to: '/documentos/signos-vitales', label: 'Signos Vitales', icon: HeartPulse },
      { to: '/documentos/administracion-farmacos', label: 'Administracion de Farmacos', icon: Pill }
    ]
  },
  {
    key: 'planillas',
    label: 'Planillas y Control',
    icon: ClipboardCheck,
    items: [
      { to: '/planillas-atencion', label: 'Planillas', icon: ClipboardCheck },
      { to: '/personal/actividades', label: 'Actividades Diarias', icon: ListChecks },
      { to: '/personal/planilla', label: 'Planillas de sueldos', icon: Banknote, adminOnly: true }
    ]
  },
  {
    key: 'financiero',
    label: 'Control financiero',
    icon: Landmark,
    items: [
      { to: '/control-financiero/planilla-pagos', label: 'Planilla de pagos', icon: WalletCards }
    ]
  },
  {
    key: 'control_diario',
    label: 'Control diario',
    icon: CalendarDays,
    items: [
      { to: '/control-diario/resumen', label: 'Resumen diario', icon: Activity }
    ]
  },
  {
    key: 'contenido',
    label: 'Contenido web',
    icon: Newspaper,
    items: [
      { to: '/blog', label: 'Blog y publicaciones', icon: Newspaper },
      { to: '/blog/categorias', label: 'Categorías', icon: Tags, adminOnly: true }
    ]
  },
  {
    key: 'administracion',
    label: 'Administracion',
    icon: ShieldCheck,
    adminOnly: true,
    items: [
      { to: '/usuarios', label: 'Usuarios', icon: UserCog },
      { to: '/roles-permisos', label: 'Roles y Permisos', icon: ShieldCheck }
    ]
  }
];

const isGroupActive = (pathname, group) => group.items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

function Sidebar({ collapsed = false, mobileOpen = false, onNavigate, onToggle }) {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState(() =>
    groups.reduce((state, group) => ({
      ...state,
      [group.key]: isGroupActive(location.pathname, group) || ['pacientes', 'atencion', 'documentos'].includes(group.key)
    }), {})
  );

  const toggleGroup = (key) => setOpenGroups((current) => ({ ...current, [key]: !current[key] }));

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
      <button type="button" className="sidebar-toggle" onClick={onToggle} title={collapsed ? 'Mostrar menu' : 'Ocultar menu'} aria-label={collapsed ? 'Mostrar menu' : 'Ocultar menu'}>
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-white p-1.5">
          <img src={icono} alt="Physio Active" className="h-full w-full object-contain" />
        </div>
        <div className="sidebar-text min-w-0">
          <strong className="block truncate text-white">Physio Active</strong>
          <span className="block text-sm capitalize text-brand-100">{user?.rol}</span>
        </div>
      </div>

      <nav className="grid shrink-0 gap-2 pb-2">
        <NavLink to="/" onClick={onNavigate} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
          <Activity size={18} />
          <span className="sidebar-text">Panel</span>
        </NavLink>

        {groups
          .filter((group) => !group.adminOnly || isAdmin)
          .map((group) => {
            const Icon = group.icon;
            const active = isGroupActive(location.pathname, group);
            const visibleItems = group.items.filter((item) => !item.adminOnly || isAdmin);
            if (!visibleItems.length) return null;

            return (
              <div key={group.key} className="grid gap-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  className={`nav-link w-full ${active ? 'nav-link-active' : ''}`}
                  title={group.label}
                  aria-expanded={Boolean(openGroups[group.key])}
                >
                  <Icon size={18} />
                  <span className="sidebar-text flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate">{group.label}</span>
                    <ChevronDown size={16} className={`shrink-0 transition ${openGroups[group.key] ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {openGroups[group.key] && !collapsed && (
                  <div className="grid gap-1 border-l border-white/15 pl-3">
                    {visibleItems.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <NavLink key={item.to} to={item.to} onClick={onNavigate} className={({ isActive }) => `nav-link min-h-10 pl-4 text-xs ${isActive ? 'nav-link-active' : ''}`}>
                          <ItemIcon size={16} />
                          <span className="sidebar-text">{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </nav>

      <button
        className="nav-link mt-auto shrink-0"
        onClick={() => {
          onNavigate?.();
          logout();
        }}
      >
        <LogOut size={18} />
        <span className="sidebar-text">Salir</span>
      </button>
    </aside>
  );
}

export default Sidebar;
