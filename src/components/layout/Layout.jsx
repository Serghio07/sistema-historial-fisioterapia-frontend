import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import Loader from '../common/Loader';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

function Layout() {
  const { loading } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'app-shell-collapsed' : ''}`}>
      {loading && <Loader />}
      {mobileMenuOpen && <button type="button" className="mobile-sidebar-backdrop" aria-label="Cerrar menu" onClick={() => setMobileMenuOpen(false)} />}
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onNavigate={() => setMobileMenuOpen(false)}
        onToggle={() => setSidebarCollapsed((current) => !current)}
      />
      <main className="workspace">
        <Navbar onMenuClick={() => setMobileMenuOpen(true)} />
        <Outlet />
      </main>
      <button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={darkMode ? 'Activar modo día' : 'Activar modo noche'}
        title={darkMode ? 'Modo día' : 'Modo noche'}
      >
        {darkMode ? <Sun size={22} /> : <Moon size={22} />}
        <span>{darkMode ? 'Modo día' : 'Modo noche'}</span>
      </button>
    </div>
  );
}

export default Layout;
