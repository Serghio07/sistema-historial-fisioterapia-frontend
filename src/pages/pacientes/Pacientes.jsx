import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, BriefcaseBusiness, CalendarDays, Eye, FilePenLine, Filter, Gauge, Heart, Home, IdCard, MapPin, Phone, Plus, Ruler, Scale, Search, UserRound, UserX, Users } from 'lucide-react';
import Swal from 'sweetalert2';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { Avatar } from '../../components/common/ProfilePhoto';
import PacienteForm from './PacienteForm';
import ContactosPaciente from './ContactosPaciente';
import { createPaciente, createPacienteWithContacts, deactivatePaciente, getPacientes, getPacientesPendientesWhatsapp, updatePaciente } from '../../services/pacienteService';
import { listContactosPaciente } from '../../services/contactoService';
import { formatPatientDocument, nombrePaciente, patientDocumentSearchText } from '../../utils/validators';
import { formatDate } from '../../utils/formatDate';
import { matchesSearch } from '../../utils/search';
import { isMinorByBirthDate } from '../../utils/patientAge';
import { getDisplayPhoneText, getResponsibleSummary, isAdministrativeContactPhone } from '../../utils/patientContact';

const initialForm = {
  nombres: '', apellidos: '', ci: '', tipo_documento: 'CI', numero_documento: '', nombre_documento_otro: '', fecha_nacimiento: '', lugar_nacimiento: '',
  edad: '', sexo: '', telefono: '', foto: null, peso: '', talla: '', imc: '',
  domicilio: '', estado_civil: '', ocupacion: '', referencia: '', estado: true
};

const sexoLabel = (value) => ({ M: 'MASCULINO', F: 'FEMENINO' }[value] || value || '');

function Detail({ icon: Icon, label, value, className = '', highlight = false }) {
  return (
    <div className={`flex min-w-0 items-start gap-2.5 rounded-[10px] border px-3 py-3 ${highlight ? 'border-blue-100 bg-[#EFF6FF]' : 'border-[#E2E8F0] bg-[#F8FAFC]'} ${className}`}>
      {Icon && <Icon size={17} className={`mt-0.5 shrink-0 ${highlight ? 'text-[#2563EB]' : 'text-[#0F766E]'}`} />}
      <div className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-[0.04em] text-[#64748B]">{label}</span><strong className={`mt-1 block truncate text-sm font-medium ${highlight ? 'text-[#1D4ED8]' : 'text-[#1E293B]'}`} title={value || 'SIN DATO'}>{value || 'SIN DATO'}</strong></div>
    </div>
  );
}

function Pacientes() {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState([]);
  const [pendingPatients, setPendingPatients] = useState([]);
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preparedContacts, setPreparedContacts] = useState([]);
  const [message, setMessage] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  const notify = (text, type = 'success') => {
    if (type === 'success') return;
    setMessage({ text, type });
    window.setTimeout(() => setMessage(null), 4500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [patientRows, pending] = await Promise.all([
        getPacientes({ includeTemporales: true }),
        getPacientesPendientesWhatsapp()
      ]);
      setPacientes(patientRows);
      setPendingPatients(pending || []);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const isActive = statusFilter === 'active';
    if (statusFilter === 'pending') return [];
    return pacientes.filter((paciente) => {
      if (paciente.registro_pendiente === true) return false;
      const matchesStatus = Boolean(paciente.estado) === isActive;
      const matchesQuery = matchesSearch(`${paciente.nombres || ''} ${paciente.apellidos || ''} ${patientDocumentSearchText(paciente)} ${paciente.telefono || ''} ${paciente.telefono_administrativo || ''}`, query);
      return matchesStatus && matchesQuery;
    });
  }, [pacientes, query, statusFilter]);
  const filteredPending = useMemo(() => pendingPatients.filter((item) => matchesSearch(`${item.nombre || ''} ${item.telefono || ''} ${item.motivo || ''}`, query)), [pendingPatients, query]);
  const paginatedPatients = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [query, statusFilter, pageSize]);

  const patientCounts = useMemo(() => pacientes.reduce((counts, paciente) => {
    if (paciente.registro_pendiente === true) return counts;
    counts[paciente.estado ? 'active' : 'inactive'] += 1;
    return counts;
  }, { active: 0, inactive: 0 }), [pacientes]);
  const duplicateCiPatient = useMemo(() => {
    const numero = String(form.numero_documento || '').trim().toLocaleUpperCase('es-BO').replace(/\s+/g, ' ');
    if (!numero) return null;
    return pacientes.find((paciente) =>
      String(paciente.tipo_documento || (paciente.ci ? 'CI' : '')).toLocaleUpperCase('es-BO') === form.tipo_documento
      && String(paciente.numero_documento || paciente.ci || '').trim().toLocaleUpperCase('es-BO').replace(/\s+/g, ' ') === numero
      && String(paciente.id) !== String(editing || '')
    ) || null;
  }, [pacientes, form.tipo_documento, form.numero_documento, editing]);
  const ciError = duplicateCiPatient
    ? `Este documento ya pertenece a ${nombrePaciente(duplicateCiPatient)} (${duplicateCiPatient.estado ? 'paciente activo' : 'paciente inactivo'}).`
    : '';

  const submit = async (event) => {
    event.preventDefault();
    if (duplicateCiPatient) {
      notify('No se puede registrar: el documento ya pertenece a otro paciente.', 'error');
      return;
    }
    const isMinor = isMinorByBirthDate(form.fecha_nacimiento);
    if (isMinor) {
      let hasGuardian = preparedContacts.some((item) => item.es_contacto_principal && item.contacto?.telefono);
      try { if (editing) hasGuardian = (await listContactosPaciente(editing)).some((item) => item.estado && item.es_contacto_principal && item.contacto?.telefono); }
      catch (error) { notify(`No se pudo verificar el responsable: ${error.message}`, 'error'); return; }
      if (!hasGuardian) { notify('Debe seleccionar un responsable principal para el paciente menor.', 'error'); return; }
    } else if (!String(form.telefono || '').trim()) {
      notify('Debe ingresar el teléfono del paciente.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        nombres: form.nombres.trim().toLocaleUpperCase('es-BO'),
        apellidos: form.apellidos.trim().toLocaleUpperCase('es-BO'),
        lugar_nacimiento: form.lugar_nacimiento?.trim().toLocaleUpperCase('es-BO') || null,
        ocupacion: form.ocupacion?.trim().toLocaleUpperCase('es-BO') || null,
        domicilio: form.domicilio?.trim().toLocaleUpperCase('es-BO') || null,
        referencia: form.referencia?.trim().toLocaleUpperCase('es-BO') || null,
        ...(pendingRegistration ? { whatsapp_derivacion_id: pendingRegistration.id } : {})
      };
      const relationKeys = ['parentesco', 'parentesco_otro', 'es_contacto_principal', 'es_responsable_legal', 'recibe_recordatorios', 'puede_gestionar_citas', 'autoriza_whatsapp', 'prioridad', 'observaciones'];
      const contactPayload = preparedContacts.map((item) => ({
        contacto_id: item.contacto_id || undefined,
        contacto: item.contacto_id ? undefined : item.nuevo_contacto,
        relacion: Object.fromEntries(relationKeys.map((key) => [key, item[key]]))
      }));
      const createPayload = payload;
      if (editing) await updatePaciente(editing, payload);
      else if (preparedContacts.length) await createPacienteWithContacts(createPayload, contactPayload);
      else await createPaciente(createPayload);
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
      tipo_documento: paciente.tipo_documento || (paciente.ci ? 'CI' : 'CI'),
      numero_documento: paciente.numero_documento || paciente.ci || '',
      sexo: sexoLabel(paciente.sexo),
      fecha_nacimiento: paciente.fecha_nacimiento || '',
      peso: paciente.peso || '',
      talla: paciente.talla || '',
      imc: paciente.imc || ''
    });
    setShowFormModal(true);
    setPreparedContacts([]);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditing(null);
    setForm(initialForm);
    setPendingRegistration(null);
    setPreparedContacts([]);
  };

  const syncAdministrativeContact = (items, patientId = editing) => {
    if (!patientId) return;
    const relation = items.find((item) => item.estado !== false && item.es_contacto_principal);
    const contact = relation?.contacto;
    const administrative = {
      telefono_administrativo: contact?.telefono || null,
      telefono_fuente: contact?.telefono ? 'CONTACTO' : null,
      responsable_principal: contact ? {
        id: contact.id,
        nombres: contact.nombres,
        apellidos: contact.apellidos,
        parentesco: relation.parentesco,
        parentesco_otro: relation.parentesco_otro,
        paciente_id: contact.paciente_id || null
      } : null
    };
    setPacientes((current) => current.map((patient) => String(patient.id) === String(patientId) ? { ...patient, ...administrative } : patient));
    setSelectedPaciente((patient) => patient && String(patient.id) === String(patientId) ? { ...patient, ...administrative } : patient);
  };

  const registerPending = (item) => {
    const parts = String(item.nombre || '').trim().split(/\s+/);
    setPendingRegistration(item);
    setForm({ ...initialForm, nombres: parts.shift() || '', apellidos: parts.join(' '), telefono: item.telefono || '', referencia: item.motivo ? `SOLICITUD WHATSAPP: ${item.motivo}` : '' });
    setShowFormModal(true);
  };

  const deactivate = async (paciente) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Desactivar paciente?',
      text: `${nombrePaciente(paciente)} — El paciente dejará de aparecer en la lista de pacientes activos.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#64748B',
      reverseButtons: true,
      background: '#FFFFFF'
    });
    if (!result.isConfirmed) return;
    try {
      await deactivatePaciente(paciente.id);
      await load();
      await Swal.fire({ icon: 'success', title: 'Paciente desactivado correctamente', confirmButtonColor: '#0F766E' });
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  return (
    <section className="grid gap-5">
      {loading && <Loader />}

      <div className="relative overflow-hidden rounded-xl border border-[#CCFBF1] bg-[linear-gradient(90deg,#ECFDF5_0%,#FFFFFF_52%,#EFF6FF_100%)] p-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)] md:px-5 md:py-4">
        <Users size={150} strokeWidth={1} className="pointer-events-none absolute bottom-[-52px] right-[16%] text-[#0F766E]/[0.03]" />
        <div className="relative grid items-center gap-3 md:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#BEEBE5] bg-white/80 text-[#0F766E] shadow-sm"><Users size={22} /></span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#0F766E]">Gestión clínica</p>
              <h1 className="text-2xl font-bold leading-tight text-[#1E293B] md:text-3xl">Pacientes</h1>
              <p className="mt-1 text-sm text-[#64748B]">Datos personales, contacto y referencia del paciente.</p>
            </div>
          </div>
          <div className="min-w-28 rounded-xl border border-[rgba(15,118,110,0.14)] bg-white/75 px-4 py-2.5 text-center shadow-sm backdrop-blur">
            <span className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-[#ECFDF5] text-[#0F766E]"><Users size={18} /></span>
            <strong className="mt-1 block text-xl font-bold leading-none text-[#0F766E]">{patientCounts.active + patientCounts.inactive}</strong>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">Registrados</span>
          </div>
        </div>
      </div>

      {message && <p role="status" className={`rounded-lg border p-3 text-sm font-semibold ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{message.text}</p>}

      <div className="panel">
        <div className="mb-4 flex gap-2 border-b border-slate-200" role="tablist" aria-label="Estado de pacientes">
          {[
            { id: 'active', label: 'PACIENTES ACTIVOS', count: patientCounts.active },
            { id: 'pending', label: 'PACIENTES PENDIENTES', count: pendingPatients.length },
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
                className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-bold transition ${
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

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input className="w-full rounded-lg border-[#CBD5E1] bg-white py-2.5 pl-11 pr-3 text-sm text-[#334155] shadow-sm placeholder:text-[#94A3B8] focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/[0.12]" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, apellido, documento o teléfono" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters}><Filter size={17} />Filtros</Button>
            <Button onClick={() => setShowFormModal(true)}><Plus size={17} />Nuevo paciente</Button>
          </div>
        </div>

        {showFilters && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2"><span className="px-2 text-xs font-semibold text-[#64748B]">Estado:</span>{[['active', 'Activos'], ['inactive', 'Inactivos']].map(([value, label]) => <button key={value} type="button" onClick={() => setStatusFilter(value)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${statusFilter === value ? 'bg-[#0F766E] text-white' : 'bg-white text-[#64748B] hover:text-[#334155]'}`}>{label}</button>)}{query && <button type="button" onClick={() => setQuery('')} className="ml-auto px-2 text-xs font-semibold text-[#0F766E]">Limpiar búsqueda</button>}</div>}
        <p className="mb-4 text-xs font-medium text-[#64748B]">Mostrando {statusFilter === 'pending' ? filteredPending.length : paginatedPatients.length} de {statusFilter === 'pending' ? filteredPending.length : filtered.length} pacientes</p>

        <div className="grid gap-3">
          {statusFilter === 'pending' && filteredPending.map((item) => <article key={`pending-${item.id}`} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><strong className="text-base text-slate-900">{item.nombre}</strong><p className="mt-1 text-sm text-slate-600">{item.telefono} · {item.fecha || 'Sin fecha'} · {item.hora_inicio || 'Sin horario'}</p><p className="mt-1 text-sm text-slate-600">{item.motivo || 'Sin motivo'}</p><span className="mt-2 inline-block rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700">{item.estado === 'EN_ATENCION' ? 'EN ATENCIÓN' : 'PENDIENTE'}</span></div><div className="flex gap-2"><Button variant="secondary" onClick={() => navigate('/whatsapp/recepcion', { state: { derivacionId: item.id } })}><Eye size={16}/>Ver solicitud</Button><Button onClick={() => registerPending(item)}><Plus size={16}/>Registrar paciente</Button></div></div></article>)}
          {paginatedPatients.map((paciente) => (
            <article key={paciente.id} className="rounded-xl border border-[#DCE5EC] bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-px hover:border-[#99F6E4] hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="grid min-w-0 gap-3 sm:grid-cols-[56px_minmax(0,1fr)]">
                  <Avatar src={paciente.foto} name={nombrePaciente(paciente)} size="md" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="truncate text-base font-bold uppercase text-[#1E293B]">{nombrePaciente(paciente)}</strong>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${paciente.estado ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{paciente.estado ? 'ACTIVO' : 'INACTIVO'}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1.5"><IdCard size={14} className="text-brand-600" />Documento: {formatPatientDocument(paciente) || 'SIN DATO'}</span>
                      <span className="inline-flex min-w-0 items-center gap-1.5"><Phone size={14} className="shrink-0 text-brand-600" /><span className="truncate">TEL: {getDisplayPhoneText(paciente)}</span>{isAdministrativeContactPhone(paciente) && <small title={getResponsibleSummary(paciente)} className="rounded bg-teal-50 px-1.5 py-0.5 text-[9px] font-bold text-teal-700">TUTOR</small>}</span>
                    </div>
                    <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm font-medium text-[#334155]">
                      <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-[#0F766E]" />{paciente.edad != null ? `${paciente.edad} años` : 'Sin edad'}</span><i className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
                      <span className="inline-flex items-center gap-1.5"><UserRound size={14} className="text-[#0F766E]" />{sexoLabel(paciente.sexo) || 'Sin sexo'}</span><i className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
                      <span className="inline-flex items-center gap-1.5"><Heart size={14} className="text-[#0F766E]" />{paciente.estado_civil || 'Sin estado civil'}</span><i className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
                      <span className="inline-flex min-w-0 items-center gap-1.5"><BriefcaseBusiness size={14} className="shrink-0 text-[#0F766E]" /><span className="truncate">{paciente.ocupacion || 'Sin ocupación'}</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 lg:justify-end">
                  <ActionButton className="h-10 w-10" label="Ver datos" icon={Eye} tone="view" onClick={() => setSelectedPaciente(paciente)} />
                  <ActionButton className="h-10 w-10" label="Editar paciente" icon={FilePenLine} tone="edit" onClick={() => editPaciente(paciente)} />
                  {paciente.estado && <ActionButton className="h-10 w-10" label="Desactivar paciente" icon={UserX} tone="delete" onClick={() => deactivate(paciente)} />}
                </div>
              </div>
            </article>
          ))}
          {statusFilter === 'pending' && !filteredPending.length && <p className="empty-state">No hay pacientes pendientes de registro.</p>}
          {statusFilter !== 'pending' && !filtered.length && (
            <p className="empty-state">
              {query.trim()
                ? 'No se encontraron pacientes con esa búsqueda.'
                : statusFilter === 'active'
                  ? 'No hay pacientes activos.'
                  : 'No hay pacientes inactivos.'}
            </p>
          )}
        </div>
        {statusFilter !== 'pending' && <Pagination total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
      </div>

      <Modal open={showFormModal} title={editing ? 'EDITAR PACIENTE' : pendingRegistration ? 'REGISTRAR PACIENTE PENDIENTE' : 'NUEVO PACIENTE'} subtitle={pendingRegistration ? 'Complete los datos restantes. Al guardar se vinculará su cita de WhatsApp.' : 'Complete los datos generales del paciente.'} onClose={closeFormModal} size="patient">
        <PacienteForm form={form} setForm={setForm} onSubmit={submit} onCancel={closeFormModal} submitting={submitting} ciError={ciError} pacienteId={editing} preparedContacts={preparedContacts} onPreparedContactsChange={setPreparedContacts} onLinkedContactsChange={syncAdministrativeContact} />
      </Modal>

      <Modal open={Boolean(selectedPaciente)} title="Datos del paciente" subtitle="Información personal y clínica registrada" onClose={() => setSelectedPaciente(null)} size="patient" patientStyle>
        {selectedPaciente && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
              <div className="grid gap-4 lg:grid-cols-[215px_minmax(0,1fr)]">
                <aside className="rounded-[14px] border border-[#CCFBF1] bg-[linear-gradient(180deg,#F0FDFA_0%,#FFFFFF_100%)] p-5 lg:self-start">
                  <div className="relative mx-auto w-fit"><Avatar src={selectedPaciente.foto} name={nombrePaciente(selectedPaciente)} size="patient" /><span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-[3px] border-white ${selectedPaciente.estado ? 'bg-[#10B981]' : 'bg-[#94A3B8]'}`} /></div>
                  <strong className="mt-4 block text-center text-base font-bold uppercase text-[#1E293B]">{nombrePaciente(selectedPaciente)}</strong>
                  <span className={`mx-auto mt-2 block w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${selectedPaciente.estado ? 'bg-[#D1FAE5] text-[#047857]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>{selectedPaciente.estado ? 'ACTIVO' : 'INACTIVO'}</span>
                  <dl className="mt-5 divide-y divide-[#E2E8F0] border-t border-[#E2E8F0] text-xs">
                    {[[IdCard, 'Documento', formatPatientDocument(selectedPaciente)], [Phone, 'Teléfono de contacto', getDisplayPhoneText(selectedPaciente)], [CalendarDays, 'Edad', selectedPaciente.edad != null ? `${selectedPaciente.edad} años` : ''], [CalendarDays, 'Nacimiento', formatDate(selectedPaciente.fecha_nacimiento)]].map(([Icon, label, value]) => <div key={label} className="flex gap-2.5 py-3"><Icon size={15} className="mt-0.5 shrink-0 text-[#0F766E]" /><div className="min-w-0"><dt className="text-[10px] font-semibold text-[#64748B]">{label}</dt><dd className="mt-0.5 break-words font-medium text-[#1E293B]">{value || '—'}</dd>{label === 'Teléfono de contacto' && isAdministrativeContactPhone(selectedPaciente) && <small className="block text-[10px] font-semibold text-[#0F766E]">Responsable</small>}</div></div>)}
                  </dl>
                </aside>

                <div className="grid min-w-0 gap-4">
                  <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
                    <h3 className="flex items-center gap-2 border-b border-[#E2E8F0] px-4 py-3 text-sm font-bold text-[#0F766E]"><UserRound size={17} />Información personal</h3>
                    <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                      <Detail icon={IdCard} label="Documento" value={formatPatientDocument(selectedPaciente)} /><Detail icon={Phone} label="Teléfono personal" value={selectedPaciente.telefono || '—'} /><Detail icon={Phone} label="Teléfono administrativo" value={selectedPaciente.telefono_administrativo || '—'} />
                      <Detail icon={CalendarDays} label="Fecha de nacimiento" value={formatDate(selectedPaciente.fecha_nacimiento)} /><Detail icon={UserRound} label="Edad" value={selectedPaciente.edad != null ? `${selectedPaciente.edad} años` : ''} />
                      <Detail icon={MapPin} label="Lugar de nacimiento" value={selectedPaciente.lugar_nacimiento} /><Detail icon={UserRound} label="Sexo" value={sexoLabel(selectedPaciente.sexo)} />
                      <Detail icon={Heart} label="Estado civil" value={selectedPaciente.estado_civil} /><Detail icon={BriefcaseBusiness} label="Ocupación" value={selectedPaciente.ocupacion} />
                    </div>
                  </section>
                  <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
                    <h3 className="flex items-center gap-2 border-b border-[#E2E8F0] px-4 py-3 text-sm font-bold text-[#0F766E]"><Activity size={17} />Datos físicos</h3>
                    <div className="grid gap-3 p-4 sm:grid-cols-3"><Detail icon={Scale} label="Peso" value={selectedPaciente.peso ? `${selectedPaciente.peso} kg` : ''} /><Detail icon={Ruler} label="Talla" value={selectedPaciente.talla ? `${selectedPaciente.talla} m` : ''} /><Detail icon={Gauge} label="IMC" value={selectedPaciente.imc} highlight /></div>
                  </section>
                  <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
                    <h3 className="flex items-center gap-2 border-b border-[#E2E8F0] px-4 py-3 text-sm font-bold text-[#0F766E]"><MapPin size={17} />Ubicación y referencia</h3>
                    <div className="grid gap-3 p-4 sm:grid-cols-2"><Detail icon={Home} label="Domicilio" value={selectedPaciente.domicilio} /><Detail icon={MapPin} label="Punto de referencia" value={selectedPaciente.referencia} /></div>
                  </section>
                  {isMinorByBirthDate(selectedPaciente.fecha_nacimiento) && <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
                    <ContactosPaciente paciente={selectedPaciente} readOnly onItemsChange={(items) => syncAdministrativeContact(items, selectedPaciente.id)} />
                  </section>}
                </div>
              </div>
            </div>
            <footer className="flex shrink-0 justify-end gap-2 border-t border-[#E2E8F0] bg-white px-5 py-4 md:px-6"><Button variant="secondary" onClick={() => setSelectedPaciente(null)}>Cerrar</Button><Button onClick={() => { setSelectedPaciente(null); editPaciente(selectedPaciente); }}><FilePenLine size={17} />Editar paciente</Button></footer>
          </div>
        )}
      </Modal>
    </section>
  );
}

export default Pacientes;
