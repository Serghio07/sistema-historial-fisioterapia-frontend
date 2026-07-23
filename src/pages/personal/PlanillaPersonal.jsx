import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';
import { Banknote, Download, Eye, FilePenLine, FileSpreadsheet, LockKeyhole, Maximize2, MoreHorizontal, Plus, Printer, Save, Trash2, Users, ZoomIn, ZoomOut } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import { useAuth } from '../../context/AuthContext';
import { getPersonal } from '../../services/personalService';
import { anularPlanillaPersonal, cerrarPlanillaPersonal, createPlanillaPersonal, deletePlanillaPersonal, getPlanillasPersonal, reabrirPlanillaPersonal, updatePlanillaPersonal } from '../../services/planillaPersonalService';
import { exportPlanillaExcel, exportPlanillasGeneralExcel, MESES } from '../../utils/exportPlanillaExcel';
import { formatDate } from '../../utils/formatDate';
import PlanillaSueldoDocumento from './PlanillaSueldoDocumento';

const now = new Date();
const today = now.toISOString().slice(0, 10);
const money = (value) => `${Number(value || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`;
const amount = (item) => item.tipo_pago === 'por_servicio' ? Number(item.monto_servicio || 0) : Number(item.sueldo_base || 0);
const horario = (persona) => {
  const dias = (persona.dias_trabajo || []).map((dia) => dia.slice(0, 3)).join(', ');
  const horas = persona.hora_entrada && persona.hora_salida ? `${String(persona.hora_entrada).slice(0, 5)}-${String(persona.hora_salida).slice(0, 5)}` : '';
  return [dias, horas].filter(Boolean).join(' ');
};
const snapshot = (persona) => ({ personal_id: persona.id, apellido_paterno: persona.apellido_paterno, apellido_materno: persona.apellido_materno || '', nombres: persona.nombres, ci: persona.ci, cargo: persona.cargo, horario: horario(persona), tipo_pago: persona.tipo_pago, sueldo_base: persona.tipo_pago === 'por_servicio' ? '' : persona.sueldo_base || '', monto_servicio: '', estado_laboral: persona.estado, firma: '' });
const initialForm = { mes: now.getMonth() + 1, anio: now.getFullYear(), fecha_planilla: today, observaciones: '', estado: 'borrador', detalles: [] };
const stateTone = { borrador: 'bg-violet-50 text-violet-700', cerrada: 'bg-emerald-50 text-emerald-700', anulada: 'bg-red-50 text-red-700' };

function PlanillaPersonal() {
  const { isAdmin, user } = useAuth();
  const [planillas, setPlanillas] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [filters, setFilters] = useState({ mes: '', anio: '', estado: 'todos', personal: '', cargo: '' });
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewZoom, setPreviewZoom] = useState(80);
  const [staffToAdd, setStaffToAdd] = useState('');
  const [formTab, setFormTab] = useState('personal');
  const [showStaffPicker, setShowStaffPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const printRef = useRef(null);

  const load = async () => { setLoading(true); try { const [plans, staff] = await Promise.all([getPlanillasPersonal(), getPersonal()]); setPlanillas(plans); setPersonal(staff); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => planillas.filter((plan) => {
    if (filters.mes && Number(plan.mes) !== Number(filters.mes)) return false;
    if (filters.anio && Number(plan.anio) !== Number(filters.anio)) return false;
    if (filters.estado !== 'todos' && plan.estado !== filters.estado) return false;
    if (filters.personal && !(plan.detalles || []).some((item) => String(item.personal_id) === String(filters.personal))) return false;
    if (filters.cargo && !(plan.detalles || []).some((item) => item.cargo === filters.cargo)) return false;
    if (filters.estado !== 'anulada' && plan.estado === 'anulada') return false;
    return true;
  }), [planillas, filters]);
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activePlans = filtered.filter((item) => item.estado !== 'anulada');
  const stats = { plans: activePlans.length, staff: new Set(activePlans.flatMap((item) => (item.detalles || []).map((d) => d.personal_id))).size, total: activePlans.flatMap((item) => item.detalles || []).reduce((sum, item) => sum + amount(item), 0), closed: activePlans.filter((item) => item.estado === 'cerrada').length, drafts: activePlans.filter((item) => item.estado === 'borrador').length, annulled: filtered.filter((item) => item.estado === 'anulada').length };
  const formTotals = { fixed: form.detalles.filter((item) => item.tipo_pago !== 'por_servicio').reduce((sum, item) => sum + Number(item.sueldo_base || 0), 0), services: form.detalles.filter((item) => item.tipo_pago === 'por_servicio').reduce((sum, item) => sum + Number(item.monto_servicio || 0), 0) };
  formTotals.total = formTotals.fixed + formTotals.services;
  const available = personal.filter((item) => item.estado === 'activo' && !form.detalles.some((detail) => String(detail.personal_id) === String(item.id)));
  const cargos = [...new Set(personal.map((item) => item.cargo).filter(Boolean))].sort();

  const openNew = () => { setEditingId(null); setForm(initialForm); setStaffToAdd(''); setFormTab('personal'); setShowForm(true); };
  const openEdit = (plan) => { setEditingId(plan.id); setForm({ mes: plan.mes, anio: plan.anio, fecha_planilla: plan.fecha_planilla || String(plan.created_at).slice(0, 10), observaciones: plan.observaciones || '', estado: plan.estado, detalles: (plan.detalles || []).map((item) => ({ ...item })) }); setFormTab('personal'); setShowForm(true); };
  const addStaff = (personalId = staffToAdd) => { const persona = personal.find((item) => String(item.id) === String(personalId)); if (!persona || form.detalles.some((item) => String(item.personal_id) === String(persona.id))) return; setForm((current) => ({ ...current, detalles: [...current.detalles, snapshot(persona)] })); setStaffToAdd(''); };
  const updateRow = (index, key, value) => setForm((current) => ({ ...current, detalles: current.detalles.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  const removeRow = (index) => setForm((current) => ({ ...current, detalles: current.detalles.filter((_, i) => i !== index) }));

  const validate = () => {
    if (!form.mes || !form.anio || !form.fecha_planilla) return 'Mes, año y fecha son obligatorios.';
    if (!form.detalles.length) return 'Debe agregar al menos una persona.';
    if (new Set(form.detalles.map((item) => String(item.personal_id))).size !== form.detalles.length) return 'No se permite personal duplicado.';
    for (const item of form.detalles) { if (!item.ci || !item.cargo || !item.horario || !item.tipo_pago) return 'CI, cargo, horario y modalidad son obligatorios.'; if (item.tipo_pago !== 'por_servicio' && Number(item.sueldo_base) < 0) return 'No se permiten sueldos negativos.'; if (item.tipo_pago === 'por_servicio' && Number(item.monto_servicio || 0) < 0) return 'El monto por servicio no puede ser negativo.'; }
    return '';
  };

  const save = async (closeAfter = false) => {
    const error = validate(); if (error) { await Swal.fire({ icon: 'warning', title: 'Error de validación', text: error, confirmButtonColor: '#0F766E' }); return; }
    const confirm = await Swal.fire({ title: 'Confirmación de guardado', html: `<p>¿Guardar esta planilla de sueldos?</p><b>${MESES[form.mes]} ${form.anio}</b><br/>Personal: ${form.detalles.length}<br/>Total: ${money(formTotals.total)}`, showCancelButton: true, confirmButtonText: 'Guardar planilla', cancelButtonText: 'Cancelar', confirmButtonColor: '#0F766E' });
    if (!confirm.isConfirmed) return;
    setLoading(true);
    try {
      let saved;
      if (editingId) saved = await updatePlanillaPersonal(editingId, form);
      else {
        saved = await createPlanillaPersonal({ ...form, personal_ids: form.detalles.map((item) => item.personal_id) });
        saved = await updatePlanillaPersonal(saved.id, { ...form, detalles: form.detalles });
      }
      if (closeAfter) saved = await cerrarPlanillaPersonal(saved.id);
      setShowForm(false); await load(); await Swal.fire({ icon: 'success', title: editingId ? 'Planilla actualizada correctamente.' : 'Planilla guardada correctamente.', confirmButtonColor: '#0F766E' });
    } catch (errorSave) { await Swal.fire({ icon: 'error', title: 'No se pudo guardar la planilla.', text: errorSave.message, confirmButtonColor: '#0F766E' }); } finally { setLoading(false); }
  };

  const changeState = async (plan, action) => { const labels = { close: 'cerrar', reopen: 'reabrir', annul: 'anular' }; const result = await Swal.fire({ icon: 'warning', title: `Confirmar ${labels[action]}`, input: action === 'annul' ? 'textarea' : undefined, inputLabel: action === 'annul' ? 'Motivo de anulación' : undefined, showCancelButton: true, confirmButtonText: 'Confirmar', confirmButtonColor: action === 'annul' ? '#DC2626' : '#0F766E' }); if (!result.isConfirmed) return; if (action === 'close') await cerrarPlanillaPersonal(plan.id); if (action === 'reopen') await reabrirPlanillaPersonal(plan.id); if (action === 'annul') await anularPlanillaPersonal(plan.id, result.value); await load(); };

  const deletePlan = async (plan) => { const result = await Swal.fire({ icon: 'warning', title: '¿Eliminar planilla?', text: `${MESES[plan.mes]} ${plan.anio}. Esta acción eliminará únicamente el borrador.`, showCancelButton: true, reverseButtons: true, confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#DC2626' }); if (!result.isConfirmed) return; try { await deletePlanillaPersonal(plan.id); await load(); await Swal.fire({ icon: 'success', title: 'Planilla eliminada correctamente.', confirmButtonColor: '#0F766E' }); } catch (errorDelete) { await Swal.fire({ icon: 'error', title: 'No se pudo eliminar la planilla.', text: errorDelete.message, confirmButtonColor: '#0F766E' }); } };

  const downloadPdf = async (plan) => { const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-10000px;top:0;width:1054px;background:white'; document.body.appendChild(host); const root = createRoot(host); root.render(<PlanillaSueldoDocumento planilla={plan} />); await new Promise((resolve) => setTimeout(resolve, 250)); const canvas = await html2canvas(host.firstElementChild, { scale: 2, backgroundColor: '#fff', useCORS: true }); const pdf = new jsPDF('l', 'mm', [279, 216]); const height = canvas.height * 279 / canvas.width; pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 279, height); pdf.save(`Planilla_Sueldos_${MESES[plan.mes]}_${plan.anio}.pdf`); root.unmount(); host.remove(); };
  const printPlan = (plan) => { setPreview(plan); setTimeout(() => window.print(), 150); };

  return <section className="grid gap-5">
    {loading && <Loader />}
    <header className="rounded-xl border border-brand-100 bg-gradient-to-r from-brand-50 via-white to-cyan-50 p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase text-brand-700">Administración</p><h2 className="mt-1 text-3xl font-black text-slate-900">Planillas de sueldos</h2><p className="mt-1 text-sm text-slate-600">Gestiona las planillas mensuales de sueldo del personal registrado.</p></div><div className="flex gap-2"><Button variant="secondary" disabled={!filtered.length} onClick={async () => { const ok = await Swal.fire({ title: 'Exportar Excel general', html: `Planillas: <b>${filtered.length}</b><br>Personal incluido: <b>${stats.staff}</b><br>Total de sueldos: <b>${money(stats.total)}</b>`, showCancelButton: true, confirmButtonText: 'Exportar Excel', cancelButtonText: 'Cancelar', confirmButtonColor: '#0F766E' }); if (ok.isConfirmed) { await exportPlanillasGeneralExcel(filtered, user?.nombre || user?.usuario); await Swal.fire({ icon: 'success', title: 'Excel generado correctamente.', confirmButtonColor: '#0F766E' }); } }}><FileSpreadsheet size={17}/>Exportar Excel general</Button><Button onClick={openNew}><Plus size={17}/>Nueva planilla</Button></div></div></header>
    <section className="panel grid gap-3 md:grid-cols-3 xl:grid-cols-7"><Input compact label="Mes" value={filters.mes} onChange={(e) => setFilters({ ...filters, mes: e.target.value })} options={[{ value: '', label: 'Todos' }, ...MESES.slice(1).map((label, i) => ({ value: i + 1, label }))]}/><Input compact label="Año" type="number" value={filters.anio} onChange={(e) => setFilters({ ...filters, anio: e.target.value })}/><Input compact label="Estado" value={filters.estado} onChange={(e) => setFilters({ ...filters, estado: e.target.value })} options={['todos','borrador','cerrada','anulada'].map((value) => ({ value, label: value.charAt(0).toUpperCase()+value.slice(1) }))}/><Input compact label="Personal" value={filters.personal} onChange={(e) => setFilters({ ...filters, personal: e.target.value })} options={[{value:'',label:'Todos'},...personal.map((p)=>({value:p.id,label:`${p.apellido_paterno} ${p.nombres}`}))]}/><Input compact label="Cargo" value={filters.cargo} onChange={(e) => setFilters({ ...filters, cargo: e.target.value })} options={[{value:'',label:'Todos'},...cargos.map((c)=>({value:c,label:c}))]}/><Button className="self-end" onClick={load}>Actualizar</Button><Button className="self-end" variant="ghost" onClick={()=>setFilters({mes:'',anio:'',estado:'todos',personal:'',cargo:''})}>Limpiar filtros</Button></section>
    <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">{[[Banknote,'Planillas registradas',stats.plans],[Users,'Personal incluido',stats.staff],[Banknote,'Total de sueldos',money(stats.total)],[LockKeyhole,'Planillas cerradas',stats.closed],[FilePenLine,'Borradores',stats.drafts],[Trash2,'Planillas anuladas',stats.annulled]].map(([Icon,label,value])=><article key={label} className="rounded-lg border border-brand-100 bg-white p-3 shadow-sm"><div className="flex justify-between text-xs font-black uppercase text-slate-500"><span>{label}</span><Icon size={17} className="text-brand-700"/></div><strong className="mt-2 block text-xl text-slate-900">{value}</strong></article>)}</section>
    <section className="panel"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-lg font-black">Listado de planillas</h3><p className="text-sm text-slate-500">Planillas mensuales registradas y conservadas para auditoría.</p></div><span className="badge">{filtered.length} registros</span></div><Table columns={['N.º de planilla','Mes','Personal','Total sueldos','Estado','Fecha creación','Creado por','Acciones']} rows={pageRows.map((plan)=>[
      `PLA-${String(plan.id).padStart(4,'0')}`,`${MESES[plan.mes]} ${plan.anio}`,plan.detalles?.length||0,money((plan.detalles||[]).reduce((s,d)=>s+amount(d),0)),<span className={`rounded-full px-2 py-1 text-xs font-black ${stateTone[plan.estado]}`}>{plan.estado}</span>,formatDate(plan.fecha_planilla||plan.created_at),plan.creado_por?.nombre||'Administrador',<div className="flex gap-1"><ActionButton label="Ver" icon={Eye} tone="view" onClick={()=>setPreview(plan)}/><ActionButton label="Descargar PDF" icon={Download} tone="download" onClick={()=>downloadPdf(plan)}/><ActionButton label="Exportar Excel" icon={FileSpreadsheet} tone="edit" onClick={()=>exportPlanillaExcel(plan,user?.nombre)}/>{isAdmin&&plan.estado==='borrador'&&<ActionButton label="Eliminar planilla" icon={Trash2} tone="delete" onClick={()=>deletePlan(plan)}/>}<div className="group relative"><ActionButton label="Más acciones" icon={MoreHorizontal} tone="print"/><div className="invisible absolute right-0 z-20 w-44 rounded-lg border bg-white p-1 opacity-0 shadow-xl group-hover:visible group-hover:opacity-100">{plan.estado==='borrador'&&<button className="menu-item" onClick={()=>openEdit(plan)}>Editar</button>}<button className="menu-item" onClick={()=>printPlan(plan)}>Imprimir</button>{plan.estado==='borrador'&&<button className="menu-item" onClick={()=>changeState(plan,'close')}>Cerrar planilla</button>}{isAdmin&&plan.estado==='cerrada'&&<button className="menu-item" onClick={()=>changeState(plan,'reopen')}>Reabrir</button>}{plan.estado!=='anulada'&&<button className="menu-item text-red-600" onClick={()=>changeState(plan,'annul')}>Anular</button>}</div></div></div>
    ])} empty="No existen planillas para los filtros seleccionados."/><div className="mt-3 flex items-center justify-between"><select className="rounded border px-2 py-1 text-sm" value={pageSize} onChange={(e)=>{setPageSize(Number(e.target.value));setPage(1)}}>{[5,10,20].map(n=><option key={n}>{n}</option>)}</select><div className="flex items-center gap-2"><Button variant="ghost" disabled={page<=1} onClick={()=>setPage(page-1)}>Anterior</Button><span className="text-sm">{page} / {totalPages}</span><Button variant="ghost" disabled={page>=totalPages} onClick={()=>setPage(page+1)}>Siguiente</Button></div></div></section>

    <Modal open={showForm} title={editingId?'Editar planilla de sueldos':'Nueva planilla de sueldos'} subtitle="Selecciona el personal del mes y revisa el documento antes de guardar." onClose={()=>setShowForm(false)} size="planilla">
      <div className="salary-form-tabs flex min-h-0 flex-1 flex-col" data-tab={formTab}>
        <div className="grid shrink-0 grid-cols-2 gap-2 border-b bg-slate-50 p-2"><button type="button" onClick={()=>setFormTab('personal')} className={`rounded-lg px-4 py-2 text-sm font-black ${formTab==='personal'?'bg-white text-brand-700 shadow-sm ring-1 ring-brand-200':'text-slate-500'}`}><Users size={16} className="mr-2 inline"/>Personal incluido</button><button type="button" onClick={()=>setFormTab('preview')} className={`rounded-lg px-4 py-2 text-sm font-black ${formTab==='preview'?'bg-white text-brand-700 shadow-sm ring-1 ring-brand-200':'text-slate-500'}`}><Eye size={16} className="mr-2 inline"/>Vista de la planilla</button></div>
        {formTab==='personal'&&<div className="flex shrink-0 items-center justify-between border-b border-brand-100 bg-brand-50/60 px-4 py-2"><span className="text-xs font-semibold text-slate-600">El doctor selecciona el personal activo que formará parte de esta planilla.</span><Button disabled={form.estado!=='borrador'} onClick={()=>setShowStaffPicker(true)}><Plus size={15}/>Agregar personal</Button></div>}
      <div className="flex min-h-0 flex-1 flex-col"><div className="grid min-h-0 flex-1 lg:grid-cols-[55%_45%]"><div className="grid content-start gap-3 overflow-y-auto border-r p-4"><div className="grid gap-2 sm:grid-cols-3"><Input compact label="Mes" disabled={form.estado!=='borrador'} value={form.mes} onChange={(e)=>setForm({...form,mes:Number(e.target.value)})} options={MESES.slice(1).map((label,i)=>({value:i+1,label}))}/><Input compact label="Año" disabled={form.estado!=='borrador'} type="number" value={form.anio} onChange={(e)=>setForm({...form,anio:Number(e.target.value)})}/><Input compact label="Fecha" disabled={!isAdmin||form.estado!=='borrador'} type="date" value={form.fecha_planilla} onChange={(e)=>setForm({...form,fecha_planilla:e.target.value})}/></div><Input compact label="Observación" disabled={form.estado!=='borrador'} multiline value={form.observaciones} onChange={(e)=>setForm({...form,observaciones:e.target.value})}/><div className="flex gap-2 rounded-lg border border-brand-100 bg-brand-50 p-2"><select disabled={form.estado!=='borrador'} className="min-w-0 flex-1 rounded-lg border px-3 text-sm" value={staffToAdd} onChange={(e)=>setStaffToAdd(e.target.value)}><option value="">Seleccionar personal activo</option>{available.map((p)=><option key={p.id} value={p.id}>{p.apellido_paterno} {p.apellido_materno} {p.nombres} — {p.cargo}</option>)}</select><Button disabled={!staffToAdd||form.estado!=='borrador'} onClick={addStaff}><Plus size={15}/>Agregar personal</Button></div><div className="max-h-[290px] overflow-auto rounded-lg border"><table className="min-w-[900px] w-full text-xs"><thead className="sticky top-0 bg-slate-100"><tr>{['N.º','Personal','CI','Cargo','Horario','Modalidad','Sueldo / monto','Firma',''].map(h=><th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr></thead><tbody>{form.detalles.map((d,i)=><tr key={d.personal_id} className="border-t"><td className="p-2">{i+1}</td><td className="p-2 font-bold">{d.apellido_paterno} {d.apellido_materno} {d.nombres}</td><td className="p-1"><input disabled={!isAdmin||form.estado!=='borrador'} className="w-24 rounded border p-1" value={d.ci||''} onChange={(e)=>updateRow(i,'ci',e.target.value)}/></td><td className="p-1"><input disabled={!isAdmin||form.estado!=='borrador'} className="w-28 rounded border p-1" value={d.cargo||''} onChange={(e)=>updateRow(i,'cargo',e.target.value)}/></td><td className="p-1"><input disabled={!isAdmin||form.estado!=='borrador'} className="w-28 rounded border p-1" value={d.horario||''} onChange={(e)=>updateRow(i,'horario',e.target.value)}/></td><td className="p-1"><select disabled={!isAdmin||form.estado!=='borrador'} className="rounded border p-1" value={d.tipo_pago} onChange={(e)=>updateRow(i,'tipo_pago',e.target.value)}><option value="mensual">Sueldo fijo</option><option value="por_servicio">Por servicio</option><option value="otro">Otra</option></select></td><td className="p-1"><input disabled={!isAdmin||form.estado!=='borrador'} type="number" min="0" className="w-24 rounded border p-1 text-right" value={d.tipo_pago==='por_servicio'?d.monto_servicio||'':d.sueldo_base||''} onChange={(e)=>updateRow(i,d.tipo_pago==='por_servicio'?'monto_servicio':'sueldo_base',e.target.value)}/></td><td className="p-2 text-center">____________</td><td className="p-1"><ActionButton disabled={form.estado!=='borrador'} label="Quitar" icon={Trash2} tone="delete" onClick={()=>removeRow(i)}/></td></tr>)}</tbody></table></div><div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><span className="summary-pill">Personal: <b>{form.detalles.length}</b></span><span className="summary-pill">Fijos: <b>{money(formTotals.fixed)}</b></span><span className="summary-pill">Servicios: <b>{money(formTotals.services)}</b></span><span className="summary-pill">Total: <b>{money(formTotals.total)}</b></span></div></div><aside className="hidden min-h-0 bg-slate-100 p-3 lg:block"><div className="mb-2 flex justify-between"><b>Vista tipo documento</b><Button className="min-h-8" variant="secondary" onClick={()=>setPreview({...form})}><Maximize2 size={14}/>Ampliar</Button></div><div className="h-[560px] overflow-auto"><div className="origin-top scale-[0.55] w-[181.8%]"><PlanillaSueldoDocumento planilla={form}/></div></div></aside></div><footer className="flex flex-wrap justify-end gap-2 border-t p-3"><Button variant="ghost" onClick={()=>setShowForm(false)}>Cancelar</Button><Button variant="ghost" onClick={()=>setPreview({...form})}><Eye size={16}/>Vista previa</Button><Button variant="ghost" onClick={()=>printPlan(form)}><Printer size={16}/>Imprimir</Button><Button variant="ghost" onClick={()=>downloadPdf(form)}><Download size={16}/>Descargar PDF</Button>{form.estado==='borrador'&&<><Button variant="secondary" onClick={()=>save(true)}><LockKeyhole size={16}/>Guardar y cerrar</Button><Button onClick={()=>save(false)}><Save size={16}/>Guardar planilla</Button></>}</footer></div>
      </div>
    </Modal>
    <Modal open={showStaffPicker} title="Agregar personal a la planilla" subtitle="Selecciona únicamente personal activo registrado en el sistema." onClose={()=>setShowStaffPicker(false)} size="compact"><div className="grid max-h-[60vh] gap-2 overflow-y-auto">{available.map((persona)=><article key={persona.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"><div><b className="text-sm text-slate-900">{persona.apellido_paterno} {persona.apellido_materno} {persona.nombres}</b><p className="text-xs text-slate-500">CI: {persona.ci} · {persona.cargo} · {horario(persona)||'Horario sin registrar'}</p></div><Button onClick={()=>{addStaff(persona.id);setShowStaffPicker(false)}}><Plus size={15}/>Añadir</Button></article>)}{!available.length&&<p className="empty-state">Todo el personal activo ya está incluido.</p>}</div></Modal>
    <Modal open={Boolean(preview)} title="Vista previa de planilla de sueldos" onClose={()=>setPreview(null)} size="xl"><div className="mb-3 flex flex-wrap items-center justify-end gap-2"><Button variant="ghost" onClick={()=>setPreviewZoom(Math.max(50,previewZoom-10))}><ZoomOut size={16}/></Button><span className="min-w-14 text-center text-sm font-black">{previewZoom}%</span><Button variant="ghost" onClick={()=>setPreviewZoom(Math.min(130,previewZoom+10))}><ZoomIn size={16}/></Button><Button variant="secondary" onClick={()=>printRef.current?.requestFullscreen?.()}><Maximize2 size={16}/>Pantalla completa</Button><Button onClick={()=>downloadPdf(preview)}><Download size={16}/>Descargar PDF</Button></div><div className="max-h-[70vh] overflow-auto bg-slate-200 p-4"><div ref={printRef} className="mx-auto origin-top" style={{ width: `${10000/previewZoom}%`, transform: `scale(${previewZoom/100})` }}><PlanillaSueldoDocumento planilla={preview}/></div></div></Modal>
  </section>;
}

export default PlanillaPersonal;
