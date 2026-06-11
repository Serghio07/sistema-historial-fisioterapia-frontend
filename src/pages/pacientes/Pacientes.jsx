import { useEffect, useMemo, useState } from 'react';
import { Eye, FilePenLine, IdCard, Phone, Search, Trash2, UserRound, Users } from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
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
  edad: '',
  sexo: 'F',
  telefono: '',
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

function Pacientes() {
  const { isAdmin } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
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
      setMessage('Paciente guardado correctamente.');
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const editPaciente = (paciente) => {
    setEditing(paciente.id);
    setForm({ ...initialForm, ...paciente, fecha_nacimiento: paciente.fecha_nacimiento || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="grid gap-5">
      {loading && <Loader />}

      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="grid gap-4 bg-gradient-to-r from-brand-900 to-brand-600 p-6 text-white md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-black uppercase text-brand-50">Registro clinico</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Pacientes</h2>
            <span className="mt-2 block text-sm text-brand-50">Datos personales, contacto y referencia clinica.</span>
          </div>
          <div className="rounded-lg bg-white/15 p-4 text-center">
            <Users className="mx-auto mb-1" size={24} />
            <strong className="block text-2xl">{pacientes.length}</strong>
            <span className="text-xs text-brand-50">Registrados</span>
          </div>
        </div>
      </div>

      {message && <p className="notice">{message}</p>}

      <div className="grid gap-5 xl:grid-cols-[520px_1fr]">
        <div className="panel xl:sticky xl:top-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-ink">{editing ? 'Editar paciente' : 'Nuevo paciente'}</h3>
              <p className="text-sm text-slate-500">Completa los datos generales del paciente.</p>
            </div>
            <UserRound className="text-brand-600" size={24} />
          </div>
          <PacienteForm
            form={form}
            setForm={setForm}
            editing={editing}
            onSubmit={submit}
            onCancel={() => {
              setEditing(null);
              setForm(initialForm);
            }}
          />
        </div>

        <div className="panel">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Search size={18} className="shrink-0 text-slate-500" />
              <input
                className="w-full rounded-lg border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar paciente por nombre, CI o telefono"
              />
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase text-brand-700">{filtered.length} resultados</span>
          </div>

          <div className="grid gap-3">
            {filtered.map((paciente) => (
              <article key={paciente.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-300 hover:bg-white">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <strong className="block text-base text-ink">{nombrePaciente(paciente)}</strong>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2">
                        <IdCard size={15} />
                        {paciente.ci || 'Sin CI'}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2">
                        <Phone size={15} />
                        {paciente.telefono || 'Sin telefono'}
                      </span>
                      <span className="rounded-lg bg-white px-3 py-2">{paciente.edad ? `${paciente.edad} anios` : 'Sin edad'}</span>
                      <span className="rounded-lg bg-white px-3 py-2">{paciente.sexo || 'Sin sexo'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" className="w-10 px-0" onClick={() => setSelectedPaciente(paciente)}>
                      <Eye size={17} />
                    </Button>
                    <Button variant="ghost" className="w-10 px-0" onClick={() => editPaciente(paciente)}>
                      <FilePenLine size={17} />
                    </Button>
                    {isAdmin && (
                      <Button variant="danger" className="w-10 px-0" onClick={() => deletePaciente(paciente.id).then(load)}>
                        <Trash2 size={17} />
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {filtered.length === 0 && <p className="empty-state">No hay pacientes para mostrar.</p>}
          </div>
        </div>
      </div>

      <Modal open={Boolean(selectedPaciente)} title={selectedPaciente ? nombrePaciente(selectedPaciente) : 'Detalle del paciente'} onClose={() => setSelectedPaciente(null)} size="lg">
        {selectedPaciente && (
          <div className="grid gap-4">
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
