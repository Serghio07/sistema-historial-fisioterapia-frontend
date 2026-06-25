import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CalendarSync, Eye, FilePenLine, PlusCircle, Search, Trash2 } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import { useAuth } from '../../context/AuthContext';
import { getPacientes } from '../../services/pacienteService';
import { createSesion, deleteSesion, getSesiones, updateSesion } from '../../services/sesionService';
import { formatDate } from '../../utils/formatDate';
import { cleanPayload, nombrePaciente } from '../../utils/validators';
import SesionForm from './SesionForm';

const initialForm = {
  paciente_id: '',
  fecha: new Date().toISOString().slice(0, 10),
  numero_sesion: 1,
  sesiones_debe: 0,
  sesiones_hizo: 0,
  asistencia: 'pendiente',
  metodo_pago: 'Pendiente',
  estado_pago: 'Pendiente',
  aplica_farmacos: false,
  observacion_farmacos: '',
  observacion: ''
};

function labelAsistencia(value) {
  const labels = {
    pendiente: 'Pendiente',
    asistio: 'Asistió',
    no_asistio: 'Faltó',
    cancelada: 'Cancelada',
    reprogramada: 'Reprogramada'
  };
  return labels[value] || value;
}

const asistenciaTone = {
  asistio: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pendiente: 'bg-amber-50 text-amber-700 ring-amber-200',
  no_asistio: 'bg-red-50 text-red-700 ring-red-200',
  cancelada: 'bg-slate-100 text-slate-600 ring-slate-200',
  reprogramada: 'bg-blue-50 text-blue-700 ring-blue-200'
};

const pagoTone = {
  QR: 'bg-sky-50 text-sky-700 ring-sky-200',
  Efectivo: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Transferencia: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  Pendiente: 'bg-amber-50 text-amber-700 ring-amber-200'
};

const estadoPagoTone = {
  Pagado: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Pendiente: 'bg-amber-50 text-amber-700 ring-amber-200',
  Parcial: 'bg-orange-50 text-orange-700 ring-orange-200'
};

function Badge({ children, tone }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${tone}`}>{children}</span>;
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <span className="block text-xs font-black uppercase text-slate-500">{label}</span>
      <strong className="mt-1 block text-sm font-semibold text-ink">{value === null || value === undefined || value === '' ? 'Sin dato' : value}</strong>
    </div>
  );
}

function Sesiones() {
  const { isAdmin } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedSesion, setSelectedSesion] = useState(null);
  const [registeredFilters, setRegisteredFilters] = useState({ query: '', orderBy: 'fecha_desc' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const pacientesData = await getPacientes();
      setPacientes(pacientesData);
    } catch (err) {
      setError(`No se pudieron cargar pacientes: ${err.message}`);
    }

    try {
      const sesionesData = await getSesiones();
      setSesiones(sesionesData);
    } catch (err) {
      setSesiones([]);
      setError(`Los pacientes cargaron, pero las sesiones fallaron: ${err.message}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredSesiones = useMemo(() => {
    const query = registeredFilters.query.trim().toLowerCase();
    const filtered = sesiones.filter((sesion) => {
      const text = `${nombrePaciente(sesion.paciente)} ${sesion.observacion || ''} ${sesion.observacion_farmacos || ''} ${sesion.metodo_pago || ''}`.toLowerCase();
      return !query || text.includes(query);
    });

    return [...filtered].sort((a, b) => {
      if (registeredFilters.orderBy === 'nombre_asc') return nombrePaciente(a.paciente).localeCompare(nombrePaciente(b.paciente), 'es');
      if (registeredFilters.orderBy === 'nombre_desc') return nombrePaciente(b.paciente).localeCompare(nombrePaciente(a.paciente), 'es');
      if (registeredFilters.orderBy === 'fecha_asc') return String(a.fecha || '').localeCompare(String(b.fecha || ''));
      return String(b.fecha || '').localeCompare(String(a.fecha || ''));
    });
  }, [sesiones, registeredFilters]);

  const validate = () => {
    if (!form.paciente_id) return 'Selecciona un paciente.';
    if (!form.fecha) return 'La fecha es obligatoria.';
    if (Number(form.sesiones_debe || 0) < 0) return 'Las sesiones contratadas no pueden ser negativas.';
    if (Number(form.sesiones_hizo || 0) < 0) return 'Las sesiones realizadas no pueden ser negativas.';
    return '';
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    try {
      const payload = cleanPayload({
        ...form,
        numero_sesion: Number(form.numero_sesion || 1),
        sesiones_debe: Number(form.sesiones_debe || 0),
        sesiones_hizo: Number(form.sesiones_hizo || 0)
      });
      editing ? await updateSesion(editing, payload) : await createSesion(payload);
      setForm(initialForm);
      setEditing(null);
      setShowFormModal(false);
      setMessage('Sesión guardada y registro semanal actualizado automáticamente.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const editSesion = (sesion) => {
    setEditing(sesion.id);
    setForm({
      paciente_id: sesion.paciente_id || sesion.paciente?.id || '',
      fecha: sesion.fecha || new Date().toISOString().slice(0, 10),
      numero_sesion: sesion.numero_sesion || 1,
      sesiones_debe: sesion.sesiones_debe || 0,
      sesiones_hizo: sesion.sesiones_hizo || 0,
      asistencia: sesion.asistencia || 'pendiente',
      metodo_pago: sesion.metodo_pago || 'Pendiente',
      estado_pago: sesion.estado_pago || 'Pendiente',
      aplica_farmacos: Boolean(sesion.aplica_farmacos),
      observacion_farmacos: sesion.observacion_farmacos || '',
      observacion: sesion.observacion || ''
    });
    setShowFormModal(true);
  };

  const openNuevaSesion = () => {
    setEditing(null);
    setForm(initialForm);
    setError('');
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditing(null);
    setForm(initialForm);
    setError('');
  };

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="grid gap-3 bg-gradient-to-r from-brand-900 to-brand-600 p-4 text-white md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-bold text-brand-50">Atención diaria</p>
            <h2 className="mt-1 text-2xl font-black md:text-3xl">Sesiones</h2>
            <span className="mt-2 block text-sm text-brand-50">Registro diario de atenciones, asistencia, pagos y evolución por paciente.</span>
          </div>
          <CalendarDays size={42} className="self-center text-brand-50" />
        </div>
      </div>

      {message && <p className="notice">{message}</p>}
      <div className="panel">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-lg font-bold text-ink">Sesiones registradas</h3>
            <p className="text-sm text-slate-500">Control diario por paciente.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase text-brand-700">{filteredSesiones.length} resultados</span>
            <Button onClick={openNuevaSesion}>
              <PlusCircle size={17} />
              Nueva sesión
            </Button>
          </div>
        </div>
        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            <span>Buscar</span>
            <span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
              <Search size={17} className="shrink-0 text-slate-500" />
              <input
                className="w-full border-0 bg-transparent p-0 text-sm text-ink shadow-none placeholder:text-slate-400 focus:ring-0"
                value={registeredFilters.query}
                onChange={(event) => setRegisteredFilters({ ...registeredFilters, query: event.target.value })}
                placeholder="Paciente, pago u observación"
              />
            </span>
          </label>
          <Input
            label="Ordenar"
            value={registeredFilters.orderBy}
            onChange={(event) => setRegisteredFilters({ ...registeredFilters, orderBy: event.target.value })}
            options={[
              { value: 'fecha_desc', label: 'Fecha reciente primero' },
              { value: 'fecha_asc', label: 'Fecha antigua primero' },
              { value: 'nombre_asc', label: 'Paciente A-Z' },
              { value: 'nombre_desc', label: 'Paciente Z-A' }
            ]}
          />
        </div>
        <div className="hidden md:block">
          <Table
          columns={['Paciente', 'Fecha', 'Contratadas', 'Realizadas', 'Restantes', 'Asistencia', 'Pago', 'Fármacos', 'Observación clínica', 'Acciones']}
          rows={filteredSesiones.map((sesion) => {
            const restantes = Math.max(Number(sesion.sesiones_debe || 0) - Number(sesion.sesiones_hizo || 0), 0);
            return [
              nombrePaciente(sesion.paciente),
              formatDate(sesion.fecha),
              sesion.sesiones_debe,
              sesion.sesiones_hizo,
              <span className={restantes === 0 && Number(sesion.sesiones_debe || 0) > 0 ? 'font-bold text-amber-700' : 'font-bold text-brand-700'}>{restantes}</span>,
              <Badge tone={asistenciaTone[sesion.asistencia] || asistenciaTone.pendiente}>{labelAsistencia(sesion.asistencia)}</Badge>,
              <div className="grid gap-1">
                <Badge tone={pagoTone[sesion.metodo_pago] || pagoTone.Pendiente}>{sesion.metodo_pago}</Badge>
                <Badge tone={estadoPagoTone[sesion.estado_pago] || estadoPagoTone.Pendiente}>{sesion.estado_pago || 'Pendiente'}</Badge>
              </div>,
              <Badge tone={sesion.aplica_farmacos ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}>
                {sesion.aplica_farmacos ? 'Sí' : 'No'}
              </Badge>,
              sesion.observacion || 'Sin observación',
              <div className="flex gap-2">
                <ActionButton label="Ver sesión" icon={Eye} tone="view" onClick={() => setSelectedSesion(sesion)} />
                <ActionButton label="Editar sesión" icon={FilePenLine} tone="edit" onClick={() => editSesion(sesion)} />
                {isAdmin && <ActionButton label="Eliminar sesión" icon={Trash2} tone="delete" onClick={() => deleteSesion(sesion.id).then(load)} />}
              </div>
            ];
          })}
          empty="No hay sesiones registradas."
          />
        </div>
        <div className="grid gap-3 md:hidden">
          {filteredSesiones.map((sesion) => {
            const restantes = Math.max(Number(sesion.sesiones_debe || 0) - Number(sesion.sesiones_hizo || 0), 0);
            return (
              <article key={sesion.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-sm text-slate-900">{nombrePaciente(sesion.paciente)}</strong>
                    <span className="mt-1 block text-xs text-slate-500">{formatDate(sesion.fecha)} · Sesión #{sesion.numero_sesion || 1}</span>
                  </div>
                  <Badge tone={asistenciaTone[sesion.asistencia] || asistenciaTone.pendiente}>{labelAsistencia(sesion.asistencia)}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[['Contratadas', sesion.sesiones_debe], ['Realizadas', sesion.sesiones_hizo], ['Restantes', restantes]].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-2">
                      <span className="block text-[11px] font-bold text-slate-400">{label}</span>
                      <strong className="text-lg text-slate-800">{value}</strong>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge tone={pagoTone[sesion.metodo_pago] || pagoTone.Pendiente}>{sesion.metodo_pago}</Badge>
                    <Badge tone={sesion.aplica_farmacos ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}>
                      Fármacos: {sesion.aplica_farmacos ? 'Sí' : 'No'}
                    </Badge>
                  </div>
                  <span className="truncate text-xs text-slate-500">{sesion.observacion || 'Sin observación clínica'}</span>
                </div>
                <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <ActionButton label="Ver sesión" icon={Eye} tone="view" className="h-9 w-9" onClick={() => setSelectedSesion(sesion)} />
                  <ActionButton label="Editar sesión" icon={FilePenLine} tone="edit" className="h-9 w-9" onClick={() => editSesion(sesion)} />
                  {isAdmin && <ActionButton label="Eliminar sesión" icon={Trash2} tone="delete" className="h-9 w-9" onClick={() => deleteSesion(sesion.id).then(load)} />}
                </div>
              </article>
            );
          })}
          {filteredSesiones.length === 0 && <p className="empty-state">No hay sesiones registradas.</p>}
        </div>
      </div>

      <Modal
        open={showFormModal}
        title={editing ? 'Editar sesión' : 'Nueva sesión'}
        subtitle="Registra la atención diaria del paciente y actualiza automáticamente su resumen semanal."
        onClose={closeFormModal}
        size="sessions"
      >
        <SesionForm form={form} setForm={setForm} pacientes={pacientes} editing={editing} onSubmit={submit} onCancel={closeFormModal} error={error} />
      </Modal>

      <Modal open={Boolean(selectedSesion)} title="Detalle de la sesión" subtitle="Información clínica y administrativa de la atención." onClose={() => setSelectedSesion(null)} size="sessions">
        {selectedSesion && (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Detail label="Paciente" value={nombrePaciente(selectedSesion.paciente)} />
              <Detail label="Fecha" value={formatDate(selectedSesion.fecha)} />
              <Detail label="Contratadas" value={selectedSesion.sesiones_debe} />
              <Detail label="Realizadas" value={selectedSesion.sesiones_hizo} />
              <Detail label="Restantes" value={Math.max(Number(selectedSesion.sesiones_debe || 0) - Number(selectedSesion.sesiones_hizo || 0), 0)} />
              <Detail label="Asistencia" value={labelAsistencia(selectedSesion.asistencia)} />
              <Detail label="Método de pago" value={selectedSesion.metodo_pago} />
              <Detail label="Estado de pago" value={selectedSesion.estado_pago} />
              <Detail label="Fármacos" value={selectedSesion.aplica_farmacos ? 'Sí aplica' : 'No aplica'} />
              <Detail label="Estado" value={Math.max(Number(selectedSesion.sesiones_debe || 0) - Number(selectedSesion.sesiones_hizo || 0), 0) === 0 ? 'Completado' : 'Pendiente'} />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-cyan-100 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800">
              <CalendarSync size={17} />
              Esta atención está sincronizada con Sesiones Semanales.
            </div>
            <Detail label="Observación clínica" value={selectedSesion.observacion} />
            {selectedSesion.aplica_farmacos && <Detail label="Observación de fármacos" value={selectedSesion.observacion_farmacos} />}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedSesion(null);
                  editSesion(selectedSesion);
                }}
              >
                <FilePenLine size={17} />
                Editar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

export default Sesiones;
