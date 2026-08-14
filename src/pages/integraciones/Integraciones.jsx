import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Link2, MessageCircle, RefreshCw, Send, Unplug, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import {
  disconnectGoogle,
  getGoogleAuthUrl,
  getGoogleStatus,
  getWhatsAppStatus,
  sendWhatsAppTest,
  verifyWhatsApp
} from '../../services/integracionesService';

const googleCallbackMessages = {
  connected: ['success', 'Google Calendar conectado correctamente.'],
  cancelled: ['error', 'La conexión con Google Calendar fue cancelada.'],
  error: ['error', 'No se pudo conectar Google Calendar. Inténtalo nuevamente.']
};

const verificationLabels = {
  VALIDO: 'Conexión activa',
  DESHABILITADO: 'WhatsApp está deshabilitado',
  NO_VERIFICADO: 'Conexión no verificada',
  TOKEN_INVALIDO: 'La autorización de WhatsApp no es válida',
  PERMISOS_INSUFICIENTES: 'La integración no tiene permisos suficientes',
  ERROR_META: 'Meta no pudo verificar la conexión',
  TIMEOUT: 'La verificación tardó demasiado',
  ERROR_RED: 'No se pudo conectar con Meta'
};

const formatDate = (value) => {
  if (!value) return 'Sin datos';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sin datos' : date.toLocaleString('es-BO');
};

const notify = (type, message) => window.dispatchEvent(new CustomEvent(type === 'success' ? 'app:success' : 'app:error', { detail: { message } }));
const normalizePhone = (value) => value.replace(/[\s()+-]/g, '');
const validBolivianPhone = (value) => /^(?:591)?[67]\d{7}$/.test(normalizePhone(value));

function StatusBadge({ active, activeText = 'Conectado', inactiveText = 'Desconectado' }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}{active ? activeText : inactiveText}</span>;
}

function Integraciones() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [google, setGoogle] = useState(null);
  const [whatsapp, setWhatsapp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [testOpen, setTestOpen] = useState(false);
  const [googleDetailsOpen, setGoogleDetailsOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const loadStatuses = useCallback(async () => {
    setLoading(true);
    setError('');
    const [googleResult, whatsappResult] = await Promise.allSettled([getGoogleStatus(), getWhatsAppStatus()]);
    if (googleResult.status === 'fulfilled') setGoogle(googleResult.value);
    if (whatsappResult.status === 'fulfilled') setWhatsapp(whatsappResult.value);
    if (googleResult.status === 'rejected' || whatsappResult.status === 'rejected') setError('No fue posible consultar todas las integraciones. Puedes volver a intentarlo.');
    setLoading(false);
  }, []);

  useEffect(() => { void loadStatuses(); }, [loadStatuses]);

  useEffect(() => {
    const result = searchParams.get('google');
    if (!googleCallbackMessages[result]) return;
    const [type, message] = googleCallbackMessages[result];
    notify(type, message);
    navigate('/integraciones', { replace: true });
  }, [navigate, searchParams]);

  const connectGoogle = async () => {
    setBusy('google-connect');
    try {
      const { authUrl } = await getGoogleAuthUrl();
      if (!authUrl || !/^https:\/\//i.test(authUrl)) throw new Error('El servidor no devolvió una URL de autorización válida.');
      window.location.assign(authUrl);
    } catch (requestError) {
      notify('error', requestError.message || 'No se pudo iniciar la conexión con Google Calendar.');
      setBusy('');
    }
  };

  const removeGoogle = async () => {
    const confirmation = await Swal.fire({
      icon: 'warning',
      title: '¿Desconectar Google Calendar?',
      text: 'Las nuevas citas dejarán de sincronizarse hasta volver a conectarlo.',
      showCancelButton: true,
      confirmButtonText: 'Desconectar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#DC2626'
    });
    if (!confirmation.isConfirmed) return;
    setBusy('google-disconnect');
    try {
      const result = await disconnectGoogle();
      setGoogle({ connected: false });
      notify('success', result.revocation === 'FAILED' ? 'Google Calendar fue desconectado localmente.' : 'Google Calendar fue desconectado.');
    } catch (requestError) {
      notify('error', requestError.message || 'No se pudo desconectar Google Calendar.');
    } finally { setBusy(''); }
  };

  const openGoogleDetails = async () => {
    setBusy('google-details');
    try {
      const currentStatus = await getGoogleStatus();
      setGoogle(currentStatus);
      setGoogleDetailsOpen(true);
    } catch (requestError) {
      notify('error', requestError.message || 'No se pudieron cargar los detalles de Google Calendar.');
    } finally { setBusy(''); }
  };

  const checkWhatsApp = async () => {
    setBusy('whatsapp-verify');
    try {
      const result = await verifyWhatsApp();
      const status = result.status || result.estado || result.lastVerificationStatus;
      setWhatsapp((current) => ({ ...current, ...result, lastVerificationStatus: status, lastVerification: result.lastVerification || new Date().toISOString() }));
      notify(status === 'VALIDO' ? 'success' : 'error', result.message || verificationLabels[status] || 'Verificación completada.');
    } catch (requestError) {
      notify('error', requestError.status === 429 ? 'Espera 30 segundos antes de verificar nuevamente.' : requestError.message || 'No se pudo verificar WhatsApp.');
    } finally { setBusy(''); }
  };

  const submitTest = async (event) => {
    event.preventDefault();
    if (!validBolivianPhone(phone)) { setPhoneError('Ingresa 8 dígitos bolivianos o el número con prefijo 591.'); return; }
    setPhoneError('');
    setBusy('whatsapp-test');
    try {
      const result = await sendWhatsAppTest(normalizePhone(phone));
      if (!result.success) throw new Error(result.message || 'WhatsApp rechazó el mensaje de prueba.');
      setTestOpen(false);
      setPhone('');
      notify('success', result.message || 'Mensaje enviado correctamente.');
    } catch (requestError) {
      setPhoneError(requestError.message || 'No se pudo enviar el mensaje de prueba.');
    } finally { setBusy(''); }
  };

  return <div className="page-stack">
    {loading && <Loader />}
    <section className="hero-panel">
      <div><p className="eyebrow">Configuración</p><h1 className="mt-1 text-2xl font-black">Integraciones</h1><p className="text-sm text-slate-500">Administra conexiones externas seguras de Physio Active.</p></div>
      <Link2 size={38} className="text-brand-700" />
    </section>
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800"><span>{error}</span><Button variant="secondary" onClick={loadStatuses}><RefreshCw size={16} />Reintentar</Button></div>}
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="content-card flex flex-col gap-5 p-5">
        <header className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><CalendarDays size={23} /></span><div><h2 className="text-lg font-black">Google Calendar</h2><p className="mt-1 text-sm text-slate-500">Sincroniza las citas de Physio Active con el calendario del consultorio.</p></div></div>{google && <StatusBadge active={google.connected} />}</header>
        {!google && !loading ? <p className="text-sm text-slate-500">No se pudo consultar la conexión.</p> : google && <div className="grid gap-2 rounded-xl bg-slate-50 p-4 text-sm"><p><b>Estado:</b> {google.connected ? 'Conectado' : google.reason === 'AUTHORIZATION_INVALID' ? 'Autorización inválida' : 'Desconectado'}</p>{google.connected && <><p><b>Calendario:</b> {google.calendarId || 'Sin datos'}</p><p><b>Conectado desde:</b> {formatDate(google.connectedAt)}</p></>}</div>}
        <div className="mt-auto flex flex-wrap gap-2">{google?.connected ? <><Button variant="secondary" onClick={openGoogleDetails} disabled={Boolean(busy)}><RefreshCw size={16} />{busy === 'google-details' ? 'Cargando...' : 'Ver detalles'}</Button><Button variant="danger" onClick={removeGoogle} disabled={Boolean(busy)}><Unplug size={16} />{busy === 'google-disconnect' ? 'Desconectando...' : 'Desconectar'}</Button></> : <Button onClick={connectGoogle} disabled={Boolean(busy) || !google}><Link2 size={16} />{busy === 'google-connect' ? 'Preparando conexión...' : 'Conectar Google Calendar'}</Button>}</div>
        <p className="text-xs text-slate-400">Sincronización unidireccional: Physio Active → Google Calendar.</p>
      </article>

      <article className="content-card flex flex-col gap-5 p-5">
        <header className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><MessageCircle size={23} /></span><div><h2 className="text-lg font-black">WhatsApp Business</h2><p className="mt-1 text-sm text-slate-500">Automatización de citas y comunicación con pacientes.</p></div></div>{whatsapp && <StatusBadge active={whatsapp.enabled && whatsapp.configured} activeText="Activo" inactiveText="Inactivo" />}</header>
        {!whatsapp && !loading ? <p className="text-sm text-slate-500">No se pudo consultar la configuración.</p> : whatsapp && <div className="grid gap-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2"><p><b>Servicio:</b> {whatsapp.enabled ? 'Habilitado' : 'Deshabilitado'}</p><p><b>Configuración:</b> {whatsapp.configured ? 'Completa' : 'Incompleta'}</p><p><b>Número:</b> {whatsapp.phoneNumberConfigured ? 'Configurado' : 'No configurado'}</p><p><b>Webhook:</b> {whatsapp.webhookConfigured ? 'Configurado' : 'No configurado'}</p><p><b>Versión API:</b> {whatsapp.apiVersion || 'Sin datos'}</p><p><b>Última verificación:</b> {formatDate(whatsapp.lastVerification)}</p>{whatsapp.lastVerificationStatus && <p className="sm:col-span-2"><b>Resultado:</b> {verificationLabels[whatsapp.lastVerificationStatus] || whatsapp.lastVerificationStatus}</p>}</div>}
        <div className="mt-auto flex flex-wrap gap-2"><Button variant="secondary" onClick={checkWhatsApp} disabled={Boolean(busy) || !whatsapp}><RefreshCw size={16} />{busy === 'whatsapp-verify' ? 'Verificando...' : 'Verificar conexión'}</Button><Button onClick={() => { setPhoneError(''); setTestOpen(true); }} disabled={Boolean(busy) || !whatsapp?.enabled || !whatsapp?.configured}><Send size={16} />Enviar prueba</Button></div>
      </article>
    </section>
    <Modal open={googleDetailsOpen} title="Detalles de Google Calendar" subtitle="Configuración y estado de la sincronización" onClose={() => setGoogleDetailsOpen(false)} size="md" closeOnBackdrop closeOnEscape>
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          <span className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-blue-700 shadow-sm"><CalendarDays size={23} /></span><strong className="text-base text-slate-900">Google Calendar</strong></span>
          <StatusBadge active={Boolean(google?.connected)} />
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4"><dt className="text-xs font-black uppercase tracking-wide text-slate-400">Estado</dt><dd className="mt-1 font-bold text-slate-800">{google?.connected ? 'Conectado' : 'Desconectado'}</dd></div>
          <div className="rounded-xl border border-slate-200 p-4"><dt className="text-xs font-black uppercase tracking-wide text-slate-400">Cuenta conectada</dt><dd className="mt-1 break-all font-bold text-slate-800">{google?.accountEmail || 'No disponible'}</dd></div>
          <div className="rounded-xl border border-slate-200 p-4"><dt className="text-xs font-black uppercase tracking-wide text-slate-400">Calendario</dt><dd className="mt-1 font-bold text-slate-800">{google?.calendarId ? `${google.calendarId}${google.calendarId === 'primary' ? ' (Calendario principal)' : ''}` : 'No disponible'}</dd></div>
          <div className="rounded-xl border border-slate-200 p-4"><dt className="text-xs font-black uppercase tracking-wide text-slate-400">Conectado desde</dt><dd className="mt-1 font-bold text-slate-800">{formatDate(google?.connectedAt).replace('Sin datos', 'No disponible')}</dd></div>
          <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2"><dt className="text-xs font-black uppercase tracking-wide text-slate-400">Última sincronización</dt><dd className="mt-1 font-bold text-slate-800">{google?.lastSyncAt ? formatDate(google.lastSyncAt) : 'No disponible'}</dd></div>
        </dl>

        <section className="border-t border-slate-200 pt-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Tipo de sincronización</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-4 font-black text-slate-800"><span>Physio Active</span><ArrowRight size={18} className="text-brand-600" /><span>Google Calendar</span></div>
          <h3 className="mt-4 font-black text-slate-900">Sincronización unidireccional</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">Las citas administradas desde Physio Active se sincronizan con Google Calendar. Los cambios realizados directamente desde Google Calendar no modifican la información de Physio Active.</p>
          <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            {['Creación de citas', 'Actualización de citas', 'Reprogramación', 'Cancelación o eliminación del evento'].map((operation) => <li key={operation} className="flex items-center gap-2"><CheckCircle2 size={15} className="shrink-0 text-emerald-600" />{operation}</li>)}
          </ul>
        </section>

        <div className="flex justify-end border-t border-slate-200 pt-4"><Button variant="secondary" onClick={() => setGoogleDetailsOpen(false)}>Cerrar</Button></div>
      </div>
    </Modal>
    <Modal open={testOpen} title="Enviar mensaje de prueba" subtitle="El número se utilizará únicamente para esta prueba." onClose={() => { if (!busy) { setTestOpen(false); setPhoneError(''); } }} size="sm">
      <form onSubmit={submitTest} className="grid gap-4"><Input label="Número de WhatsApp" type="tel" inputMode="tel" autoComplete="tel" placeholder="76543210 o 59176543210" value={phone} onChange={(event) => setPhone(event.target.value)} error={phoneError} /><p className="text-xs text-slate-500">Meta puede rechazar texto libre fuera de la ventana de conversación de 24 horas.</p><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setTestOpen(false)} disabled={busy === 'whatsapp-test'}>Cancelar</Button><Button type="submit" disabled={busy === 'whatsapp-test'}><Send size={16} />{busy === 'whatsapp-test' ? 'Enviando...' : 'Enviar prueba'}</Button></div></form>
    </Modal>
  </div>;
}

export default Integraciones;
