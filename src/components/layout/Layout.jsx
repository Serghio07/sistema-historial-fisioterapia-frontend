import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Loader from '../common/Loader';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import PhysioAssistant from '../assistant/PhysioAssistant';
import { useAuth } from '../../context/AuthContext';

function Layout() {
  const { loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'app-shell-collapsed' : ''}`}>
      {loading && <Loader />}
      {mobileMenuOpen && <button type="button" className="mobile-sidebar-backdrop" aria-label="Cerrar menú" onClick={() => setMobileMenuOpen(false)} />}
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
      <PhysioAssistant />
    </div>
  );
}

export default Layout;
