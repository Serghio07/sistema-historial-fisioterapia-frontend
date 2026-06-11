import { Activity, CalendarClock, CalendarDays, CalendarRange, ClipboardCheck, ClipboardList, CreditCard, FileBarChart, LogOut, UserCog, Users } from 'lucide-react';
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
  { to: '/pagos', label: 'Pagos', icon: CreditCard },
  { to: '/informes-medicos', label: 'Informes Medicos', icon: FileBarChart },
  { to: '/usuarios', label: 'Usuarios', icon: UserCog, adminOnly: true }
];

function Sidebar() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-white p-1.5">
          <img src={icono} alt="Physio Active" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0">
          <strong className="block truncate text-white">Physio Active</strong>
          <span className="block text-sm capitalize text-brand-100">{user?.rol}</span>
        </div>
      </div>

      <nav className="grid gap-2">
        {items
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
      </nav>

      <button className="nav-link mt-auto" onClick={logout}>
        <LogOut size={18} />
        <span>Salir</span>
      </button>
    </aside>
  );
}

export default Sidebar;
