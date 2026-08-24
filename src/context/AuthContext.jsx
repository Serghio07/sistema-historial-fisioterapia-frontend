import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, getStoredUser, loginRequest, saveSession } from '../services/authService';
import { getProfesionalesActivos } from '../services/usuarioService';
import { getMyPermissions } from '../services/rolePermissionService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(() => Boolean(getStoredUser()));

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setCheckingSession(false);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setCheckingSession(false);
      return undefined;
    }

    let active = true;
    setCheckingSession(true);

    Promise.all([getProfesionalesActivos(), getMyPermissions()])
      .then(([profesionales, access]) => {
        if (!active) return;
        const actualizado = profesionales.find((item) => String(item.id) === String(user.id));
        if (!actualizado) {
          clearSession();
          setUser(null);
          return;
        }
        const perfil = { ...user, ...actualizado, permissions: access.permissions };
        saveSession({ usuario: perfil });
        setUser(perfil);
      })
      .catch(() => {
        if (!active) return;
        clearSession();
        setUser(null);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const session = await loginRequest(credentials);
      const access = await getMyPermissions();
      session.usuario = { ...session.usuario, permissions: access.permissions };
      saveSession(session);
      setUser(session.usuario);
      setCheckingSession(false);
      return session.usuario;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  const updateCurrentUser = (updatedUser) => {
    saveSession({ usuario: updatedUser });
    setUser(updatedUser);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      checkingSession,
      isAuthenticated: Boolean(user),
      isAdmin: user?.rol === 'admin',
      login,
      updateCurrentUser,
      logout
    }),
    [user, loading, checkingSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
