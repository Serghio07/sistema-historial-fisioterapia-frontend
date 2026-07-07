import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarCheck, CalendarRange, CalendarSync, CheckCircle2, Eye, FilePenLine, Pill, PlusCircle, Search, Trash2, WalletCards } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import { useAuth } from '../../context/AuthContext';
import { getPacientes } from '../../services/pacienteService';
import {
  createRegistroSemanal,
  deleteRegistroSemanal,
  getRegistrosSemanales,
  updateRegistroSemanal
} from '../../services/registroSemanalService';
import { formatDate } from '../../utils/formatDate';
import { cleanPayload, nombrePaciente } from '../../utils/validators';
import SesionSemanalForm from './SesionSemanalForm';

const currentWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const fromMonday = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - fromMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const localDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dateDay = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${dateDay}`;
  };
  return { inicio: localDate(start), fin: localDate(end) };
};

const week = currentWeek();

const initialForm = {
  paciente_id: '',
  semana_inicio: week.inicio,
  semana_fin: week.fin,
  diagnostico: '',
  telefono: '',
  edad: '',
  sexo: '',
  lunes: '',
  martes: '',
  miercoles: '',
  jueves: '',
  viernes: '',
  sabado: '',
  debe_bs: 0,
  observacion: ''
};

const diasSincronizados = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

const asistenciaLabel = {
  pendiente: 'Pendiente',
  asistio: 'Asistió',
  no_asistio: 'No asistió',
  cancelada: 'Cancelada',
  reprogramada: 'Reprogramada'
};

function sesionesSincronizadas(registro) {
  return Object.values(registro.sesiones_resumen || {}).flat();
}

function resumenFarmacos(registro) {
  const sesiones = sesionesSincronizadas(registro);
  const conFarmacos = sesiones.filter((sesion) => sesion.aplica_farmacos);
  const observaciones = [...new Set(
    conFarmacos.map((sesion) => sesion.observacion_farmacos).filter(Boolean)
  )];
  return {
    total: sesiones.length,
    cantidad: conFarmacos.length,
    aplica: conFarmacos.length > 0,
    observaciones
  };
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <span className="block text-xs font-black uppercase text-slate-500">{label}</span>
      <strong className="mt-1 block text-sm font-semibold text-ink">{value === null || value === undefined || value === '' ? 'Sin dato' : value}</strong>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <article className={`rounded-lg border p-5 shadow-sm ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase">{label}</span>
        <Icon size={22} />
      </div>
      <strong className="mt-3 block text-3xl text-ink">{value}</strong>
    </article>
  );
}

function SesionesSemanales() {
  const { isAdmin } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [selectedRegistro, setSelectedRegistro] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

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
      const registrosData = await getRegistrosSemanales();
      setRegistros(registrosData);
    } catch (err) {
      setRegistros([]);
      setError(`Los pacientes cargaron, pero las sesiones semanales fallaron: ${err.message}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resumen = useMemo(() => {
    const conFarmacos = registros.filter((registro) => registro.aplica_farmacos).length;
    const deudaTotal = registros.reduce((sum, registro) => sum + Number(registro.debe_bs || 0), 0);
    const pacientesUnicos = new Set(registros.map((registro) => registro.paciente_id)).size;
    const sesionesTotal = registros.reduce((sum, registro) => sum + Number(registro.total_sesiones || 0), 0);
    return { conFarmacos, deudaTotal, pacientesUnicos, sesionesTotal };
  }, [registros]);

  const syncedRegistro = useMemo(() => registros.find(
    (registro) =>
      String(registro.paciente_id) === String(form.paciente_id) &&
      registro.semana_inicio === form.semana_inicio
  ) || null, [registros, form.paciente_id, form.semana_inicio]);

  const filteredRegistros = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return registros;
    return registros.filter((registro) =>
      `${nombrePaciente(registro.paciente)} ${registro.diagnostico || ''} ${registro.telefono || ''} ${registro.semana_inicio || ''} ${registro.semana_fin || ''}`.toLowerCase().includes(term)
    );
  }, [registros, query]);

  const validate = () => {
    if (!form.paciente_id) return 'Selecciona un paciente.';
    if (!form.semana_inicio) return 'La fecha de inicio es obligatoria.';
    if (!form.semana_fin) return 'La fecha de fin es obligatoria.';
    if (Number(form.debe_bs || 0) < 0) return 'Debe Bs no puede ser negativo.';
    if (form.edad !== '' && Number(form.edad || 0) < 0) return 'La edad no puede ser negativa.';
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
        edad: form.edad === '' ? null : Number(form.edad || 0),
        debe_bs: Number(form.debe_bs || 0)
      });
      editing ? await updateRegistroSemanal(editing, payload) : await createRegistroSemanal(payload);
      setForm(initialForm);
      setEditing(null);
      setShowFormModal(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const editRegistro = (registro) => {
    setEditing(registro.id);
    setForm({
      paciente_id: registro.paciente_id || registro.paciente?.id || '',
      semana_inicio: registro.semana_inicio || initialForm.semana_inicio,
      semana_fin: registro.semana_fin || initialForm.semana_fin,
      diagnostico: registro.diagnostico || '',
      telefono: registro.telefono || '',
      edad: registro.edad || '',
      sexo: registro.sexo || '',
      lunes: registro.lunes || '',
      martes: registro.martes || '',
      miercoles: registro.miercoles || '',
      jueves: registro.jueves || '',
      viernes: registro.viernes || '',
      sabado: registro.sabado || '',
      debe_bs: registro.debe_bs || 0,
      observacion: registro.observacion || ''
    });
    setSelectedRegistro(null);
    setShowFormModal(true);
  };

  const openNuevaSemana = () => {
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
      <div className="overflow-hidden rounded-lg border border-white/60 bg-white shadow-soft">
        <div className="grid gap-3 bg-gradient-to-r from-[#123f3f] via-brand-700 to-teal-500 p-4 text-white md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-bold text-brand-50">Planificación semanal</p>
            <h2 className="mt-1 text-2xl font-black md:text-3xl">Sesiones Semanales</h2>
            <span className="mt-2 block text-sm text-brand-50">Resumen semanal de asistencia, continuidad, pagos y evolución del tratamiento.</span>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-lg border border-white/25 bg-white/15 shadow-sm backdrop-blur">
            <CalendarRange size={30} className="text-brand-50" />
          </div>
        </div>
      </div>

      {message && <p className="notice">{message}</p>}

      
    
      <div className="mx-auto w-full max-w-6xl rounded-lg border border-white/70 bg-white/90 p-4 shadow-soft backdrop-blur">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-lg font-bold text-ink">Registros semanales</h3>
            <p className="text-sm text-slate-500">Control de atención por paciente y semana.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase text-brand-700">{filteredRegistros.length} resultados</span>
            <Button onClick={openNuevaSemana}>
              <PlusCircle size={17} />
              Generar resumen semanal
            </Button>
          </div>
        </div>
        <label className="mb-4 grid gap-1 text-sm font-bold text-slate-700">
          <span>Buscar</span>
          <span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
            <Search size={17} className="shrink-0 text-slate-500" />
            <input
              className="w-full border-0 bg-transparent p-0 text-sm text-ink shadow-none placeholder:text-slate-400 focus:ring-0"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Paciente, diagnóstico, teléfono o fecha"
            />
          </span>
        </label>
        {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <div className="hidden md:block">
          <Table
          columns={['Paciente', 'Semana', 'Diagnóstico', 'Sesiones sincronizadas', 'Asistencia semanal', 'Fármacos', 'Deuda Bs', 'Estado', 'Acciones']}
          rows={filteredRegistros.map((registro) => {
            return [
              nombrePaciente(registro.paciente),
              `${formatDate(registro.semana_inicio)} - ${formatDate(registro.semana_fin)}`,
              registro.diagnostico || 'Sin diagnóstico',
              registro.sincronizado_sesiones ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-black text-cyan-700">
                  <CalendarSync size={14} />
                  {registro.total_sesiones || sesionesSincronizadas(registro).length} sincronizadas
                </span>
              ) : 'Sin sesiones',
              `${sesionesSincronizadas(registro).filter((item) => item.asistencia === 'asistio').length} asistió · ${sesionesSincronizadas(registro).filter((item) => item.asistencia === 'no_asistio').length} faltó`,
              (() => {
                const farmacos = resumenFarmacos(registro);
                return farmacos.aplica ? `${farmacos.cantidad} de ${farmacos.total}` : 'No aplica';
              })(),
              Number(registro.debe_bs || 0).toFixed(2),
              registro.total_sesiones > 0 ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">Con actividad</span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">Sin actividad</span>
              ),
              <div className="flex gap-2">
                <ActionButton label="Ver semana" icon={Eye} tone="view" onClick={() => setSelectedRegistro(registro)} />
                <ActionButton label="Editar semana" icon={FilePenLine} tone="edit" onClick={() => editRegistro(registro)} />
                {isAdmin && <ActionButton label="Eliminar semana" icon={Trash2} tone="delete" onClick={() => deleteRegistroSemanal(registro.id).then(load)} />}
              </div>
            ];
          })}
          empty="No hay sesiones semanales registradas."
          />
        </div>
        <div className="grid gap-3 md:hidden">
          {filteredRegistros.map((registro) => (
            <article key={registro.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="text-sm text-slate-900">{nombrePaciente(registro.paciente)}</strong>
                  <span className="mt-1 block text-xs text-slate-500">
                    {formatDate(registro.semana_inicio)} - {formatDate(registro.semana_fin)}
                  </span>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${
                  registro.total_sesiones > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {registro.total_sesiones > 0 ? 'Con actividad' : 'Sin actividad'}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-xs text-slate-500">{registro.diagnostico || 'Sin diagnóstico registrado'}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-cyan-50 p-2">
                  <span className="block text-[11px] font-bold text-cyan-600">Sesiones</span>
                  <strong className="text-lg text-cyan-800">{registro.total_sesiones || 0}</strong>
                </div>
                <div className="rounded-lg bg-blue-50 p-2">
                  <span className="block text-[11px] font-bold text-blue-600">Fármacos</span>
                  <strong className="text-sm text-blue-800">
                    {resumenFarmacos(registro).aplica ? `${resumenFarmacos(registro).cantidad}/${resumenFarmacos(registro).total}` : 'No'}
                  </strong>
                </div>
                <div className="rounded-lg bg-amber-50 p-2">
                  <span className="block text-[11px] font-bold text-amber-600">Deuda</span>
                  <strong className="text-sm text-amber-800">Bs {Number(registro.debe_bs || 0).toFixed(2)}</strong>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                <ActionButton label="Ver semana" icon={Eye} tone="view" className="h-9 w-9" onClick={() => setSelectedRegistro(registro)} />
                <ActionButton label="Editar semana" icon={FilePenLine} tone="edit" className="h-9 w-9" onClick={() => editRegistro(registro)} />
                {isAdmin && <ActionButton label="Eliminar semana" icon={Trash2} tone="delete" className="h-9 w-9" onClick={() => deleteRegistroSemanal(registro.id).then(load)} />}
              </div>
            </article>
          ))}
          {filteredRegistros.length === 0 && <p className="empty-state">No hay sesiones semanales registradas.</p>}
        </div>
      </div>

      <Modal
        open={showFormModal}
        title={editing ? 'Editar sesión semanal' : 'Nueva sesión semanal'}
        subtitle="Completa el resumen clínico y administrativo; las atenciones diarias se sincronizan automáticamente."
        onClose={closeFormModal}
        size="sessions"
      >
        <SesionSemanalForm
          form={form}
          setForm={setForm}
          pacientes={pacientes}
          editing={editing}
          onSubmit={submit}
          onCancel={closeFormModal}
          error={error}
          syncedRegistro={syncedRegistro}
        />
      </Modal>

      <Modal open={Boolean(selectedRegistro)} title="Detalle de la sesión semanal" subtitle="Resumen del paciente, asistencia, pagos y evolución semanal." onClose={() => setSelectedRegistro(null)} size="sessions">
        {selectedRegistro && (
          <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">
            <div className="grid gap-2 md:grid-cols-3">
              <Detail label="Paciente" value={nombrePaciente(selectedRegistro.paciente)} />
              <Detail label="Semana inicio" value={formatDate(selectedRegistro.semana_inicio)} />
              <Detail label="Semana fin" value={formatDate(selectedRegistro.semana_fin)} />
              <Detail label="Teléfono" value={selectedRegistro.telefono} />
              <Detail label="Edad" value={selectedRegistro.edad} />
              <Detail label="Sexo" value={selectedRegistro.sexo} />
              <Detail label="Debe Bs" value={Number(selectedRegistro.debe_bs || 0).toFixed(2)} />
              <Detail label="Fármacos" value={resumenFarmacos(selectedRegistro).aplica ? 'Sí aplica' : 'No aplica'} />
              <Detail label="Diagnóstico" value={selectedRegistro.diagnostico} />
            </div>
            <div className="rounded-lg border border-cyan-100 bg-cyan-50/60 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-cyan-800">
                  <CalendarSync size={18} />
                  <h3 className="font-black">Sesiones diarias sincronizadas</h3>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">
                  {selectedRegistro.total_sesiones || sesionesSincronizadas(selectedRegistro).length} sesiones
                </span>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                {diasSincronizados.map((dia) => {
                  const sesionesDia = selectedRegistro.sesiones_resumen?.[dia] || [];
                  return (
                    <div key={dia} className="rounded-lg border border-white bg-white/85 p-2.5">
                      <span className="text-xs font-black capitalize text-slate-500">{dia}</span>
                      {sesionesDia.length ? (
                        <div className="mt-2 grid gap-2">
                          {sesionesDia.map((sesion) => (
                            <div key={sesion.id} className="flex items-start gap-2 text-sm text-slate-700">
                              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-brand-600" />
                              <span>
                                <strong>{asistenciaLabel[sesion.asistencia] || sesion.asistencia}</strong>
                                <small className="block text-xs text-slate-500">
                                  Pago: {sesion.metodo_pago || 'Pendiente'} · {sesion.estado_pago || 'Pendiente'}
                                </small>
                                <small className={`block text-xs font-semibold ${sesion.aplica_farmacos ? 'text-violet-600' : 'text-slate-400'}`}>
                                  Fármacos: {sesion.aplica_farmacos ? 'Sí' : 'No'}
                                </small>
                                {sesion.observacion_farmacos && <small className="mt-1 block line-clamp-2 text-xs text-violet-500">{sesion.observacion_farmacos}</small>}
                                {sesion.observacion && <small className="mt-1 block line-clamp-2 text-xs text-slate-400">{sesion.observacion}</small>}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : <span className="mt-2 block text-xs text-slate-400">Sin atención registrada</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-lg border border-violet-100 bg-violet-50/60 p-3">
              <div className="flex items-center gap-2 text-violet-800">
                <Pill size={18} />
                <h3 className="font-black">Resumen semanal de fármacos</h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {resumenFarmacos(selectedRegistro).aplica
                  ? `El paciente registró uso de fármacos en ${resumenFarmacos(selectedRegistro).cantidad} de ${resumenFarmacos(selectedRegistro).total} sesiones.`
                  : 'No se registró uso de fármacos en las sesiones de esta semana.'}
              </p>
              {resumenFarmacos(selectedRegistro).observaciones.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {resumenFarmacos(selectedRegistro).observaciones.map((observacion) => (
                    <p key={observacion} className="rounded-lg border border-white bg-white/85 p-3 text-sm text-slate-600">
                      {observacion}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Total sesiones" value={sesionesSincronizadas(selectedRegistro).length} />
              <Detail label="Total asistencias" value={sesionesSincronizadas(selectedRegistro).filter((item) => item.asistencia === 'asistio').length} />
              <Detail label="Total faltas" value={sesionesSincronizadas(selectedRegistro).filter((item) => item.asistencia === 'no_asistio').length} />
              <Detail label="Total pendientes" value={sesionesSincronizadas(selectedRegistro).filter((item) => item.asistencia === 'pendiente').length} />
            </div>
            <Detail label="Observación semanal" value={selectedRegistro.observacion} />
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => editRegistro(selectedRegistro)}>
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

export default SesionesSemanales;
