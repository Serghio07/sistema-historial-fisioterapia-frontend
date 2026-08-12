import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ExternalLink, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import { disconnectGoogleCalendar, getGoogleCalendarAuth, getGoogleCalendarStatus } from '../../services/googleCalendarService';

const formatDateTime = (value) => {
  if (!value) return 'No disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No disponible';
  return date.toLocaleString('es-BO');
};

function IntegrationStatusCard({ status, loading, onConnect, onDisconnect, busy }) {
  const connected = Boolean(status?.connected);

  return (
    <section className="dashboard-panel grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
      <div className="grid gap-3">
        <div className="flex items-start gap-3">
          <span className={`mt-1 grid h-12 w-12 place-items-center rounded-2xl ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            <CalendarDays size={22} />
          </span>
          <div>
            <p className="eyebrow">Integración</p>
            <h2 className="text-2xl font-black text-slate-900">Google Calendar</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Sincroniza las citas de Physio Active con el calendario del consultorio. La conexión se inicia desde este panel con la sesión de un Administrador.
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="detail-chip">
            <ShieldCheck size={14} />
            Estado: <span className={connected ? 'text-emerald-700' : 'text-slate-500'}>{loading ? 'Cargando...' : connected ? 'Conectado' : 'Desconectado'}</span>
          </div>
          <div className="detail-chip">
            <CalendarDays size={14} />
            Calendario: <span className="text-slate-800">{status?.calendarId || 'primary'}</span>
          </div>
          <div className="detail-chip">
            <RefreshCw size={14} />
            Conectado desde: <span className="text-slate-800">{formatDateTime(status?.connectedAt)}</span>
          </div>
          <div className="detail-chip">
            <RotateCcw size={14} />
            Actualización local: <span className="text-slate-800">{formatDateTime(status?.lastTokenUpdateAt)}</span>
          </div>
        </div>

        {!connected && !loading && (
          <p className="notice">Google Calendar aún no está vinculado. Usa el botón Conectar para iniciar el consentimiento OAuth.</p>
        )}
      </div>

      <div className="grid min-w-[220px] gap-2">
        <Button onClick={onConnect} disabled={busy || loading} className="w-full">
          <ExternalLink size={16} />
          Conectar Google Calendar
        </Button>
        <Button variant="secondary" onClick={onDisconnect} disabled={busy || loading || !connected} className="w-full">
          <RotateCcw size={16} />
          Desconectar
        </Button>
      </div>
    </section>
  );
}

export default function Integraciones() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const googleStatus = searchParams.get('google');

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getGoogleCalendarStatus();
      setStatus(data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el estado de Google Calendar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (googleStatus === 'connected') {
      setMessage('Google Calendar conectado correctamente.');
      const nextParams = new URLSearchParams(location.search);
      nextParams.delete('google');
      navigate({ pathname: location.pathname, search: nextParams.toString() ? `?${nextParams.toString()}` : '' }, { replace: true });
      void loadStatus();
    }
  }, [googleStatus, location.pathname, location.search, loadStatus, navigate]);

  const handleConnect = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const data = await getGoogleCalendarAuth();
      if (!data?.authUrl) {
        throw new Error('El backend no devolvió la URL de autorización.');
      }
      window.location.href = data.authUrl;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'No se pudo iniciar la conexión con Google Calendar.');
      setBusy(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (!window.confirm('¿Deseas desconectar Google Calendar?\nLas nuevas citas dejarán de sincronizarse hasta volver a conectarlo.')) return;
    setBusy(true);
    setError('');
    try {
      await disconnectGoogleCalendar();
      setStatus((current) => ({ ...(current || {}), connected: false }));
      setMessage('Google Calendar desconectado correctamente.');
      await loadStatus();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo desconectar Google Calendar.');
    } finally {
      setBusy(false);
    }
  }, [loadStatus]);

  const title = useMemo(() => (isAdmin ? 'Integraciones' : 'Acceso restringido'), [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="page-stack">
        <section className="module-hero">
          <div>
            <p className="eyebrow">Configuración</p>
            <h1 className="mt-1 text-2xl font-black md:text-3xl">Integraciones</h1>
            <p className="mt-2 text-sm text-slate-500">Esta sección solo está disponible para Administrador.</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack configuracion-integraciones">
      {loading && <Loader />}
      <section className="module-hero">
        <div>
          <p className="eyebrow">Configuración</p>
          <h1 className="mt-1 text-2xl font-black md:text-3xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Gestiona la conexión entre Physio Active y los servicios externos autorizados. La sincronización de Google Calendar permanece en un solo sentido: desde Physio Active hacia Google.
          </p>
        </div>
      </section>

      {message && <p className="notice">{message}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <IntegrationStatusCard
        status={status}
        loading={loading}
        busy={busy}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      <section className="dashboard-panel grid gap-3">
        <h3 className="text-lg font-black text-slate-900">Contrato operativo</h3>
        <p className="text-sm leading-6 text-slate-500">
          El botón Conectar usa el cliente autenticado para pedir al backend la URL OAuth. Luego el navegador sale a Google, el callback valida el <code>state</code> y el sistema regresa a esta pantalla con el estado actualizado.
        </p>
      </section>
    </div>
  );
}