import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Eye, FilePenLine, PlusCircle, TableProperties, Trash2 } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
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
  sesiones_debe: 0,
  sesiones_hizo: 0,
  asistencia: 'pendiente',
  metodo_pago: 'Pendiente',
  observacion: ''
};

function labelAsistencia(value) {
  const labels = {
    pendiente: 'Pendiente',
    asistio: 'Asistio',
    no_asistio: 'No asistio',
    cancelada: 'Cancelada',
    reprogramada: 'Reprogramada'
  };
  return labels[value] || value;
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <span className="block text-xs font-black uppercase text-slate-500">{label}</span>
      <strong className="mt-1 block text-sm font-semibold text-ink">{value || 'Sin dato'}</strong>
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
  const [activePanel, setActivePanel] = useState('nueva');
  const [selectedSesion, setSelectedSesion] = useState(null);

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
      setError(`Pacientes cargados, pero sesiones fallo: ${err.message}. Si la tabla ya existia, ejecuta backend/docs/sesiones-migration.sql.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resumen = useMemo(() => {
    const totalDebe = sesiones.reduce((sum, sesion) => sum + Number(sesion.sesiones_debe || 0), 0);
    const totalHizo = sesiones.reduce((sum, sesion) => sum + Number(sesion.sesiones_hizo || 0), 0);
    return {
      totalDebe,
      totalHizo,
      totalRestantes: Math.max(totalDebe - totalHizo, 0)
    };
  }, [sesiones]);

  const validate = () => {
    if (!form.paciente_id) return 'Selecciona un paciente.';
    if (!form.fecha) return 'La fecha es obligatoria.';
    if (Number(form.sesiones_debe || 0) < 0) return 'Sesiones que debe no puede ser negativo.';
    if (Number(form.sesiones_hizo || 0) < 0) return 'Sesiones que hizo no puede ser negativo.';
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
        sesiones_debe: Number(form.sesiones_debe || 0),
        sesiones_hizo: Number(form.sesiones_hizo || 0)
      });
      editing ? await updateSesion(editing, payload) : await createSesion(payload);
      setForm(initialForm);
      setEditing(null);
      setMessage('Sesion guardada correctamente.');
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
      sesiones_debe: sesion.sesiones_debe || 0,
      sesiones_hizo: sesion.sesiones_hizo || 0,
      asistencia: sesion.asistencia || 'pendiente',
      metodo_pago: sesion.metodo_pago || 'Pendiente',
      observacion: sesion.observacion || ''
    });
    setActivePanel('nueva');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="grid gap-4 bg-gradient-to-r from-brand-900 to-brand-600 p-6 text-white md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-black uppercase text-brand-50">Atencion diaria</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Sesiones</h2>
            <span className="mt-2 block text-sm text-brand-50">Control de sesiones contratadas, realizadas y restantes por paciente.</span>
          </div>
          <CalendarDays size={54} className="self-center text-brand-50" />
        </div>
      </div>

      {message && <p className="notice">{message}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-black uppercase text-brand-600">Total debe</span>
          <strong className="block text-3xl text-ink">{resumen.totalDebe}</strong>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-black uppercase text-brand-600">Total hizo</span>
          <strong className="block text-3xl text-ink">{resumen.totalHizo}</strong>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-black uppercase text-brand-600">Restantes</span>
          <strong className="block text-3xl text-ink">{resumen.totalRestantes}</strong>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-3">
          <button
            type="button"
            onClick={() => setActivePanel('nueva')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
              activePanel === 'nueva' ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-brand-50 hover:text-brand-700'
            }`}
          >
            <PlusCircle size={17} />
            Nueva sesion
          </button>
          <button
            type="button"
            onClick={() => setActivePanel('registradas')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
              activePanel === 'registradas' ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-brand-50 hover:text-brand-700'
            }`}
          >
            <TableProperties size={17} />
            Sesiones registradas
          </button>
        </div>

        <div className="p-4">
          {activePanel === 'nueva' ? (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-ink">{editing ? 'Editar sesion' : 'Nueva sesion'}</h3>
                  <p className="text-sm text-slate-500">{pacientes.length} pacientes disponibles para seleccionar.</p>
                </div>
              </div>
              <SesionForm
                form={form}
                setForm={setForm}
                pacientes={pacientes}
                editing={editing}
                onSubmit={submit}
                onCancel={() => {
                  setEditing(null);
                  setForm(initialForm);
                  setError('');
                }}
                error={error}
              />
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-ink">Sesiones registradas</h3>
                <p className="text-sm text-slate-500">Control diario por paciente.</p>
              </div>
              <Table
                columns={['Paciente', 'Fecha', 'Debe', 'Hizo', 'Restantes', 'Asistencia', 'Metodo pago', 'Observacion', 'Acciones']}
                rows={sesiones.map((sesion) => {
                  const restantes = Math.max(Number(sesion.sesiones_debe || 0) - Number(sesion.sesiones_hizo || 0), 0);
                  return [
                    nombrePaciente(sesion.paciente),
                    formatDate(sesion.fecha),
                    sesion.sesiones_debe,
                    sesion.sesiones_hizo,
                    <span className={restantes === 0 && Number(sesion.sesiones_debe || 0) > 0 ? 'font-bold text-amber-700' : 'font-bold text-brand-700'}>{restantes}</span>,
                    labelAsistencia(sesion.asistencia),
                    sesion.metodo_pago,
                    sesion.observacion || 'Sin observacion',
                    <div className="flex gap-2">
                      <ActionButton label="Ver sesion" icon={Eye} tone="view" onClick={() => setSelectedSesion(sesion)} />
                      <ActionButton label="Editar sesion" icon={FilePenLine} tone="edit" onClick={() => editSesion(sesion)} />
                      {isAdmin && (
                        <ActionButton label="Eliminar sesion" icon={Trash2} tone="delete" onClick={() => deleteSesion(sesion.id).then(load)} />
                      )}
                    </div>
                  ];
                })}
                empty="No hay sesiones registradas."
              />
            </div>
          )}
        </div>
      </div>

      <Modal open={Boolean(selectedSesion)} title="Detalle de sesion" onClose={() => setSelectedSesion(null)} size="lg">
        {selectedSesion && (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Detail label="Paciente" value={nombrePaciente(selectedSesion.paciente)} />
              <Detail label="Fecha" value={formatDate(selectedSesion.fecha)} />
              <Detail label="Debe" value={selectedSesion.sesiones_debe} />
              <Detail label="Hizo" value={selectedSesion.sesiones_hizo} />
              <Detail label="Restantes" value={Math.max(Number(selectedSesion.sesiones_debe || 0) - Number(selectedSesion.sesiones_hizo || 0), 0)} />
              <Detail label="Asistencia" value={labelAsistencia(selectedSesion.asistencia)} />
              <Detail label="Metodo de pago" value={selectedSesion.metodo_pago} />
              <Detail label="Estado" value={Math.max(Number(selectedSesion.sesiones_debe || 0) - Number(selectedSesion.sesiones_hizo || 0), 0) === 0 ? 'Completado' : 'Pendiente'} />
            </div>
            <Detail label="Observacion" value={selectedSesion.observacion} />
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
