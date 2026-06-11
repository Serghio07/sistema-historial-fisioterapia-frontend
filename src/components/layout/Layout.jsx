import { Outlet } from 'react-router-dom';
import Loader from '../common/Loader';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

function Layout() {
  const { loading } = useAuth();

  return (
    <div className="app-shell">
      {loading && <Loader />}
      <Sidebar />
      <main className="workspace">
        <Navbar />
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
