import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, Eye, FilePenLine, Power, Search, UserRoundCheck } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import { getUsuarios } from '../../services/usuarioService';
import { getPersonal, updatePersonal, updatePersonalEstado } from '../../services/personalService';
import PersonalForm from './PersonalForm';

const initialForm = {
  usuario_id: '',
  apellido_paterno: '',
  apellido_materno: '',
  nombres: '',
  ci: '',
  cargo: '',
  dias_trabajo: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
  hora_entrada: '08:00',
  hora_salida: '17:00',
  sueldo_base: '',
  tipo_pago: 'mensual',
  telefono: '',
  direccion: '',
  fecha_ingreso: new Date().toISOString().slice(0, 10),
  estado: 'activo',
  observaciones: ''
};

const diasCortos = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mie', jueves: 'Jue', viernes: 'Vie', sabado: 'Sab', domingo: 'Dom' };
const nombreCompleto = (item) => `${item.apellido_paterno || ''} ${item.apellido_materno || ''} ${item.nombres || ''}`.trim();
const horario = (item) => `${(item.dias_trabajo || []).map((dia) => diasCortos[dia] || dia).join(', ')} ${item.hora_entrada?.slice(0, 5) || ''}-${item.hora_salida?.slice(0, 5) || ''}`.trim();
const moneda = (value) => Number(value || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Detail({ label, value }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><span className="block text-xs font-black uppercase text-slate-500">{label}</span><strong className="mt-1 block text-sm text-slate-800">{value || 'Sin dato'}</strong></div>;
}

function Personal() {
  const [personal, setPersonal] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [estado, setEstado] = useState('');
  const [cargo, setCargo] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [personalData, usuariosData] = await Promise.all([getPersonal(), getUsuarios()]);
      setPersonal(personalData);
      setUsuarios(usuariosData.filter((item) => item.rol === 'personal' || item.rol === 'admin'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cargos = useMemo(() => [...new Set(personal.map((item) => item.cargo).filter(Boolean))].sort(), [personal]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return personal.filter((item) => {
      const matchesText = !term || `${nombreCompleto(item)} ${item.ci} ${item.cargo}`.toLowerCase().includes(term);
      return matchesText && (!estado || item.estado === estado) && (!cargo || item.cargo === cargo);
    });
  }, [personal, query, estado, cargo]);

  const openEdit = (item) => {
    setEditing(item.id);
    setForm({
      ...initialForm,
      ...item,
      usuario_id: item.usuario_id || '',
      hora_entrada: item.hora_entrada?.slice(0, 5) || '',
      hora_salida: item.hora_salida?.slice(0, 5) || '',
      sueldo_base: item.sueldo_base ?? ''
    });
    setSelected(null);
    setShowForm(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const payload = { ...form, usuario_id: form.usuario_id || null, sueldo_base: form.tipo_pago === 'por_servicio' ? null : form.sueldo_base };
      await updatePersonal(editing, payload);
      setMessage('Datos laborales actualizados.');
      setShowForm(false);
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const changeStatus = async (item) => {
    await updatePersonalEstado(item.id, item.estado === 'activo' ? 'inactivo' : 'activo');
    await load();
  };

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <header className="overflow-hidden rounded-xl bg-gradient-to-r from-brand-900 to-brand-600 p-5 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs font-black uppercase text-brand-100">Gestion laboral</p><h2 className="mt-1 text-3xl font-black">Personal</h2><p className="mt-2 text-sm text-brand-50">Consulta y actualiza las fichas creadas desde el modulo Usuarios.</p></div>
        </div>
      </header>

      {message && <p className="notice">{message}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel"><span className="text-xs font-black uppercase text-slate-400">Total</span><strong className="mt-2 block text-3xl">{personal.length}</strong></div>
        <div className="panel"><span className="text-xs font-black uppercase text-emerald-600">Activos</span><strong className="mt-2 block text-3xl">{personal.filter((item) => item.estado === 'activo').length}</strong></div>
        <div className="panel"><span className="text-xs font-black uppercase text-slate-500">Inactivos</span><strong className="mt-2 block text-3xl">{personal.filter((item) => item.estado === 'inactivo').length}</strong></div>
      </div>

      <div className="panel">
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_200px_220px_auto]">
          <label className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input className="min-h-11 w-full rounded-lg border-slate-200 pl-10 text-sm" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, cedula o cargo" /></label>
          <Input value={estado} onChange={(e) => setEstado(e.target.value)} options={[{ value: '', label: 'Todos los estados' }, { value: 'activo', label: 'Activo' }, { value: 'inactivo', label: 'Inactivo' }]} />
          <Input value={cargo} onChange={(e) => setCargo(e.target.value)} options={[{ value: '', label: 'Todos los cargos' }, ...cargos.map((item) => ({ value: item, label: item }))]} />
          <Button variant="ghost" onClick={() => { setQuery(''); setEstado(''); setCargo(''); }}>Limpiar</Button>
        </div>

        <Table
          columns={['N°', 'Ap. Paterno', 'Ap. Materno', 'Nombres', 'Cedula de Identidad', 'Cargo', 'Horario', 'Sueldo Bs.', 'Estado', 'Acciones']}
          rows={filtered.map((item, index) => [
            index + 1,
            item.apellido_paterno,
            item.apellido_materno || '',
            item.nombres,
            item.ci,
            item.cargo,
            horario(item),
            item.tipo_pago === 'por_servicio' ? 'POR SERVICIO' : moneda(item.sueldo_base),
            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${item.estado === 'activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.estado}</span>,
            <div className="flex gap-2">
              <ActionButton label="Ver" icon={Eye} tone="view" onClick={() => setSelected(item)} />
              <ActionButton label="Editar" icon={FilePenLine} tone="edit" onClick={() => openEdit(item)} />
              <ActionButton label={item.estado === 'activo' ? 'Desactivar' : 'Activar'} icon={item.estado === 'activo' ? Power : UserRoundCheck} tone={item.estado === 'activo' ? 'delete' : 'edit'} onClick={() => changeStatus(item)} />
            </div>
          ])}
          empty="No hay personal registrado."
        />
      </div>

      <Modal open={showForm} title="Editar personal" onClose={() => setShowForm(false)} size="lg">
        <PersonalForm form={form} setForm={setForm} usuarios={usuarios} editing={editing} onSubmit={submit} onCancel={() => setShowForm(false)} />
      </Modal>

      <Modal open={Boolean(selected)} title="Detalle del personal" onClose={() => setSelected(null)} size="lg">
        {selected && <div className="grid gap-4">
          <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-4"><BriefcaseBusiness className="text-brand-700" /><div><strong className="text-xl">{nombreCompleto(selected)}</strong><span className="block text-sm text-slate-500">{selected.cargo}</span></div></div>
          <div className="grid gap-3 md:grid-cols-3">
            <Detail label="Cedula" value={selected.ci} /><Detail label="Telefono" value={selected.telefono} /><Detail label="Fecha de ingreso" value={selected.fecha_ingreso} />
            <Detail label="Horario" value={horario(selected)} /><Detail label="Tipo de pago" value={selected.tipo_pago === 'por_servicio' ? 'Por servicio' : 'Mensual'} /><Detail label="Sueldo" value={selected.tipo_pago === 'por_servicio' ? 'POR SERVICIO' : `Bs. ${moneda(selected.sueldo_base)}`} />
            <Detail label="Cuenta vinculada" value={selected.usuario?.nombre} /><Detail label="Estado" value={selected.estado} /><Detail label="Direccion" value={selected.direccion} />
          </div>
          <Detail label="Observaciones" value={selected.observaciones} />
          <div><Button variant="secondary" onClick={() => openEdit(selected)}><FilePenLine size={17} />Editar datos</Button></div>
        </div>}
      </Modal>
    </section>
  );
}

export default Personal;
