import { useEffect, useMemo, useState } from 'react';
import { Eye, ImagePlus, Images, Pencil, Plus, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { changeGalleryStatus, deleteGalleryItem, galleryImageUrl, listGallery, saveGalleryItem } from '../../services/galeriaService';

const categories = ['Instalaciones', 'Equipamiento', 'Tratamientos', 'Especialistas'];
const empty = { titulo: '', descripcion: '', categoria: 'Instalaciones', orden: 0, estado: 'NO_PUBLICADO', archivo: null, imagen: '' };

export default function Galeria() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const localPreview = useMemo(() => form.archivo ? URL.createObjectURL(form.archivo) : galleryImageUrl(form.imagen), [form.archivo, form.imagen]);

  useEffect(() => () => { if (localPreview?.startsWith('blob:')) URL.revokeObjectURL(localPreview); }, [localPreview]);
  const load = async () => { setLoading(true); setError(''); try { setItems(await listGallery()); } catch (err) { setError(err.message); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const startCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const startEdit = (item) => { setEditing(item); setForm({ titulo: item.titulo, descripcion: item.descripcion || '', categoria: item.categoria, orden: item.orden, estado: item.estado, archivo: null, imagen: item.imagen }); setOpen(true); };
  const submit = async (event) => {
    event.preventDefault();
    if (!form.titulo.trim()) { setError('El título es obligatorio.'); return; }
    if (!editing && !form.archivo) { setError('Selecciona una fotografía.'); return; }
    setSaving(true); setError('');
    try { await saveGalleryItem(editing?.id, form); setOpen(false); await load(); }
    catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  const toggle = async (item) => { await changeGalleryStatus(item.id, item.estado === 'PUBLICADO' ? 'NO_PUBLICADO' : 'PUBLICADO'); await load(); };
  const remove = async (item) => {
    const result = await Swal.fire({ icon: 'warning', title: 'Eliminar imagen', text: '¿Está seguro de eliminar esta imagen de la Galería? Esta acción no se puede deshacer.', showCancelButton: true, confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#dc2626' });
    if (!result.isConfirmed) return;
    await deleteGalleryItem(item.id); await load();
  };

  return <section className="page-stack">
    <header className="hero-panel flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">Contenido web</p><h1 className="mt-1 text-2xl font-black">Galería</h1><p className="text-sm text-slate-500">Administra las fotografías que aparecen en el sitio web de Physio Active.</p></div><Button onClick={startCreate}><Plus size={18} />Nueva imagen</Button></header>
    {error && !open && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
    {loading ? <div className="content-card p-8 text-center text-slate-500">Cargando Galería…</div> : items.length === 0 ? <div className="content-card grid place-items-center gap-3 p-12 text-center"><Images size={42} className="text-brand-600" /><h2 className="text-lg font-black">Aún no hay imágenes</h2><p className="text-sm text-slate-500">Agrega la primera fotografía para publicarla en el sitio web.</p><Button onClick={startCreate}><Plus size={18} />Nueva imagen</Button></div> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <article key={item.id} className="content-card overflow-hidden"><button type="button" className="block h-52 w-full overflow-hidden bg-slate-100" onClick={() => setPreview(item)}><img src={galleryImageUrl(item.imagen)} alt={item.titulo} className="h-full w-full object-cover transition duration-300 hover:scale-105" /></button><div className="grid gap-3 p-4"><div className="flex items-start justify-between gap-3"><div><span className="text-xs font-black uppercase tracking-wide text-brand-700">{item.categoria}</span><h2 className="mt-1 font-black text-slate-900">{item.titulo}</h2></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${item.estado === 'PUBLICADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{item.estado === 'PUBLICADO' ? 'Publicado' : 'No publicado'}</span></div><p className="line-clamp-2 min-h-10 text-sm text-slate-500">{item.descripcion || 'Sin descripción'}</p><div className="flex items-center justify-between text-xs text-slate-400"><span>Orden: {item.orden}</span><span>{item.modificado_por?.nombre || item.creado_por?.nombre || ''}</span></div><div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3"><Button variant="secondary" onClick={() => setPreview(item)}><Eye size={15} />Ver</Button><Button variant="secondary" onClick={() => startEdit(item)}><Pencil size={15} />Editar</Button><Button variant="secondary" onClick={() => toggle(item)}>{item.estado === 'PUBLICADO' ? 'Despublicar' : 'Publicar'}</Button><Button variant="danger" onClick={() => remove(item)}><Trash2 size={15} /></Button></div></div></article>)}</div>}

    <Modal open={open} title={editing ? 'Editar imagen' : 'Nueva imagen'} subtitle="Completa la información que aparecerá en la Galería pública." onClose={() => !saving && setOpen(false)} size="lg">
      <form onSubmit={submit} className="grid gap-5 md:grid-cols-2"><div className="grid content-start gap-4"><label className="grid gap-2 text-sm font-bold">Fotografía {!editing && '*'}<span className="relative grid min-h-64 cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50"><input className="absolute inset-0 cursor-pointer opacity-0" type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setForm({ ...form, archivo: e.target.files?.[0] || null })} />{localPreview ? <img src={localPreview} alt="Vista previa" className="h-64 w-full object-cover" /> : <span className="grid place-items-center gap-2 text-slate-500"><ImagePlus size={32} />Seleccionar imagen<small>JPG, PNG o WebP · máximo 5 MB</small></span>}</span></label></div><div className="grid content-start gap-4"><label className="grid gap-1 text-sm font-bold">Título *<input className="input" maxLength="180" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></label><label className="grid gap-1 text-sm font-bold">Descripción<textarea className="input min-h-24" maxLength="2000" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></label><label className="grid gap-1 text-sm font-bold">Categoría<select className="input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-sm font-bold">Orden<input className="input" type="number" min="0" value={form.orden} onChange={(e) => setForm({ ...form, orden: e.target.value })} /></label><label className="grid gap-1 text-sm font-bold">Estado<select className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}><option value="PUBLICADO">Publicado</option><option value="NO_PUBLICADO">No publicado</option></select></label></div>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}<div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar imagen'}</Button></div></div></form>
    </Modal>
    <Modal open={Boolean(preview)} title={preview?.titulo || 'Vista previa'} subtitle={preview?.categoria} onClose={() => setPreview(null)} size="lg" closeOnBackdrop closeOnEscape>{preview && <div className="grid gap-4"><img src={galleryImageUrl(preview.imagen)} alt={preview.titulo} className="max-h-[65vh] w-full rounded-xl object-contain" /><p className="text-sm leading-6 text-slate-600">{preview.descripcion || 'Sin descripción.'}</p></div>}</Modal>
  </section>;
}
