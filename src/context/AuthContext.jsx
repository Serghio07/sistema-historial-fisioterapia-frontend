import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, getStoredUser, loginRequest, saveSession } from '../services/authService';
import { getProfesionalesActivos } from '../services/usuarioService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getProfesionalesActivos()
      .then((profesionales) => {
        const actualizado = profesionales.find((item) => String(item.id) === String(user.id));
        if (!actualizado) return;
        const perfil = { ...user, ...actualizado };
        saveSession({ usuario: perfil });
        setUser(perfil);
      })
      .catch(() => {});
  }, [user?.id]);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const session = await loginRequest(credentials);
      saveSession(session);
      setUser(session.usuario);
      return session.usuario;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.rol === 'admin',
      login,
      logout
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
