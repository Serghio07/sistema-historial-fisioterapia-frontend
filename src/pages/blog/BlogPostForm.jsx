import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, ImagePlus, Save, Send, Trash2 } from 'lucide-react';
import { createBlogPost, getBlogCategories, getBlogPost, mediaUrl, publishBlogPost, updateBlogPost, uploadBlogImage } from '../../services/blogService';
import { useAuth } from '../../context/AuthContext';
import RichTextEditor from '../../components/blog/RichTextEditor';
import './blog.css';

const empty = { titulo: '', slug: '', resumen: '', contenido: '', imagenPortada: '', imagenAlt: '', categoriaId: '', estado: 'BORRADOR', destacado: false, fechaPublicacion: '', seoTitulo: '', seoDescripcion: '', palabrasClave: '', etiquetas: [] };
const slugify = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const toLocalDateTimeInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export default function BlogPostForm() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    getBlogCategories().then((rows) => setCategories(rows.filter((item) => item.activo))).catch((err) => setError(err.message));
    if (id) getBlogPost(id).then((post) => setForm({
      ...empty, ...post,
      categoriaId: post.categoriaId || '',
      fechaPublicacion: toLocalDateTimeInput(post.fechaPublicacion),
      etiquetas: post.etiquetas?.map((tag) => tag.nombre) || []
    })).catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    const warn = (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (field, value) => { setDirty(true); setForm((old) => ({ ...old, [field]: value })); };
  const onTitle = (value) => {
    set('titulo', value);
    if (!slugTouched && (!id || form.estado === 'BORRADOR')) setForm((old) => ({ ...old, titulo: value, slug: slugify(value) }));
  };
  const imageInfo = useMemo(() => form.imagenPortada ? mediaUrl(form.imagenPortada) : '', [form.imagenPortada]);

  const upload = async (file) => {
    if (!file) return;
    setSaving(true); setError('');
    try { const response = await uploadBlogImage(file); set('imagenPortada', response.data.url); } catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  const save = async () => {
    setSaving(true); setError('');
    try {
      const response = id ? await updateBlogPost(id, form) : await createBlogPost(form);
      setDirty(false);
      navigate(`/blog/editar/${response.data.id}`, { replace: true });
      return response.data;
    } catch (err) { setError(err.message); return null; } finally { setSaving(false); }
  };
  const publish = async () => {
    if (!window.confirm('¿Publicar este artículo? Una vez publicado será visible en el sitio web de Physio Active.')) return;
    const post = await save();
    if (!post) return;
    setSaving(true);
    try { await publishBlogPost(post.id); setDirty(false); navigate('/blog'); } catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  const preview = async () => {
    const post = await save();
    if (post) navigate(`/blog/vista-previa/${post.id}`);
  };
  const cancel = () => { if (!dirty || window.confirm('Tienes cambios sin guardar. ¿Deseas salir?')) navigate('/blog'); };

  return <div className="blog-admin">
    <header className="blog-form-header"><button className="blog-back" onClick={cancel}><ArrowLeft size={18} /></button><div><h1>{id ? 'Editar artículo' : 'Nuevo artículo'}</h1><p>Crea contenido profesional para el sitio web.</p></div><div className="blog-form-actions"><button onClick={cancel}>Cancelar</button><button onClick={save} disabled={saving}><Save size={17} />{saving ? 'Guardando…' : 'Guardar borrador'}</button><button onClick={preview} disabled={saving || !form.titulo.trim()}><Eye size={17} />Vista previa</button>{isAdmin && <button className="blog-primary" onClick={publish} disabled={saving}><Send size={17} />Publicar</button>}</div></header>
    {error && <div className="blog-error">{error}</div>}
    <div className="blog-form-grid">
      <main className="blog-form-main">
        <section className="blog-card"><label>Título del artículo *<input maxLength="180" value={form.titulo} onChange={(e) => onTitle(e.target.value)} placeholder="Escribe un título claro y atractivo" /><small>{form.titulo.length}/180</small></label>
          <label>Slug *<div className="blog-slug"><span>/blog/</span><input value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} /></div></label>
          <label>Resumen corto<textarea minLength="40" maxLength="300" rows="4" value={form.resumen || ''} onChange={(e) => set('resumen', e.target.value)} placeholder="Resumen que aparecerá en las tarjetas públicas" /><small>{(form.resumen || '').length}/300</small></label>
        </section>
        <section className="blog-card"><div className="blog-card-title"><h2>Contenido completo</h2><span>El tiempo de lectura se calcula automáticamente</span></div><RichTextEditor value={form.contenido} onChange={(html) => set('contenido', html)} /></section>
      </main>
      <aside className="blog-form-side">
        <section className="blog-card"><h2>Publicación</h2><label>Estado<input value={form.estado} disabled /></label><label>Categoría *<select value={form.categoriaId} onChange={(e) => set('categoriaId', e.target.value)}><option value="">Seleccionar</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label><label>Autor<input value={user?.nombre || user?.usuario || ''} disabled /></label><label>Fecha de publicación<input type="datetime-local" value={form.fechaPublicacion || ''} onChange={(e) => set('fechaPublicacion', e.target.value)} /></label><label className="blog-check"><input type="checkbox" checked={form.destacado} onChange={(e) => set('destacado', e.target.checked)} />Marcar como destacado</label></section>
        <section className="blog-card"><h2>Imagen de portada *</h2><label className="blog-drop"><input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => upload(e.target.files[0])} />{imageInfo ? <img src={imageInfo} alt="" /> : <><ImagePlus size={28} /><strong>Seleccionar imagen</strong><span>JPG, PNG o WebP · máximo 5 MB</span></>}</label>{imageInfo && <button className="blog-remove-image" onClick={() => set('imagenPortada', '')}><Trash2 size={15} />Quitar imagen</button>}<label>Texto alternativo *<input value={form.imagenAlt || ''} onChange={(e) => set('imagenAlt', e.target.value)} placeholder="Describe la imagen para accesibilidad" /></label></section>
        <section className="blog-card"><h2>SEO</h2><label>Título SEO<input maxLength="180" value={form.seoTitulo || ''} onChange={(e) => set('seoTitulo', e.target.value)} /></label><label>Descripción SEO<textarea rows="3" maxLength="320" value={form.seoDescripcion || ''} onChange={(e) => set('seoDescripcion', e.target.value)} /></label><label>Palabras clave<input value={form.palabrasClave || ''} onChange={(e) => set('palabrasClave', e.target.value)} placeholder="fisioterapia, salud, recuperación" /></label><label>Etiquetas<input value={form.etiquetas.join(', ')} onChange={(e) => set('etiquetas', e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} placeholder="Rodilla, ejercicio, prevención" /></label></section>
      </aside>
    </div>
  </div>;
}
