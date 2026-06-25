import { useEffect, useMemo, useState } from 'react';
import { Eye, FilePenLine, IdCard, Phone, Plus, Search, Trash2, Users } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import { Avatar } from '../../components/common/ProfilePhoto';
import PacienteForm from './PacienteForm';
import { useAuth } from '../../context/AuthContext';
import { createPaciente, deletePaciente, getPacientes, updatePaciente } from '../../services/pacienteService';
import { cleanPayload, nombrePaciente } from '../../utils/validators';
import { formatDate } from '../../utils/formatDate';

const initialForm = {
  nombres: '',
  apellidos: '',
  ci: '',
  fecha_nacimiento: '',
  lugar_nacimiento: '',
  edad: '',
  sexo: 'F',
  telefono: '',
  foto: null,
  peso: '',
  talla: '',
  imc: '',
  domicilio: '',
  estado_civil: '',
  ocupacion: '',
  referencia: '',
  estado: true
};

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <span className="block text-xs font-black uppercase text-slate-500">{label}</span>
      <strong className="mt-1 block text-sm font-semibold text-ink">{value || 'Sin dato'}</strong>
    </div>
  );
}

function formatCivilStatus(value) {
  if (!value) return 'Sin dato';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function PatientInfo({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <span className="block text-[11px] font-black uppercase text-slate-400">{label}</span>
      <strong className="mt-1 block truncate text-sm font-semibold text-slate-700" title={value || 'Sin dato'}>
        {value || 'Sin dato'}
      </strong>
    </div>
  );
}

function Pacientes() {
  const { isAdmin } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setPacientes(await getPacientes());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = query.toLowerCase();
    return pacientes.filter((paciente) =>
      `${paciente.nombres || ''} ${paciente.apellidos || ''} ${paciente.ci || ''} ${paciente.telefono || ''}`.toLowerCase().includes(term)
    );
  }, [pacientes, query]);

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const payload = cleanPayload(form);
      editing ? await updatePaciente(editing, payload) : await createPaciente(payload);
      setForm(initialForm);
      setEditing(null);
      setShowFormModal(false);
      setMessage('Paciente guardado correctamente.');
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const editPaciente = (paciente) => {
    setEditing(paciente.id);
    setForm({ ...initialForm, ...paciente, fecha_nacimiento: paciente.fecha_nacimiento || '' });
    setShowFormModal(true);
  };

  const openNewPaciente = () => {
    setEditing(null);
    setForm(initialForm);
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditing(null);
    setForm(initialForm);
  };

  return (
    <section className="grid gap-5">
      {loading && <Loader />}

      <div className="overflow-hidden rounded-lg border border-white/60 bg-white shadow-soft">
        <div className="grid gap-3 bg-gradient-to-r from-[#123f3f] via-brand-700 to-brand-500 p-4 text-white md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-black uppercase text-brand-50">Registro clinico</p>
            <h2 className="mt-1 text-2xl font-black md:text-3xl">Pacientes</h2>
            <span className="mt-2 block text-sm text-brand-50">Datos personales, contacto y referencia clinica.</span>
          </div>
          <div className="rounded-lg border border-white/25 bg-white/15 p-4 text-center shadow-sm backdrop-blur">
            <Users className="mx-auto mb-1" size={24} />
            <strong className="block text-2xl">{pacientes.length}</strong>
            <span className="text-xs text-brand-50">Registrados</span>
          </div>
        </div>
      </div>

      {message && <p className="notice">{message}</p>}

      <div className="grid gap-5">
        <div className="panel">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Search size={18} className="shrink-0 text-slate-500" />
              <input
                className="w-full rounded-lg border-slate-200 bg-white/95 px-3 py-2.5 text-sm shadow-sm transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar paciente por nombre, CI o telefono"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase text-brand-700">{filtered.length} resultados</span>
              <Button onClick={openNewPaciente}>
                <Plus size={17} />
                Nuevo paciente
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            {filtered.map((paciente) => (
              <article key={paciente.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-md">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="grid min-w-0 gap-3 sm:grid-cols-[56px_minmax(0,1fr)]">
                    <Avatar src={paciente.foto} name={nombrePaciente(paciente)} size="md" />

                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <strong className="min-w-0 max-w-full truncate text-lg font-black text-ink">{nombrePaciente(paciente)}</strong>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase ${paciente.estado ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {paciente.estado ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <IdCard size={14} className="text-brand-600" />
                          CI {paciente.ci || 'sin dato'}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Phone size={14} className="text-brand-600" />
                          {paciente.telefono || 'Sin telefono'}
                        </span>
                      </div>

                      <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <PatientInfo label="Edad" value={paciente.edad ? `${paciente.edad} anios` : ''} />
                        <PatientInfo label="Sexo" value={paciente.sexo} />
                        <PatientInfo label="Estado civil" value={formatCivilStatus(paciente.estado_civil)} />
                        <PatientInfo label="Ocupacion" value={paciente.ocupacion} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 lg:justify-end">
                    <ActionButton className="h-10 w-10" label="Ver paciente" icon={Eye} tone="view" onClick={() => setSelectedPaciente(paciente)} />
                    <ActionButton className="h-10 w-10" label="Editar paciente" icon={FilePenLine} tone="edit" onClick={() => editPaciente(paciente)} />
                    {isAdmin && (
                      <ActionButton className="h-10 w-10" label="Eliminar paciente" icon={Trash2} tone="delete" onClick={() => deletePaciente(paciente.id).then(load)} />
                    )}
                  </div>
                </div>
              </article>
            ))}
            {filtered.length === 0 && <p className="empty-state">No hay pacientes para mostrar.</p>}
          </div>
        </div>
      </div>

      <Modal open={showFormModal} title={editing ? 'Editar paciente' : 'Nuevo paciente'} onClose={closeFormModal} size="compact">
        <PacienteForm form={form} setForm={setForm} editing={editing} onSubmit={submit} onCancel={closeFormModal} />
      </Modal>

      <Modal open={Boolean(selectedPaciente)} title={selectedPaciente ? nombrePaciente(selectedPaciente) : 'Detalle del paciente'} onClose={() => setSelectedPaciente(null)} size="lg">
        {selectedPaciente && (
          <div className="grid gap-4">
            <div className="flex items-center gap-4 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
              <Avatar src={selectedPaciente.foto} name={nombrePaciente(selectedPaciente)} size="lg" />
              <div className="min-w-0">
                <strong className="block truncate text-xl font-black text-ink">{nombrePaciente(selectedPaciente)}</strong>
                <span className="mt-1 block text-sm text-slate-500">{selectedPaciente.ci ? `CI ${selectedPaciente.ci}` : 'Sin CI registrado'}</span>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <Detail label="CI" value={selectedPaciente.ci} />
              <Detail label="Telefono" value={selectedPaciente.telefono} />
              <Detail label="Nacimiento" value={formatDate(selectedPaciente.fecha_nacimiento)} />
              <Detail label="Edad" value={selectedPaciente.edad ? `${selectedPaciente.edad} anios` : ''} />
              <Detail label="Sexo" value={selectedPaciente.sexo} />
              <Detail label="Estado civil" value={selectedPaciente.estado_civil} />
              <Detail label="Ocupacion" value={selectedPaciente.ocupacion} />
              <Detail label="Estado" value={selectedPaciente.estado ? 'Activo' : 'Inactivo'} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Detail label="Domicilio" value={selectedPaciente.domicilio} />
              <Detail label="Referencia" value={selectedPaciente.referencia} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedPaciente(null);
                  editPaciente(selectedPaciente);
                }}
              >
                <FilePenLine size={17} />
                Editar paciente
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

export default Pacientes;
