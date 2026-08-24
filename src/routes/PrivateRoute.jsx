import { Navigate, Outlet } from 'react-router-dom';
import Loader from '../components/common/Loader';
import { canAccessModule } from '../config/permissions';
import { useAuth } from '../context/AuthContext';
import Forbidden from '../pages/errors/Forbidden';

function PrivateRoute({ adminOnly = false, permission }) {
  const { checkingSession, isAuthenticated, isAdmin, user } = useAuth();

  if (checkingSession) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if ((adminOnly && !isAdmin) || (permission && !canAccessModule(user?.rol, permission, user?.permissions))) {
    return <Forbidden />;
  }

  return <Outlet />;
}

export default PrivateRoute;
