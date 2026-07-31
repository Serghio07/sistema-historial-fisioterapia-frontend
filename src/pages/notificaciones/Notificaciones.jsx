import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarClock, CalendarDays, CheckCheck, Eye, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { getNotificaciones } from '../../services/notificacionService';
import { useAuth } from '../../context/AuthContext';

const storageKey = (userId) => `notificacionesLeidas:${userId || 'usuario'}`;
const readIds = (userId) => {
  try { return JSON.parse(localStorage.getItem(storageKey(userId)) || '[]'); }
  catch { return []; }
};

function Notificaciones() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('todas');
  const [read, setRead] = useState(() => readIds(user?.id));

  const load = async () => {
    setLoading(true);
    setError('');
    try { setItems(await getNotificaciones()); }
    catch (loadError) { setError(loadError.response?.data?.message || 'No se pudieron cargar las notificaciones.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => items.filter((item) => {
    if (filter === 'hoy') return item.es_hoy;
    if (filter === 'proximas') return !item.es_hoy;
    if (filter === 'no_leidas') return !read.includes(item.id);
    return true;
  }), [filter, items, read]);

  const markAll = () => {
    const ids = items.map((item) => item.id);
    localStorage.setItem(storageKey(user?.id), JSON.stringify(ids));
    setRead(ids);
    window.dispatchEvent(new Event('notifications:updated'));
  };

  const open = (item) => {
    const ids = [...new Set([...read, item.id])];
    localStorage.setItem(storageKey(user?.id), JSON.stringify(ids));
    setRead(ids);
    window.dispatchEvent(new Event('notifications:updated'));
    navigate('/citas', { state: { verCitaId: item.cita_id } });
  };

  return <div className="page-stack">
    {loading && <Loader />}
    <section className="hero-panel">
      <div>
        <p className="eyebrow">Centro de alertas</p>
        <h2 className="mt-1 text-2xl font-black md:text-3xl">Notificaciones</h2>
        <p className="mt-1 text-sm text-slate-500">Sesiones y citas programadas con datos actuales del sistema.</p>
      </div>
      <Bell size={38} className="text-brand-700" />
    </section>
    <section className="content-card p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex flex-wrap gap-2">
          {[['todas', 'Todas'], ['no_leidas', 'No leídas'], ['hoy', 'Hoy'], ['proximas', 'Próximas']].map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full border px-4 py-2 text-xs font-black ${filter === value ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{label}</button>)}
        </div>
        <div className="flex gap-2"><Button variant="secondary" onClick={() => void load()}><RefreshCw size={16} />Actualizar</Button><Button variant="secondary" onClick={markAll}><CheckCheck size={16} />Marcar leídas</Button></div>
      </div>
      {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="mt-4 grid gap-3">
        {visible.map((item) => {
          const unread = !read.includes(item.id);
          return <article key={item.id} className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40 ${unread ? 'border-brand-200 bg-brand-50/30' : 'border-slate-200 bg-white'}`}>
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${item.tipo === 'sesion' ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700'}`}>{item.tipo === 'sesion' ? <CalendarDays size={21} /> : <CalendarClock size={21} />}</span>
            <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong className="text-sm text-slate-900">{item.titulo}</strong>{unread && <i className="h-2 w-2 rounded-full bg-brand-600" />}</span><span className="mt-1 block text-sm font-semibold text-slate-600">{item.mensaje}</span><span className="mt-1 block text-xs text-slate-500">{item.es_hoy ? 'Hoy' : item.fecha} · {item.hora} · {item.estado}</span></span>
            <button type="button" onClick={() => open(item)} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-brand-200 bg-white px-4 text-xs font-black text-brand-700 transition hover:border-brand-500 hover:bg-brand-50"><Eye size={16} />Ver</button>
          </article>;
        })}
        {!loading && !visible.length && <div className="rounded-xl border border-dashed border-slate-200 py-14 text-center"><Bell className="mx-auto text-slate-300" /><p className="mt-3 font-semibold text-slate-500">No hay notificaciones en esta categoría.</p></div>}
      </div>
    </section>
  </div>;
}

export default Notificaciones;
