import { useEffect, useMemo, useState } from 'react';
import { Eye, FilePenLine, Lock, PlusCircle, Search, ShieldCheck, ShieldOff, Trash2, UserCog, UserRoundCheck, UsersRound } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import UsuarioForm from './UsuarioForm';
import { createUsuario, deleteUsuario, getUsuarios, updateUsuario, updateUsuarioEstado } from '../../services/usuarioService';

const initialForm = {
  nombre: '',
  usuario: '',
  email: '',
  password: '',
  rol: 'personal',
  estado: 'activo'
};

function Badge({ value, tone }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${tone}`}>{value}</span>;
}

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <article className={`rounded-lg border p-4 shadow-sm ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase">{label}</span>
        <Icon size={21} />
      </div>
      <strong className="mt-3 block text-3xl text-ink">{value}</strong>
    </article>
  );
}

function initials(usuario) {
  return `${usuario?.nombre?.[0] || ''}${usuario?.usuario?.[0] || ''}`.toUpperCase() || 'U';
}

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [query, setQuery] = useState('');
  const [rolFilter, setRolFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setUsuarios(await getUsuarios());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return usuarios.filter((usuario) => {
      const matchSearch = !term || `${usuario.nombre || ''} ${usuario.usuario || ''} ${usuario.email || ''}`.toLowerCase().includes(term);
      const matchRol = !rolFilter || usuario.rol === rolFilter;
      const matchEstado = !estadoFilter || usuario.estado === estadoFilter;
      return matchSearch && matchRol && matchEstado;
    });
  }, [usuarios, query, rolFilter, estadoFilter]);

  const resumen = useMemo(() => {
    return {
      total: usuarios.length,
      admin: usuarios.filter((usuario) => usuario.rol === 'admin').length,
      personal: usuarios.filter((usuario) => usuario.rol === 'personal').length,
      bloqueados: usuarios.filter((usuario) => usuario.estado === 'bloqueado').length
    };
  }, [usuarios]);

  const resetForm = () => {
    setEditing(null);
    setForm(initialForm);
    setError('');
  };

  const openNuevoUsuario = () => {
    resetForm();
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    resetForm();
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }

    if (!form.usuario.trim()) {
      setError('El usuario es obligatorio.');
      return;
    }

    if (!editing && !form.password.trim()) {
      setError('La contrasena es obligatoria para crear un usuario.');
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      usuario: form.usuario.trim(),
      email: form.email?.trim() || null,
      password: form.password?.trim() || '',
      rol: form.rol,
      estado: form.estado
    };

    if (editing && !payload.password) delete payload.password;
    try {
      editing ? await updateUsuario(editing, payload) : await createUsuario(payload);
      resetForm();
      setShowFormModal(false);
      setQuery('');
      setRolFilter('');
      setEstadoFilter('');
      setMessage('Usuario guardado correctamente.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const editUsuario = (usuario) => {
    setEditing(usuario.id);
    setForm({ ...initialForm, ...usuario, password: '' });
    setSelectedUsuario(null);
    setShowFormModal(true);
  };

  const toggleEstado = async (usuario) => {
    const nextEstado = usuario.estado === 'activo' ? 'inactivo' : 'activo';
    setMessage('');
    setError('');
    try {
      await updateUsuarioEstado(usuario.id, nextEstado);
      setMessage(`Usuario ${nextEstado === 'activo' ? 'activado/desbloqueado' : 'desactivado'} correctamente.`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const desbloquearUsuario = async (usuario) => {
    setMessage('');
    setError('');
    try {
      await updateUsuarioEstado(usuario.id, 'activo');
      setSelectedUsuario(null);
      setMessage('Usuario desbloqueado correctamente.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="grid gap-5">
      {loading && <Loader />}

      <div className="overflow-hidden rounded-lg border border-white/60 bg-white shadow-soft">
        <div className="grid gap-3 bg-gradient-to-r from-[#123f3f] via-brand-700 to-teal-500 p-4 text-white md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-black uppercase text-brand-50">Administracion</p>
            <h2 className="mt-1 text-2xl font-black md:text-3xl">Usuarios</h2>
            <span className="mt-2 block text-sm text-brand-50">Gestion de accesos, roles y estado del equipo.</span>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-lg border border-white/25 bg-white/15 shadow-sm backdrop-blur">
            <UserCog size={30} className="text-brand-50" />
          </div>
        </div>
      </div>

      {message && <p className="notice">{message}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total usuarios" value={resumen.total} icon={UsersRound} tone="border-emerald-100 bg-emerald-50/80 text-emerald-700" />
        <StatCard label="Administradores" value={resumen.admin} icon={ShieldCheck} tone="border-blue-100 bg-blue-50/80 text-blue-700" />
        <StatCard label="Personal" value={resumen.personal} icon={UserRoundCheck} tone="border-cyan-100 bg-cyan-50/80 text-cyan-700" />
        <StatCard label="Bloqueados" value={resumen.bloqueados} icon={Lock} tone="border-red-100 bg-red-50/80 text-red-700" />
      </div>

      <div className="grid gap-5">
        <div className="panel">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-bold text-ink">Usuarios registrados</h3>
              <p className="text-sm text-slate-500">Gestion de accesos, roles y estado.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase text-brand-700">{filtered.length} resultados</span>
              <Button onClick={openNuevoUsuario}>
                <PlusCircle size={17} />
                Nuevo usuario
              </Button>
            </div>
          </div>

          <div className="mb-4 grid gap-3 border-b border-slate-200 pb-4 lg:grid-cols-[1fr_160px_160px]">
            <label className="flex items-center gap-2">
              <Search size={18} className="text-slate-500" />
              <input
                className="w-full rounded-lg border-slate-200 bg-white/95 px-3 py-2.5 text-sm shadow-sm transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre, usuario o email"
              />
            </label>
            <Input
              label=""
              value={rolFilter}
              onChange={(event) => setRolFilter(event.target.value)}
              options={[
                { value: '', label: 'Todos los roles' },
                { value: 'admin', label: 'Admin' },
                { value: 'personal', label: 'Personal' }
              ]}
            />
            <Input
              label=""
              value={estadoFilter}
              onChange={(event) => setEstadoFilter(event.target.value)}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'activo', label: 'Activo' },
                { value: 'inactivo', label: 'Inactivo' },
                { value: 'bloqueado', label: 'Bloqueado' }
              ]}
            />
          </div>

          <div className="grid gap-3">
            {filtered.map((usuario) => (
              <article key={usuario.id} className="rounded-lg border border-slate-200 bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-100 hover:bg-white hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-600 to-teal-500 text-sm font-black text-white shadow-sm">
                      {initials(usuario)}
                    </div>
                    <div className="min-w-0">
                      <strong className="block truncate text-base text-ink">{usuario.nombre}</strong>
                      <span className="mt-1 block text-sm text-slate-500">@{usuario.usuario} {usuario.email ? `- ${usuario.email}` : ''}</span>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge value={usuario.rol} tone={usuario.rol === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-cyan-50 text-cyan-700'} />
                        <Badge
                          value={usuario.estado}
                          tone={
                            usuario.estado === 'activo'
                              ? 'bg-emerald-50 text-emerald-700'
                              : usuario.estado === 'bloqueado'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-700'
                          }
                        />
                        {usuario.intentos_fallidos > 0 && (
                          <Badge value={`${usuario.intentos_fallidos}/5 intentos`} tone="bg-slate-100 text-slate-600" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <ActionButton label="Ver usuario" icon={Eye} tone="view" onClick={() => setSelectedUsuario(usuario)} />
                    <ActionButton label="Editar usuario" icon={FilePenLine} tone="edit" onClick={() => editUsuario(usuario)} />
                    <ActionButton
                      label={usuario.estado === 'bloqueado' ? 'Desbloquear usuario' : usuario.estado === 'activo' ? 'Desactivar usuario' : 'Activar usuario'}
                      icon={usuario.estado === 'bloqueado' ? Lock : usuario.estado === 'activo' ? ShieldOff : ShieldCheck}
                      tone={usuario.estado === 'activo' ? 'print' : 'edit'}
                      onClick={() => toggleEstado(usuario)}
                    />
                    <ActionButton label="Eliminar usuario" icon={Trash2} tone="delete" onClick={() => deleteUsuario(usuario.id).then(load).catch((err) => setError(err.message))} />
                  </div>
                </div>
              </article>
            ))}
            {filtered.length === 0 && <p className="empty-state">No hay usuarios para mostrar.</p>}
          </div>
        </div>
      </div>

      <Modal open={showFormModal} title={editing ? 'Editar usuario' : 'Nuevo usuario'} onClose={closeFormModal} size="lg">
        <UsuarioForm form={form} setForm={setForm} editing={editing} onSubmit={submit} onCancel={closeFormModal} />
      </Modal>

      <Modal open={Boolean(selectedUsuario)} title="Detalle de usuario" onClose={() => setSelectedUsuario(null)} size="lg">
        {selectedUsuario && (
          <div className="grid gap-4">
            <div className="rounded-lg border border-brand-100 bg-brand-50/70 p-4">
              <strong className="block text-xl text-ink">{selectedUsuario.nombre}</strong>
              <span className="text-sm text-slate-500">@{selectedUsuario.usuario}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="block text-xs font-black uppercase text-slate-500">Email</span>
                <strong className="mt-1 block text-sm text-ink">{selectedUsuario.email || 'Sin email'}</strong>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="block text-xs font-black uppercase text-slate-500">Rol</span>
                <strong className="mt-1 block text-sm text-ink">{selectedUsuario.rol}</strong>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="block text-xs font-black uppercase text-slate-500">Estado</span>
                <strong className="mt-1 block text-sm text-ink">{selectedUsuario.estado}</strong>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="block text-xs font-black uppercase text-slate-500">Intentos fallidos</span>
                <strong className="mt-1 block text-sm text-ink">{selectedUsuario.intentos_fallidos || 0}/5</strong>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="block text-xs font-black uppercase text-slate-500">Ultimo acceso</span>
                <strong className="mt-1 block text-sm text-ink">{selectedUsuario.ultimo_acceso || 'Sin registro'}</strong>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedUsuario.estado === 'bloqueado' && (
                <Button onClick={() => desbloquearUsuario(selectedUsuario)}>
                  <ShieldCheck size={17} />
                  Desbloquear usuario
                </Button>
              )}
              <Button variant="ghost" onClick={() => editUsuario(selectedUsuario)}>
                <FilePenLine size={17} />
                Editar usuario
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

export default Usuarios;
