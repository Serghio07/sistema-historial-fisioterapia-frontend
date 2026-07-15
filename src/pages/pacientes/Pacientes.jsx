import { useEffect, useMemo, useState } from 'react';
import { Eye, FilePenLine, IdCard, Phone, Plus, Search, UserX, Users } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { Avatar } from '../../components/common/ProfilePhoto';
import PacienteForm from './PacienteForm';
import { createPaciente, deactivatePaciente, getPacientes, updatePaciente } from '../../services/pacienteService';
import { nombrePaciente } from '../../utils/validators';
import { formatDate } from '../../utils/formatDate';

const initialForm = {
  nombres: '', apellidos: '', ci: '', fecha_nacimiento: '', lugar_nacimiento: '',
  edad: '', sexo: '', telefono: '', foto: null, peso: '', talla: '', imc: '',
  domicilio: '', estado_civil: '', ocupacion: '', referencia: '', estado: true
};

const sexoLabel = (value) => ({ M: 'MASCULINO', F: 'FEMENINO' }[value] || value || '');

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <span className="block text-xs font-black uppercase text-slate-500">{label}</span>
      <strong className="mt-1 block text-sm font-semibold text-ink">{value || 'SIN DATO'}</strong>
    </div>
  );
}

function PatientInfo({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <span className="block text-[11px] font-black uppercase text-slate-400">{label}</span>
      <strong className="mt-1 block truncate text-sm font-semibold uppercase text-slate-700" title={value || 'SIN DATO'}>{value || 'SIN DATO'}</strong>
    </div>
  );
}

function Pacientes() {
  const [pacientes, setPacientes] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [confirmPaciente, setConfirmPaciente] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const notify = (text, type = 'success') => {
    if (type === 'success') return;
    setMessage({ text, type });
    window.setTimeout(() => setMessage(null), 4500);
  };

  const load = async () => {
    setLoading(true);
    try {
      setPacientes(await getPacientes());
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('es-BO');
    const isActive = statusFilter === 'active';
    return pacientes.filter((paciente) => {
      const matchesStatus = Boolean(paciente.estado) === isActive;
      const matchesQuery = `${paciente.nombres || ''} ${paciente.apellidos || ''} ${paciente.ci || ''} ${paciente.telefono || ''}`
        .toLocaleLowerCase('es-BO').includes(term);
      return matchesStatus && matchesQuery;
    });
  }, [pacientes, query, statusFilter]);
  const paginatedPatients = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [query, statusFilter, pageSize]);

  const patientCounts = useMemo(() => pacientes.reduce((counts, paciente) => {
    counts[paciente.estado ? 'active' : 'inactive'] += 1;
    return counts;
  }, { active: 0, inactive: 0 }), [pacientes]);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        nombres: form.nombres.trim().toLocaleUpperCase('es-BO'),
        apellidos: form.apellidos.trim().toLocaleUpperCase('es-BO'),
        lugar_nacimiento: form.lugar_nacimiento?.trim().toLocaleUpperCase('es-BO') || null,
        ocupacion: form.ocupacion?.trim().toLocaleUpperCase('es-BO') || null,
        domicilio: form.domicilio?.trim().toLocaleUpperCase('es-BO') || null,
        referencia: form.referencia?.trim().toLocaleUpperCase('es-BO') || null
      };
      editing ? await updatePaciente(editing, payload) : await createPaciente(payload);
      closeFormModal();
      notify(editing ? 'Paciente actualizado correctamente.' : 'Paciente registrado correctamente.');
      await load();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const editPaciente = (paciente) => {
    setEditing(paciente.id);
    setForm({
      ...initialForm,
      ...paciente,
      sexo: sexoLabel(paciente.sexo),
      fecha_nacimiento: paciente.fecha_nacimiento || '',
      peso: paciente.peso || '',
      talla: paciente.talla || '',
      imc: paciente.imc || ''
    });
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditing(null);
    setForm(initialForm);
  };

  const deactivate = async () => {
    try {
      await deactivatePaciente(confirmPaciente.id);
      setConfirmPaciente(null);
      notify('Paciente desactivado correctamente.');
      await load();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  return (
    <section className="grid gap-5">
      {loading && <Loader />}

      <div className="overflow-hidden rounded-xl border border-white/60 bg-white shadow-soft">
        <div className="grid gap-3 bg-gradient-to-r from-[#123f3f] via-brand-700 to-brand-500 p-5 text-white md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-black uppercase text-brand-50">Registro de pacientes</p>
            <h1 className="mt-1 text-2xl font-black uppercase md:text-3xl">Pacientes</h1>
            <p className="mt-2 text-sm text-brand-50">Datos personales, contacto y referencia del paciente.</p>
          </div>
          <div className="rounded-xl border border-white/25 bg-white/15 p-4 text-center shadow-sm backdrop-blur">
            <Users className="mx-auto mb-1" size={24} />
            <strong className="block text-2xl">{pacientes.length}</strong>
            <span className="text-xs uppercase text-brand-50">Registrados</span>
          </div>
        </div>
      </div>

      {message && <p role="status" className={`rounded-lg border p-3 text-sm font-semibold ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{message.text}</p>}

      <div className="panel">
        <div className="mb-4 flex gap-2 border-b border-slate-200" role="tablist" aria-label="Estado de pacientes">
          {[
            { id: 'active', label: 'PACIENTES ACTIVOS', count: patientCounts.active },
            { id: 'inactive', label: 'PACIENTES INACTIVOS', count: patientCounts.inactive }
          ].map((tab) => {
            const selected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setStatusFilter(tab.id)}
                className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-black transition ${
                  selected
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                {tab.label}
                <span className={`rounded-full px-2 py-0.5 text-xs ${selected ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex min-w-[240px] flex-1 items-center gap-2">
            <Search size={18} className="shrink-0 text-slate-500" />
            <input className="w-full rounded-lg border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, apellido, CI o teléfono" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase text-brand-700">{filtered.length} resultados</span>
            <Button onClick={() => setShowFormModal(true)}><Plus size={17} />NUEVO PACIENTE</Button>
          </div>
        </div>

        <div className="grid gap-3">
          {paginatedPatients.map((paciente) => (
            <article key={paciente.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-md">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="grid min-w-0 gap-3 sm:grid-cols-[56px_minmax(0,1fr)]">
                  <Avatar src={paciente.foto} name={nombrePaciente(paciente)} size="md" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="truncate text-lg font-black uppercase text-ink">{nombrePaciente(paciente)}</strong>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${paciente.estado ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{paciente.estado ? 'ACTIVO' : 'INACTIVO'}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1.5"><IdCard size={14} className="text-brand-600" />CI: {paciente.ci || 'SIN DATO'}</span>
                      <span className="inline-flex items-center gap-1.5"><Phone size={14} className="text-brand-600" />TEL: {paciente.telefono || 'SIN DATO'}</span>
                    </div>
                    <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <PatientInfo label="Edad" value={paciente.edad != null ? `${paciente.edad} AÑOS` : ''} />
                      <PatientInfo label="Sexo" value={sexoLabel(paciente.sexo)} />
                      <PatientInfo label="Estado civil" value={paciente.estado_civil} />
                      <PatientInfo label="Ocupación" value={paciente.ocupacion} />
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 lg:justify-end">
                  <ActionButton className="h-10 w-10" label="Ver datos" icon={Eye} tone="view" onClick={() => setSelectedPaciente(paciente)} />
                  <ActionButton className="h-10 w-10" label="Editar paciente" icon={FilePenLine} tone="edit" onClick={() => editPaciente(paciente)} />
                  {paciente.estado && <ActionButton className="h-10 w-10" label="Desactivar paciente" icon={UserX} tone="delete" onClick={() => setConfirmPaciente(paciente)} />}
                </div>
              </div>
            </article>
          ))}
          {!filtered.length && (
            <p className="empty-state">
              {query.trim()
                ? 'No se encontraron pacientes con esa búsqueda.'
                : statusFilter === 'active'
                  ? 'No hay pacientes activos.'
                  : 'No hay pacientes inactivos.'}
            </p>
          )}
        </div>
        <Pagination total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      <Modal open={showFormModal} title={editing ? 'EDITAR PACIENTE' : 'NUEVO PACIENTE'} subtitle="Complete los datos generales del paciente." onClose={closeFormModal} size="lg">
        <PacienteForm form={form} setForm={setForm} onSubmit={submit} onCancel={closeFormModal} submitting={submitting} />
      </Modal>

      <Modal open={Boolean(selectedPaciente)} title="DATOS DEL PACIENTE" onClose={() => setSelectedPaciente(null)} size="lg">
        {selectedPaciente && (
          <div className="grid gap-4">
            <div className="flex items-center gap-4 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
              <Avatar src={selectedPaciente.foto} name={nombrePaciente(selectedPaciente)} size="lg" />
              <div className="min-w-0"><strong className="block truncate text-xl font-black uppercase text-ink">{nombrePaciente(selectedPaciente)}</strong><span className="mt-1 block text-sm font-bold text-brand-700">{selectedPaciente.estado ? 'ACTIVO' : 'INACTIVO'}</span></div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <Detail label="CI" value={selectedPaciente.ci} /><Detail label="Teléfono" value={selectedPaciente.telefono} />
              <Detail label="Nacimiento" value={formatDate(selectedPaciente.fecha_nacimiento)} /><Detail label="Edad" value={selectedPaciente.edad != null ? `${selectedPaciente.edad} AÑOS` : ''} />
              <Detail label="Lugar de nacimiento" value={selectedPaciente.lugar_nacimiento} /><Detail label="Sexo" value={sexoLabel(selectedPaciente.sexo)} />
              <Detail label="Estado civil" value={selectedPaciente.estado_civil} /><Detail label="Ocupación" value={selectedPaciente.ocupacion} />
              <Detail label="Peso" value={selectedPaciente.peso ? `${selectedPaciente.peso} KG` : ''} /><Detail label="Talla" value={selectedPaciente.talla ? `${selectedPaciente.talla} M` : ''} />
              <Detail label="IMC" value={selectedPaciente.imc} />
            </div>
            <div className="grid gap-3 md:grid-cols-2"><Detail label="Domicilio" value={selectedPaciente.domicilio} /><Detail label="Punto de referencia" value={selectedPaciente.referencia} /></div>
            <div className="flex justify-end"><Button variant="ghost" onClick={() => { setSelectedPaciente(null); editPaciente(selectedPaciente); }}><FilePenLine size={17} />EDITAR</Button></div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(confirmPaciente)} title="DESACTIVAR PACIENTE" onClose={() => setConfirmPaciente(null)} size="sm">
        <p className="text-sm text-slate-600">¿Confirma que desea desactivar a <strong className="uppercase text-ink">{confirmPaciente && nombrePaciente(confirmPaciente)}</strong>? Sus datos se conservarán.</p>
        <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmPaciente(null)}>CANCELAR</Button><Button onClick={deactivate}><UserX size={17} />DESACTIVAR</Button></div>
      </Modal>
    </section>
  );
}

export default Pacientes;
