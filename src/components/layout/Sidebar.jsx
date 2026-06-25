import { Activity, Banknote, CalendarClock, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, ClipboardCheck, ClipboardList, FileBarChart, ListChecks, LogOut, ShieldCheck, UserCog, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import icono from '../../assets/images/icono.png';

const items = [
  { to: '/', label: 'Panel', icon: Activity },
  { to: '/pacientes', label: 'Pacientes', icon: Users },
  { to: '/historias-clinicas', label: 'Historias', icon: ClipboardList },
  { to: '/citas', label: 'Citas / Agenda', icon: CalendarClock },
  { to: '/sesiones', label: 'Sesiones', icon: CalendarDays },
  { to: '/sesiones-semanales', label: 'Sesiones Semanales', icon: CalendarRange },
  { to: '/planillas-atencion', label: 'Planillas', icon: ClipboardCheck },
  { to: '/informes-medicos', label: 'Informes Medicos', icon: FileBarChart },
  { to: '/usuarios', label: 'Usuarios', icon: UserCog, adminOnly: true },
  { to: '/roles-permisos', label: 'Roles y Permisos', icon: ShieldCheck, adminOnly: true }
];

const personalItems = [
  { to: '/personal/actividades', label: 'Actividades Diarias', icon: ListChecks },
  { to: '/personal/planilla', label: 'Planilla del Personal', icon: Banknote }
];

function Sidebar({ collapsed = false, mobileOpen = false, onNavigate, onToggle }) {
  const { user, isAdmin, logout } = useAuth();

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
        {items
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} onClick={onNavigate} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
                <Icon size={18} />
                <span className="sidebar-text">{item.label}</span>
              </NavLink>
            );
          })}
        {isAdmin && (
          <>
            <div className="sidebar-text mt-3 border-t border-white/15 px-3 pt-4 text-xs font-black uppercase tracking-wider text-brand-100">
              Personal
            </div>
            {personalItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} onClick={onNavigate} className={({ isActive }) => `nav-link pl-5 ${isActive ? 'nav-link-active' : ''}`}>
                  <Icon size={18} />
                  <span className="sidebar-text">{item.label}</span>
                </NavLink>
              );
            })}
          </>
        )}
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
