import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Eye, FilePenLine, PlusCircle, TableProperties, Trash2 } from 'lucide-react';
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

const initialForm = {
  paciente_id: '',
  semana_inicio: new Date().toISOString().slice(0, 10),
  semana_fin: new Date().toISOString().slice(0, 10),
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
  aplica_farmacos: false,
  debe_bs: 0,
  observacion: ''
};

const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <span className="block text-xs font-black uppercase text-slate-500">{label}</span>
      <strong className="mt-1 block text-sm font-semibold text-ink">{value || 'Sin dato'}</strong>
    </div>
  );
}

function SesionesSemanales() {
  const { isAdmin } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [selectedRegistro, setSelectedRegistro] = useState(null);
  const [activePanel, setActivePanel] = useState('nuevo');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
      setError(`Pacientes cargados, pero sesiones semanales fallo: ${err.message}. Si la tabla ya existia, ejecuta backend/docs/sesiones-semanales-migration.sql.`);
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
    return { conFarmacos, deudaTotal, pacientesUnicos };
  }, [registros]);

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
      setMessage('Sesion semanal guardada correctamente.');
      setActivePanel('registrados');
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
      aplica_farmacos: Boolean(registro.aplica_farmacos),
      debe_bs: registro.debe_bs || 0,
      observacion: registro.observacion || ''
    });
    setSelectedRegistro(null);
    setActivePanel('nuevo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="grid gap-4 bg-gradient-to-r from-brand-900 to-brand-600 p-6 text-white md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-black uppercase text-brand-50">Planificacion semanal</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Sesiones Semanales</h2>
            <span className="mt-2 block text-sm text-brand-50">Registro por semana, paciente, dias de atencion, farmacos y deuda.</span>
          </div>
          <CalendarRange size={54} className="self-center text-brand-50" />
        </div>
      </div>

      {message && <p className="notice">{message}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-black uppercase text-brand-600">Pacientes</span>
          <strong className="block text-3xl text-ink">{resumen.pacientesUnicos}</strong>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-black uppercase text-brand-600">Con farmacos</span>
          <strong className="block text-3xl text-ink">{resumen.conFarmacos}</strong>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-black uppercase text-brand-600">Debe total Bs</span>
          <strong className="block text-3xl text-ink">{resumen.deudaTotal.toFixed(2)}</strong>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-3">
          <button
            type="button"
            onClick={() => setActivePanel('nuevo')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
              activePanel === 'nuevo' ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-brand-50 hover:text-brand-700'
            }`}
          >
            <PlusCircle size={17} />
            Nueva semana
          </button>
          <button
            type="button"
            onClick={() => setActivePanel('registrados')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
              activePanel === 'registrados' ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-brand-50 hover:text-brand-700'
            }`}
          >
            <TableProperties size={17} />
            Registros semanales
          </button>
        </div>

        <div className="p-4">
          {activePanel === 'nuevo' ? (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-ink">{editing ? 'Editar semana' : 'Nueva sesion semanal'}</h3>
                <p className="text-sm text-slate-500">{pacientes.length} pacientes disponibles para seleccionar.</p>
              </div>
              <SesionSemanalForm
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
                <h3 className="text-lg font-bold text-ink">Registros semanales</h3>
                <p className="text-sm text-slate-500">Control de atencion por paciente y semana.</p>
              </div>
              {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
              <Table
                columns={['Paciente', 'Semana', 'Diagnostico', 'Dias', 'Farmacos', 'Debe Bs', 'Acciones']}
                rows={registros.map((registro) => {
                  const diasRegistrados = dias.filter((dia) => registro[dia]).length;
                  return [
                    nombrePaciente(registro.paciente),
                    `${formatDate(registro.semana_inicio)} - ${formatDate(registro.semana_fin)}`,
                    registro.diagnostico || 'Sin diagnostico',
                    `${diasRegistrados}/6`,
                    registro.aplica_farmacos ? 'Si' : 'No',
                    Number(registro.debe_bs || 0).toFixed(2),
                    <div className="flex gap-2">
                      <ActionButton label="Ver semana" icon={Eye} tone="view" onClick={() => setSelectedRegistro(registro)} />
                      <ActionButton label="Editar semana" icon={FilePenLine} tone="edit" onClick={() => editRegistro(registro)} />
                      {isAdmin && (
                        <ActionButton label="Eliminar semana" icon={Trash2} tone="delete" onClick={() => deleteRegistroSemanal(registro.id).then(load)} />
                      )}
                    </div>
                  ];
                })}
                empty="No hay sesiones semanales registradas."
              />
            </div>
          )}
        </div>
      </div>

      <Modal open={Boolean(selectedRegistro)} title="Detalle de sesion semanal" onClose={() => setSelectedRegistro(null)} size="lg">
        {selectedRegistro && (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Detail label="Paciente" value={nombrePaciente(selectedRegistro.paciente)} />
              <Detail label="Semana inicio" value={formatDate(selectedRegistro.semana_inicio)} />
              <Detail label="Semana fin" value={formatDate(selectedRegistro.semana_fin)} />
              <Detail label="Telefono" value={selectedRegistro.telefono} />
              <Detail label="Edad" value={selectedRegistro.edad} />
              <Detail label="Sexo" value={selectedRegistro.sexo} />
              <Detail label="Debe Bs" value={Number(selectedRegistro.debe_bs || 0).toFixed(2)} />
              <Detail label="Farmacos" value={selectedRegistro.aplica_farmacos ? 'Si aplica' : 'No aplica'} />
              <Detail label="Diagnostico" value={selectedRegistro.diagnostico} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {dias.map((dia) => (
                <Detail key={dia} label={dia} value={selectedRegistro[dia]} />
              ))}
            </div>
            <Detail label="Observacion" value={selectedRegistro.observacion} />
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
