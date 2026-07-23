import { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  Check,
  Clock3,
  Contact,
  Eye,
  FilePenLine,
  FilterX,
  LockKeyhole,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  UserCog,
  UserRoundX,
  UserRoundCheck,
  UsersRound,
  X
} from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { Avatar } from '../../components/common/ProfilePhoto';
import UsuarioForm from './UsuarioForm';
import { createUsuario, getUsuarios, reviewAccessRequest, updateUsuario, updateUsuarioEstado } from '../../services/usuarioService';
import { formatDate } from '../../utils/formatDate';

const initialForm = {
  nombre: '',
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  ci: '',
  titulo_profesional: '',
  cargo: '',
  dias_trabajo: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
  hora_entrada: '08:00',
  hora_salida: '17:00',
  sueldo_base: '',
  tipo_pago: 'mensual',
  direccion: '',
  fecha_ingreso: new Date().toISOString().slice(0, 10),
  observaciones: '',
  usuario: '',
  email: '',
  telefono: '',
  foto: null,
  password: '',
  rol: 'personal',
  estado: 'activo'
};

const tabs = [
  { id: 'activos', label: 'Usuarios activos', icon: UserRoundCheck },
  { id: 'pendientes', label: 'Solicitudes pendientes', icon: Clock3 },
  { id: 'inactivos', label: 'Inactivos', icon: UserRoundX },
  { id: 'bloqueados', label: 'Bloqueados', icon: LockKeyhole }
];

const statusTone = {
  activo: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pendiente: 'bg-amber-50 text-amber-700 ring-amber-200',
  bloqueado: 'bg-red-50 text-red-700 ring-red-200',
  inactivo: 'bg-slate-100 text-slate-600 ring-slate-200',
  rechazado: 'bg-slate-100 text-slate-600 ring-slate-200'
};

const statusLabel = {
  activo: 'Activo',
  pendiente: 'Pendiente',
  bloqueado: 'Bloqueado',
  inactivo: 'Inactivo',
  rechazado: 'Rechazado'
};

const SYSTEM_TIME_ZONE = 'America/La_Paz';
const dayLabels = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo'
};

function Badge({ children, tone }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${tone}`}>{children}</span>;
}

function SummaryCard({ label, value, description, icon: Icon, tone }) {
  return (
    <article className={`rounded-xl border p-4 shadow-sm ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{label}</p>
          <strong className="mt-2 block text-3xl text-slate-900">{value}</strong>
          <span className="mt-1 block text-xs opacity-75">{description}</span>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/80 shadow-sm"><Icon size={20} /></span>
      </div>
    </article>
  );
}

function formatAccess(value) {
  if (!value) return 'Sin acceso registrado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin acceso registrado';

  const dateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: SYSTEM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
  const todayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: SYSTEM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
  const sameDay = dateKey === todayKey;
  const time = new Intl.DateTimeFormat('es-BO', {
    timeZone: SYSTEM_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
  if (sameDay) return `Hoy, ${time}`;
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: SYSTEM_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

function isAccessToday(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SYSTEM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date) === formatter.format(new Date());
}

function formatRequestDate(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function UsuarioIdentity({ usuario, compact = false }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar
        src={usuario.foto}
        name={usuario.nombre || usuario.usuario}
        size={compact ? 'sm' : 'md'}
        className={compact ? '' : '!h-11 !w-11'}
      />
      <div className="min-w-0">
        <strong className="block truncate text-sm text-slate-900">{usuario.nombre}</strong>
        <span className="block truncate text-xs text-slate-500">@{usuario.usuario}</span>
      </div>
    </div>
  );
}

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [activeTab, setActiveTab] = useState('activos');
  const [query, setQuery] = useState('');
  const [rolFilter, setRolFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = async () => {
    setLoading(true);
    try {
      setUsuarios(await getUsuarios());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    total: usuarios.length,
    admin: usuarios.filter((item) => item.rol === 'admin').length,
    personal: usuarios.filter((item) => item.rol === 'personal').length,
    pendientes: usuarios.filter((item) => item.estado === 'pendiente').length,
    inactivos: usuarios.filter((item) => item.estado === 'inactivo').length,
    bloqueados: usuarios.filter((item) => item.estado === 'bloqueado').length
  }), [usuarios]);

  const visibleUsers = useMemo(() => {
    const tabUsers = usuarios.filter((item) => {
      if (activeTab === 'pendientes') return item.estado === 'pendiente';
      if (activeTab === 'inactivos') return item.estado === 'inactivo';
      if (activeTab === 'bloqueados') return item.estado === 'bloqueado';
      return !['pendiente', 'bloqueado', 'inactivo', 'rechazado'].includes(item.estado);
    });
    const term = query.trim().toLowerCase();
    return tabUsers.filter((item) => {
      const matchesSearch = !term || `${item.nombre} ${item.usuario} ${item.email || ''}`.toLowerCase().includes(term);
      const matchesRole = !rolFilter || item.rol === rolFilter;
      const matchesStatus = !estadoFilter || item.estado === estadoFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [usuarios, activeTab, query, rolFilter, estadoFilter]);
  const paginatedUsers = visibleUsers.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [activeTab, query, rolFilter, estadoFilter, pageSize]);

  const clearFeedback = () => {
    setMessage('');
    setError('');
  };

  const openCreate = () => {
    clearFeedback();
    setEditing(null);
    setForm(initialForm);
    setShowFormModal(true);
  };

  const openEdit = (usuario) => {
    clearFeedback();
    setEditing(usuario.id);
    setForm({ ...initialForm, ...usuario, ...(usuario.ficha_personal || {}), password: '' });
    setSelectedUsuario(null);
    setShowFormModal(true);
  };

  const submitUser = async (event) => {
    event.preventDefault();
    clearFeedback();
    const payload = {
      nombre: [form.nombres, form.apellido_paterno, form.apellido_materno].filter(Boolean).join(' '),
      nombres: form.nombres?.trim(),
      apellido_paterno: form.apellido_paterno?.trim(),
      apellido_materno: form.apellido_materno?.trim() || null,
      ci: form.ci?.trim(),
      titulo_profesional: form.titulo_profesional || null,
      cargo: form.cargo?.trim(),
      dias_trabajo: form.dias_trabajo,
      hora_entrada: form.hora_entrada,
      hora_salida: form.hora_salida,
      sueldo_base: form.tipo_pago === 'por_servicio' ? null : form.sueldo_base,
      tipo_pago: form.tipo_pago,
      direccion: form.direccion?.trim() || null,
      fecha_ingreso: form.fecha_ingreso,
      observaciones: form.observaciones?.trim() || null,
      usuario: form.usuario.trim(),
      email: form.email?.trim() || null,
      telefono: form.telefono?.trim() || null,
      foto: form.foto || null,
      rol: editing ? form.rol : 'personal',
      estado: form.estado
    };
    if (!payload.nombres || !payload.apellido_paterno || !payload.ci || !payload.cargo || !payload.fecha_ingreso || !payload.usuario || !payload.email) {
      setError('Nombre, usuario y correo electrónico son obligatorios.');
      return;
    }
    if (!payload.dias_trabajo.length || !payload.hora_entrada || !payload.hora_salida) {
      setError('Selecciona los dias y el horario de trabajo.');
      return;
    }
    if (form.password?.trim()) payload.password = form.password.trim();
    if (!editing && !payload.password) {
      setError('La contraseña es obligatoria para crear el personal.');
      return;
    }
    try {
      if (editing) await updateUsuario(editing, payload);
      else await createUsuario(payload);
      if (payload.estado === 'inactivo') setActiveTab('inactivos');
      if (payload.estado === 'bloqueado') setActiveTab('bloqueados');
      if (payload.estado === 'activo') setActiveTab('activos');
      setEstadoFilter('');
      setShowFormModal(false);
      setForm(initialForm);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const review = async (usuario, decision) => {
    clearFeedback();
    try {
      await reviewAccessRequest(usuario.id, decision);
      setSelectedUsuario(null);
      setConfirmation(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const changeStatus = async (usuario, estado) => {
    clearFeedback();
    try {
      await updateUsuarioEstado(usuario.id, estado);
      setSelectedUsuario(null);
      setConfirmation(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const askBlock = (usuario) => setConfirmation({
    title: 'Bloquear cuenta',
    text: '¿Deseas bloquear esta cuenta? El usuario no podrá iniciar sesión hasta que sea reactivado.',
    confirmLabel: 'Bloquear cuenta',
    danger: true,
    action: () => changeStatus(usuario, 'bloqueado')
  });

  const askReject = (usuario) => setConfirmation({
    title: 'Rechazar solicitud',
    text: `¿Deseas rechazar la solicitud de ${usuario.nombre}? La cuenta no podrá iniciar sesión.`,
    confirmLabel: 'Rechazar solicitud',
    danger: true,
    action: () => review(usuario, 'rechazar')
  });

  const renderActions = (usuario) => (
    <div className="flex justify-end gap-1.5">
      <ActionButton label="Ver detalle" icon={Eye} tone="view" className="h-9 w-9" onClick={() => setSelectedUsuario(usuario)} />
      {activeTab === 'pendientes' ? (
        <>
          <ActionButton label="Aprobar solicitud" icon={Check} tone="edit" className="h-9 w-9" onClick={() => review(usuario, 'aprobar')} />
          <ActionButton label="Rechazar solicitud" icon={X} tone="delete" className="h-9 w-9" onClick={() => askReject(usuario)} />
        </>
      ) : ['bloqueados', 'inactivos'].includes(activeTab) ? (
        <ActionButton label="Reactivar cuenta" icon={ShieldCheck} tone="edit" className="h-9 w-9" onClick={() => changeStatus(usuario, 'activo')} />
      ) : (
        <>
          {usuario.rol !== 'admin' && <ActionButton label="Editar usuario" icon={FilePenLine} tone="edit" className="h-9 w-9" onClick={() => openEdit(usuario)} />}
          {usuario.rol !== 'admin' && <ActionButton label="Bloquear cuenta" icon={Ban} tone="delete" className="h-9 w-9" onClick={() => askBlock(usuario)} />}
        </>
      )}
    </div>
  );

  return (
    <section className="grid gap-5">
      {loading && <Loader />}

      <header className="module-hero flex flex-wrap items-center justify-between rounded-xl">
        <div>
          <p className="text-sm font-bold text-brand-700">Administración</p>
          <h2 className="mt-1 text-3xl font-black text-brand-900">Usuarios</h2>
          <span className="mt-1 block text-sm text-brand-900/70">Gestión de accesos, solicitudes y estado del personal.</span>
        </div>
        <Button onClick={openCreate} className="min-h-11 px-4">
          <Plus size={18} />
          Crear personal
        </Button>
      </header>

      {message && <p className="notice">{message}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total usuarios" value={counts.total} description="Cuentas registradas" icon={UsersRound} tone="border-emerald-100 bg-emerald-50/70 text-emerald-700" />
        <SummaryCard label="Doctor / Administrador" value={counts.admin} description="Administración principal" icon={Stethoscope} tone="border-blue-100 bg-blue-50/70 text-blue-700" />
        <SummaryCard label="Personal" value={counts.personal} description="Equipo del centro" icon={UserRoundCheck} tone="border-cyan-100 bg-cyan-50/70 text-cyan-700" />
        <SummaryCard label="Solicitudes pendientes" value={counts.pendientes} description="Requieren revisión" icon={Clock3} tone="border-amber-100 bg-amber-50/70 text-amber-700" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
        <nav className="flex overflow-x-auto border-b border-slate-200 px-3" aria-label="Vistas de usuarios">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`relative flex min-w-max items-center gap-2 px-4 py-4 text-sm font-bold transition ${
                  selected ? 'text-brand-700' : 'text-slate-500 hover:text-slate-800'
                }`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setEstadoFilter('');
                }}
              >
                <Icon size={17} />
                {tab.label}
                {tab.id === 'pendientes' && counts.pendientes > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{counts.pendientes}</span>
                )}
                {tab.id === 'inactivos' && counts.inactivos > 0 && (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">{counts.inactivos}</span>
                )}
                {tab.id === 'bloqueados' && counts.bloqueados > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">{counts.bloqueados}</span>
                )}
                {selected && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-600" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_180px_auto]">
            <label className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="min-h-11 w-full rounded-lg border-slate-200 pl-10 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500/20"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre, usuario o correo…"
              />
            </label>
            <Input
              label=""
              value={rolFilter}
              onChange={(event) => setRolFilter(event.target.value)}
              options={[
                { value: '', label: 'Todos los roles' },
                { value: 'admin', label: 'Doctor / Administrador' },
                { value: 'personal', label: 'Personal' }
              ]}
            />
            <Input
              label=""
              value={estadoFilter}
              onChange={(event) => {
                const estado = event.target.value;
                setEstadoFilter(estado);
                if (estado === 'activo') setActiveTab('activos');
                if (estado === 'pendiente') setActiveTab('pendientes');
                if (estado === 'inactivo') setActiveTab('inactivos');
                if (estado === 'bloqueado') setActiveTab('bloqueados');
              }}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'activo', label: 'Activo' },
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'bloqueado', label: 'Bloqueado' },
                { value: 'inactivo', label: 'Inactivo' }
              ]}
            />
            <Button
              variant="ghost"
              className="min-h-11"
              onClick={() => {
                setQuery('');
                setRolFilter('');
                setEstadoFilter('');
              }}
            >
              <FilterX size={17} />
              Limpiar
            </Button>
          </div>

          <div className="mt-4 hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead className="bg-slate-50 text-xs font-black text-slate-500">
                <tr>
                  <th className="px-4 py-3">{activeTab === 'pendientes' ? 'Solicitante' : 'Usuario'}</th>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3">{activeTab === 'pendientes' ? 'Fecha de solicitud' : 'Rol'}</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">{['bloqueados', 'inactivos'].includes(activeTab) ? 'Fecha de cambio' : activeTab === 'pendientes' ? 'Usuario' : 'Último acceso'}</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUsers.map((usuario) => (
                  <tr key={usuario.id} className="transition hover:bg-brand-50/35">
                    <td className="px-4 py-3"><UsuarioIdentity usuario={usuario} compact /></td>
                    <td className="px-4 py-3 text-sm text-slate-600">{usuario.email || 'Sin correo'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {activeTab === 'pendientes'
                        ? formatRequestDate(usuario.created_at)
                        : <Badge tone={usuario.rol === 'admin' ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-cyan-50 text-cyan-700 ring-cyan-200'}>{usuario.rol === 'admin' ? 'Doctor / Administrador' : 'Personal'}</Badge>}
                    </td>
                    <td className="px-4 py-3"><Badge tone={statusTone[usuario.estado]}>{statusLabel[usuario.estado] || usuario.estado}</Badge></td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {activeTab === 'pendientes' ? `@${usuario.usuario}` : ['bloqueados', 'inactivos'].includes(activeTab) ? formatRequestDate(usuario.updated_at) : formatAccess(usuario.ultimo_acceso)}
                    </td>
                    <td className="px-4 py-3">{renderActions(usuario)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 md:hidden">
            {paginatedUsers.map((usuario) => (
              <article key={usuario.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <UsuarioIdentity usuario={usuario} />
                  <Badge tone={statusTone[usuario.estado]}>{statusLabel[usuario.estado] || usuario.estado}</Badge>
                </div>
                <dl className="mt-4 grid gap-2 text-sm">
                  <div><dt className="text-xs font-bold text-slate-400">Correo</dt><dd className="truncate text-slate-700">{usuario.email || 'Sin correo'}</dd></div>
                  <div><dt className="text-xs font-bold text-slate-400">{activeTab === 'pendientes' ? 'Solicitud' : 'Último acceso'}</dt><dd className="text-slate-700">{activeTab === 'pendientes' ? formatRequestDate(usuario.created_at) : formatAccess(usuario.ultimo_acceso)}</dd></div>
                </dl>
                <div className="mt-4 border-t border-slate-100 pt-3">{renderActions(usuario)}</div>
              </article>
            ))}
          </div>

          {visibleUsers.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <UsersRound size={30} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-bold text-slate-600">No hay usuarios para mostrar.</p>
              <span className="mt-1 block text-xs text-slate-400">Prueba cambiando la búsqueda o los filtros.</span>
            </div>
          )}
          <Pagination total={visibleUsers.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </div>

      <Modal open={showFormModal} title={editing ? 'Editar usuario' : 'Crear personal'} onClose={() => setShowFormModal(false)} size="md">
        <UsuarioForm form={form} setForm={setForm} editing={editing} onSubmit={submitUser} onCancel={() => setShowFormModal(false)} />
      </Modal>

      <Modal
        open={Boolean(selectedUsuario)}
        title="Detalle del usuario"
        subtitle="Información general, acceso y estado de la cuenta."
        onClose={() => setSelectedUsuario(null)}
        size="md"
      >
        {selectedUsuario && (
          <div className="grid max-h-[72vh] gap-5 overflow-y-auto pr-1">
            <section className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-cyan-50 p-5">
              <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-cyan-100/60 blur-2xl" />
              <div className="relative flex flex-wrap items-center gap-4">
                <Avatar src={selectedUsuario.foto} name={selectedUsuario.nombre || selectedUsuario.usuario} size="lg" />
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-xl text-slate-900">{selectedUsuario.nombre}</strong>
                  <span className="mt-1 block text-sm font-semibold text-slate-500">@{selectedUsuario.usuario}</span>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700">
                    {selectedUsuario.rol === 'admin' ? <Stethoscope size={15} /> : <UserCog size={15} />}
                    {selectedUsuario.rol === 'admin' ? 'Doctor / Administrador' : 'Personal'}
                  </span>
                </div>
                <Badge tone={statusTone[selectedUsuario.estado]}>
                  {statusLabel[selectedUsuario.estado] || selectedUsuario.estado}
                </Badge>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2">
                <Contact size={18} className="text-brand-600" />
                <h3 className="text-sm font-black text-slate-800">Información de contacto</h3>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <dt className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Mail size={14} className="text-sky-600" />
                    Correo electrónico
                  </dt>
                  <dd className="mt-2 truncate text-sm font-bold text-slate-900">
                    {selectedUsuario.email ? (
                      <a className="text-sky-700 transition hover:text-blue-800 hover:underline" href={`mailto:${selectedUsuario.email}`}>
                        {selectedUsuario.email}
                      </a>
                    ) : 'No registrado'}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <dt className="text-xs font-bold text-slate-500">Teléfono</dt>
                  <dd className="mt-2 text-sm font-bold text-slate-900">{selectedUsuario.telefono || 'No registrado'}</dd>
                </div>
              </dl>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-600" />
                <h3 className="text-sm font-black text-slate-800">Acceso al sistema</h3>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <dt className="text-xs font-bold text-slate-500">Tipo de usuario</dt>
                  <dd className="mt-2 text-sm font-bold text-slate-900">
                    {selectedUsuario.rol === 'admin' ? 'Doctor / Administrador' : 'Personal'}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <dt className="text-xs font-bold text-slate-500">Estado de cuenta</dt>
                  <dd className="mt-2">
                    <Badge tone={statusTone[selectedUsuario.estado]}>
                      {statusLabel[selectedUsuario.estado] || selectedUsuario.estado}
                    </Badge>
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2">
                  <dt className="text-xs font-bold text-slate-500">Último acceso</dt>
                  <dd className="mt-2 text-sm font-bold text-slate-900">{formatAccess(selectedUsuario.ultimo_acceso)}</dd>
                  {isAccessToday(selectedUsuario.ultimo_acceso) && (
                    <span className="mt-1 block text-xs font-semibold text-emerald-600">Acceso reciente</span>
                  )}
                  <span className="mt-1 block text-xs text-slate-400">Hora de Bolivia (GMT-4)</span>
                </div>
              </dl>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2">
                <Clock3 size={18} className="text-emerald-600" />
                <h3 className="text-sm font-black text-slate-800">Datos profesionales y horario</h3>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <dt className="text-xs font-bold text-slate-500">Título profesional</dt>
                  <dd className="mt-2 text-sm font-bold text-slate-900">{selectedUsuario.ficha_personal?.titulo_profesional || 'No registrado'}</dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <dt className="text-xs font-bold text-slate-500">Cargo</dt>
                  <dd className="mt-2 text-sm font-bold text-slate-900">{selectedUsuario.ficha_personal?.cargo || 'No registrado'}</dd>
                </div>
                <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 shadow-sm sm:col-span-2">
                  <dt className="text-xs font-bold text-brand-600">Nombre mostrado</dt>
                  <dd className="mt-2 text-base font-black text-slate-900">
                    {selectedUsuario.ficha_personal?.nombre_mostrado || selectedUsuario.nombre}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <dt className="text-xs font-bold text-slate-500">Cédula de identidad</dt>
                  <dd className="mt-2 text-sm font-bold text-slate-900">{selectedUsuario.ficha_personal?.ci || 'No registrada'}</dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <dt className="text-xs font-bold text-slate-500">Fecha de ingreso</dt>
                  <dd className="mt-2 text-sm font-bold text-slate-900">{selectedUsuario.ficha_personal?.fecha_ingreso ? formatDate(selectedUsuario.ficha_personal.fecha_ingreso) : 'No registrada'}</dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <dt className="text-xs font-bold text-slate-500">Forma de pago</dt>
                  <dd className="mt-2 text-sm font-bold text-slate-900">{selectedUsuario.ficha_personal?.tipo_pago === 'por_servicio' ? 'Por servicio' : selectedUsuario.ficha_personal?.tipo_pago === 'mensual' ? 'Mensual' : 'No registrada'}</dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2">
                  <dt className="text-xs font-bold text-slate-500">Días de trabajo</dt>
                  <dd className="mt-2 text-sm font-bold text-slate-900">
                    {selectedUsuario.ficha_personal?.dias_trabajo?.length
                      ? selectedUsuario.ficha_personal.dias_trabajo.map((dia) => dayLabels[dia] || dia).join(', ')
                      : 'No registrados'}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <dt className="text-xs font-bold text-slate-500">Hora de entrada</dt>
                  <dd className="mt-2 text-sm font-bold text-slate-900">{selectedUsuario.ficha_personal?.hora_entrada || 'No registrada'}</dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <dt className="text-xs font-bold text-slate-500">Hora de salida</dt>
                  <dd className="mt-2 text-sm font-bold text-slate-900">{selectedUsuario.ficha_personal?.hora_salida || 'No registrada'}</dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2">
                  <dt className="text-xs font-bold text-slate-500">Dirección</dt>
                  <dd className="mt-2 text-sm font-bold text-slate-900">{selectedUsuario.ficha_personal?.direccion || 'No registrada'}</dd>
                </div>
              </dl>
            </section>

            <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-white/95 pt-4 backdrop-blur">
              <Button variant="ghost" onClick={() => setSelectedUsuario(null)}>Cerrar</Button>
              <Button variant="secondary" onClick={() => openEdit(selectedUsuario)}>
                <FilePenLine size={17} />
                Editar usuario
              </Button>
              {selectedUsuario.estado === 'pendiente' && (
                <>
                  <Button onClick={() => review(selectedUsuario, 'aprobar')}><Check size={17} />Aprobar</Button>
                  <Button variant="danger" onClick={() => askReject(selectedUsuario)}><X size={17} />Rechazar</Button>
                </>
              )}
              {['bloqueado', 'inactivo'].includes(selectedUsuario.estado) && (
                <Button onClick={() => changeStatus(selectedUsuario, 'activo')}><ShieldCheck size={17} />Reactivar usuario</Button>
              )}
              {selectedUsuario.estado === 'activo' && selectedUsuario.rol !== 'admin' && (
                <Button variant="danger" onClick={() => askBlock(selectedUsuario)}><Ban size={17} />Bloquear usuario</Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(confirmation)} title={confirmation?.title || 'Confirmar acción'} onClose={() => setConfirmation(null)} size="md">
        {confirmation && (
          <div className="grid gap-5">
            <div className={`rounded-xl border p-4 text-sm leading-6 ${confirmation.danger ? 'border-red-200 bg-red-50 text-red-800' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>
              {confirmation.text}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmation(null)}>Cancelar</Button>
              <Button variant={confirmation.danger ? 'danger' : 'primary'} onClick={confirmation.action}>
                {confirmation.confirmLabel}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

export default Usuarios;
