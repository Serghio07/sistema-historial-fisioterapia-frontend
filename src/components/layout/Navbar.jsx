import { useCallback, useEffect, useState } from 'react';
import { Bell, Menu, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getNotificaciones } from '../../services/notificacionService';
import logo from '../../assets/logos/logo.png';
import { Avatar } from '../common/ProfilePhoto';

function Navbar({ onMenuClick }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(0);
  const nombreMostrado = user?.nombre_mostrado || user?.ficha_personal?.nombre_mostrado || user?.nombre || user?.usuario;
  const loadNotifications = useCallback(async () => {
    try {
      const items = await getNotificaciones();
      const read = JSON.parse(localStorage.getItem(`notificacionesLeidas:${user?.id || 'usuario'}`) || '[]');
      setNotificationCount(items.filter((item) => !read.includes(item.id)).length);
    } catch {
      setNotificationCount(0);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadNotifications();
    const interval = window.setInterval(loadNotifications, 60_000);
    window.addEventListener('notifications:updated', loadNotifications);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('notifications:updated', loadNotifications);
    };
  }, [loadNotifications]);

  return (
    <header className="navbar">
      <div className="flex items-center gap-3">
        <button type="button" className="mobile-menu-button" onClick={onMenuClick} aria-label="Abrir menu">
          <Menu size={20} />
        </button>
        <img src={logo} alt="Physio Active" className="hidden h-14 w-40 rounded-lg bg-white object-contain p-1.5 shadow-sm sm:block" />
        <div>
          <p className="text-xs font-bold uppercase text-brand-600">Centro de Fisioterapia</p>
          <h1 className="text-xl font-bold text-ink">Sistema de historial clinico</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
      <button type="button" onClick={() => navigate('/notificaciones')} className="relative grid h-11 w-11 place-items-center rounded-xl border border-[#DCE5EC] bg-white text-slate-600 transition hover:border-brand-300 hover:bg-brand-50" aria-label={`Notificaciones${notificationCount ? `, ${notificationCount} nuevas` : ''}`}>
        <Bell size={20} />
        {notificationCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">{notificationCount > 99 ? '99+' : notificationCount}</span>}
      </button>
      <div className="flex items-center gap-2 rounded-lg border border-[#DCE5EC] bg-white px-3 py-2 text-sm text-[#475569]">
        <Avatar src={user?.foto} name={nombreMostrado} size="sm" />
        <ShieldCheck size={15} className="text-brand-600" />
        <span>{nombreMostrado}</span>
      </div>
      </div>
    </header>
  );
}

export default Navbar;
