import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, FilePlus2, Trash2, X } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { createAdjuntosHistoria, deleteAdjuntoHistoria, downloadArchivoAdjunto, getAdjuntosHistoria, getArchivoAdjunto } from '../../services/adjuntoHistoriaClinicaService';
import { formatDate } from '../../utils/formatDate';
import { nombrePaciente } from '../../utils/validators';

const TYPES = ['RADIOGRAFIA', 'LABORATORIO', 'RESONANCIA', 'TOMOGRAFIA', 'ECOGRAFIA', 'INFORME_OTRA_CLINICA', 'RECETA_MEDICA', 'CERTIFICADO_MEDICO', 'OTRO'];
const emptyMeta = (file) => ({ file, tipo_adjunto: 'OTRO', titulo: file.name.replace(/\.[^.]+$/, ''), descripcion: '', fecha_documento: '', sesion_id: '' });

export default function AdjuntosHistoriaModal({ historia, sesiones = [], onClose, onCountChange }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const historySessions = useMemo(() => sesiones.filter((item) => !item.anulada && String(item.historia_clinica_id || item.historia_clinica?.id) === String(historia?.id)), [sesiones, historia?.id]);
  const load = async () => {
    if (!historia?.id) return;
    try { const data = await getAdjuntosHistoria(historia.id); setItems(data); onCountChange?.(historia.id, data.length); }
    catch (requestError) { setError(requestError.response?.data?.message || 'No se pudieron cargar los adjuntos.'); }
  };
  useEffect(() => { load(); }, [historia?.id]);
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview?.url]);
  if (!historia) return null;

  const chooseFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 5) { setError('Puedes seleccionar como máximo 5 archivos por carga.'); return; }
    setError(''); setSelected(files.map(emptyMeta)); event.target.value = '';
  };
  const update = (index, key, value) => setSelected((current) => current.map((item, position) => position === index ? { ...item, [key]: value } : item));
  const upload = async () => {
    if (!selected.length) return setError('Selecciona al menos un archivo.');
    if (selected.some((item) => !item.titulo.trim())) return setError('Cada archivo necesita un título.');
    setLoading(true); setError('');
    try { await createAdjuntosHistoria(historia.id, historia.paciente_id || historia.paciente?.id, selected); setSelected([]); await load(); }
    catch (requestError) { setError(requestError.response?.data?.message || 'No se pudieron guardar los adjuntos.'); }
    finally { setLoading(false); }
  };
  const openFile = async (item) => { const blob = await getArchivoAdjunto(item.id); setPreview({ url: URL.createObjectURL(blob), mime: item.mime_type, name: item.nombre_archivo_original }); };
  const download = async (item) => { const blob = await downloadArchivoAdjunto(item.id); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = item.nombre_archivo_original; link.click(); URL.revokeObjectURL(url); };
  const remove = async (item) => { if (!window.confirm(`¿Eliminar lógicamente "${item.titulo}"?`)) return; await deleteAdjuntoHistoria(item.id); await load(); };

  return <Modal open title="Adjuntos de la historia" subtitle={`${nombrePaciente(historia.paciente)} · ${formatDate(historia.fecha_evaluacion)} — ${historia.diagnostico_medico || historia.motivo_consulta || 'Historia clínica'}`} onClose={onClose} size="lg">
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3"><p className="text-sm text-slate-500">{items.length} {items.length === 1 ? 'adjunto registrado' : 'adjuntos registrados'} en esta historia.</p><label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-emerald-700 px-4 text-xs font-black text-white hover:bg-emerald-800"><FilePlus2 size={16} />Adjuntar archivos<input type="file" multiple accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={chooseFiles} /></label></div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}
      {preview && <section className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="mb-2 flex items-center justify-between gap-2"><strong className="break-all text-xs text-slate-700">Vista previa: {preview.name}</strong><button type="button" onClick={() => setPreview(null)} className="rounded-lg border border-slate-200 bg-white p-2"><X size={15} /></button></div>{preview.mime === 'application/pdf' ? <iframe title={preview.name} src={preview.url} className="h-[55vh] w-full rounded-lg border bg-white" /> : <img src={preview.url} alt={preview.name} className="mx-auto max-h-[55vh] max-w-full rounded-lg border bg-white object-contain" />}</section>}
      {selected.length > 0 && <section className="grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50/30 p-4"><h3 className="text-sm font-black text-emerald-800">Archivos seleccionados ({selected.length}/5)</h3>{selected.map((item, index) => <article key={`${item.file.name}-${index}`} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-2"><div className="col-span-full flex justify-between gap-2"><strong className="break-all text-xs">{item.file.name}</strong><button type="button" onClick={() => setSelected((current) => current.filter((_, position) => position !== index))}><X size={16} /></button></div><label className="grid gap-1 text-xs font-bold">Tipo<select className="rounded-lg border-slate-200 text-sm" value={item.tipo_adjunto} onChange={(e) => update(index, 'tipo_adjunto', e.target.value)}>{TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label className="grid gap-1 text-xs font-bold">Título<input className="rounded-lg border-slate-200 text-sm" value={item.titulo} onChange={(e) => update(index, 'titulo', e.target.value)} /></label><label className="grid gap-1 text-xs font-bold">Fecha del documento<input type="date" className="rounded-lg border-slate-200 text-sm" value={item.fecha_documento} onChange={(e) => update(index, 'fecha_documento', e.target.value)} /></label><label className="grid gap-1 text-xs font-bold">Sesión relacionada<select className="rounded-lg border-slate-200 text-sm" value={item.sesion_id} onChange={(e) => update(index, 'sesion_id', e.target.value)}><option value="">Sin sesión específica</option>{historySessions.map((session) => <option key={session.id} value={session.id}>Sesión {session.numero_sesion || ''} — {formatDate(session.fecha)}</option>)}</select></label><label className="col-span-full grid gap-1 text-xs font-bold">Descripción<textarea className="rounded-lg border-slate-200 text-sm" value={item.descripcion} onChange={(e) => update(index, 'descripcion', e.target.value)} /></label></article>)}<div className="flex justify-end"><Button disabled={loading} onClick={upload}>{loading ? 'Guardando…' : `Guardar ${selected.length} archivo(s)`}</Button></div></section>}
      <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-[900px] w-full text-xs"><thead className="bg-slate-50 text-left uppercase text-slate-500"><tr>{['Tipo', 'Título', 'Fecha documento', 'Sesión', 'Archivo', 'Subido por', 'Fecha subida', 'Acciones'].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{items.map((item) => <tr key={item.id}><td className="p-3 font-bold text-emerald-700">{item.tipo_adjunto.replaceAll('_', ' ')}</td><td className="p-3"><strong>{item.titulo}</strong>{item.descripcion && <small className="mt-1 block max-w-56 text-slate-500">{item.descripcion}</small>}</td><td className="p-3">{item.fecha_documento ? formatDate(item.fecha_documento) : 'Sin fecha'}</td><td className="p-3">{item.sesion ? `Sesión ${item.sesion.numero_sesion || ''} · ${formatDate(item.sesion.fecha)}` : 'Sin sesión'}</td><td className="max-w-44 break-all p-3">{item.nombre_archivo_original}</td><td className="p-3">{item.creadoPor?.nombre || item.creadoPor?.usuario || 'Usuario'}</td><td className="p-3">{formatDate(item.created_at)}</td><td className="p-3"><span className="flex gap-1"><button title="Ver" onClick={() => openFile(item)} className="rounded border p-2 text-blue-700"><Eye size={15} /></button><button title="Descargar" onClick={() => download(item)} className="rounded border p-2 text-emerald-700"><Download size={15} /></button><button title="Eliminar" onClick={() => remove(item)} className="rounded border border-red-100 p-2 text-red-600"><Trash2 size={15} /></button></span></td></tr>)}{!items.length && <tr><td colSpan="8" className="p-8 text-center text-slate-500">Esta historia todavía no tiene adjuntos.</td></tr>}</tbody></table></div>
    </div>
  </Modal>;
}
