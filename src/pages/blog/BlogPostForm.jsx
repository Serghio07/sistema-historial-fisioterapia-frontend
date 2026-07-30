import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, FileStack, ImagePlus, Save, Send, Trash2, Undo2, X } from 'lucide-react';
import Swal from 'sweetalert2';
import DOMPurify from 'dompurify';
import { createBlogPost, getBlogCategories, getBlogPost, mediaUrl, publishBlogPost, updateBlogPost, uploadBlogImage } from '../../services/blogService';
import { useAuth } from '../../context/AuthContext';
import RichTextEditor from '../../components/blog/RichTextEditor';
import BlogTemplateModal from './BlogTemplateModal';
import { CUSTOM_TEMPLATES_KEY } from './blogTemplates';
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
  const [templateOpen, setTemplateOpen] = useState(false);
  const [undoContent, setUndoContent] = useState(null);
  const [customTemplates, setCustomTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CUSTOM_TEMPLATES_KEY) || '[]'); } catch { return []; }
  });

  useEffect(() => {
    getBlogCategories().then((rows) => {
      const activeCategories = rows.filter((item) => item.activo);
      setCategories(activeCategories);
      if (!id && activeCategories.length) setForm((old) => ({ ...old, categoriaId: old.categoriaId || activeCategories[0].id }));
    }).catch((err) => setError(err.message));
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
  const save = async (payload = form) => {
    setSaving(true); setError('');
    try {
      const response = id ? await updateBlogPost(id, payload) : await createBlogPost(payload);
      setDirty(false);
      navigate(`/blog/editar/${response.data.id}`, { replace: true });
      return response.data;
    } catch (err) { setError(err.message); return null; } finally { setSaving(false); }
  };
  const publish = async () => {
    const publishForm = {
      ...form,
      categoriaId: form.categoriaId || categories[0]?.id || '',
      imagenAlt: form.imagenAlt?.trim() || `${form.titulo?.trim() || 'Artículo de salud'} - Physio Active`
    };
    const safeTitle = DOMPurify.sanitize(form.titulo?.trim() || 'Artículo sin título', { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    const confirmation = await Swal.fire({
      icon: 'question',
      title: '¿Listo para publicar?',
      html: `<div class="blog-publish-summary">
        <span class="blog-publish-label">ARTÍCULO</span>
        <strong>${safeTitle}</strong>
        <p>El contenido quedará visible inmediatamente en el sitio web de Physio Active.</p>
        <div><span>Estado actual</span><b>Borrador</b></div>
        <div><span>Nuevo estado</span><b class="published">Publicado</b></div>
      </div>`,
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, publicar ahora',
      cancelButtonText: 'Seguir editando',
      confirmButtonColor: '#0f9488',
      cancelButtonColor: '#e8eff3',
      focusCancel: true,
      customClass: {
        popup: 'blog-publish-popup',
        confirmButton: 'blog-publish-confirm',
        cancelButton: 'blog-publish-cancel'
      }
    });
    if (!confirmation.isConfirmed) return;
    setForm(publishForm);
    const post = await save(publishForm);
    if (!post) return;
    setSaving(true);
    try {
      await publishBlogPost(post.id);
      setDirty(false);
      await Swal.fire({
        icon: 'success',
        title: '¡Artículo publicado!',
        html: `<div class="blog-publish-success"><strong>${DOMPurify.sanitize(post.titulo, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })}</strong><p>Ya está disponible para los visitantes del sitio web de Physio Active.</p></div>`,
        confirmButtonText: 'Ir a publicaciones',
        confirmButtonColor: '#0f9488',
        customClass: { popup: 'blog-publish-popup', confirmButton: 'blog-publish-confirm' }
      });
      navigate('/blog');
    } catch (err) {
      setError(err.message);
      await Swal.fire({ icon: 'error', title: 'No se pudo publicar', text: err.message, confirmButtonText: 'Entendido', confirmButtonColor: '#0f9488', customClass: { popup: 'blog-publish-popup' } });
    } finally { setSaving(false); }
  };
  const preview = async () => {
    const post = await save();
    if (post) navigate(`/blog/vista-previa/${post.id}`);
  };
  const cancel = () => { if (!dirty || window.confirm('Tienes cambios sin guardar. ¿Deseas salir?')) navigate('/blog'); };
  const hasEditorContent = Boolean(form.contenido?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim());
  const useTemplate = (template) => {
    if (hasEditorContent && !window.confirm('El contenido actual puede reemplazarse. Podrás deshacer esta acción después. ¿Deseas continuar?')) return;
    setUndoContent(form.contenido || '');
    set('contenido', template.content);
    setTemplateOpen(false);
  };
  const undoTemplate = () => {
    if (undoContent === null) return;
    const current = form.contenido;
    set('contenido', undoContent);
    setUndoContent(current);
  };
  const saveCustomTemplate = (name) => {
    const structure = form.contenido?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 95) || 'Estructura personalizada lista para editar';
    const next = [...customTemplates, { id: `custom-${Date.now()}`, name, description: 'Plantilla creada por el administrador.', structure, content: form.contenido || '', custom: true }];
    setCustomTemplates(next);
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(next));
  };

  return <div className="blog-admin">
    <header className="blog-form-header"><button className="blog-back" onClick={cancel}><ArrowLeft size={18} /></button><div><h1>{id ? 'Editar artículo' : 'Nuevo artículo'}</h1><p>Crea contenido profesional para el sitio web.</p></div><div className="blog-form-actions"><button className="blog-template-trigger" onClick={() => setTemplateOpen(true)}><FileStack size={17} />Elegir plantilla</button><button onClick={cancel}>Cancelar</button><button onClick={() => save()} disabled={saving}><Save size={17} />{saving ? 'Guardando…' : 'Guardar borrador'}</button><button onClick={preview} disabled={saving || !form.titulo.trim()}><Eye size={17} />Vista previa</button><button className="blog-primary" onClick={publish} disabled={saving}><Send size={17} />Publicar</button></div></header>
    {error && <div className="blog-error">{error}</div>}
    {undoContent !== null && <div className="blog-template-undo" role="status"><span>La plantilla se aplicó al editor. El artículo continúa como borrador.</span><button type="button" onClick={undoTemplate}><Undo2 size={16} />Deshacer</button><button type="button" aria-label="Cerrar aviso" onClick={() => setUndoContent(null)}><X size={16} /></button></div>}
    <div className="blog-form-grid">
      <main className="blog-form-main">
        <section className="blog-card"><label>Título del artículo *<input maxLength="180" value={form.titulo} onChange={(e) => onTitle(e.target.value)} placeholder="Escribe un título claro y atractivo" /><small>{form.titulo.length}/180</small></label>
          <label>Slug *<div className="blog-slug"><span>/blog/</span><input value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} /></div></label>
          <label>Resumen corto<textarea minLength="40" maxLength="300" rows="4" value={form.resumen || ''} onChange={(e) => set('resumen', e.target.value)} placeholder="Resumen que aparecerá en las tarjetas públicas" /><small>{(form.resumen || '').length}/300</small></label>
        </section>
        <section className="blog-card"><div className="blog-card-title"><h2>Contenido completo</h2><span>El tiempo de lectura se calcula automáticamente</span></div><RichTextEditor value={form.contenido} onChange={(html) => set('contenido', html)} /></section>
      </main>
      <aside className="blog-form-side">
        <section className="blog-card"><h2>Publicación</h2><label>Estado<input value={form.estado} disabled /></label><label>Categoría <small>Se selecciona automáticamente</small><select value={form.categoriaId} onChange={(e) => set('categoriaId', e.target.value)}>{categories.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label><label>Autor<input value={user?.nombre || user?.usuario || ''} disabled /></label><label>Fecha de publicación<input type="datetime-local" value={form.fechaPublicacion || ''} onChange={(e) => set('fechaPublicacion', e.target.value)} /></label><label className="blog-check"><input type="checkbox" checked={form.destacado} onChange={(e) => set('destacado', e.target.checked)} />Marcar como destacado</label></section>
        <section className="blog-card"><h2>Imagen de portada *</h2><label className="blog-drop"><input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => upload(e.target.files[0])} />{imageInfo ? <img src={imageInfo} alt="" /> : <><ImagePlus size={28} /><strong>Seleccionar imagen</strong><span>JPG, PNG o WebP · máximo 5 MB</span></>}</label>{imageInfo && <button className="blog-remove-image" onClick={() => set('imagenPortada', '')}><Trash2 size={15} />Quitar imagen</button>}<label>Texto alternativo <small>Se genera automáticamente si lo dejas vacío</small><input value={form.imagenAlt || ''} onChange={(e) => set('imagenAlt', e.target.value)} placeholder={`${form.titulo || 'Título del artículo'} - Physio Active`} /></label></section>
        <section className="blog-card"><h2>SEO</h2><label>Título SEO<input maxLength="180" value={form.seoTitulo || ''} onChange={(e) => set('seoTitulo', e.target.value)} /></label><label>Descripción SEO<textarea rows="3" maxLength="320" value={form.seoDescripcion || ''} onChange={(e) => set('seoDescripcion', e.target.value)} /></label><label>Palabras clave<input value={form.palabrasClave || ''} onChange={(e) => set('palabrasClave', e.target.value)} placeholder="fisioterapia, salud, recuperación" /></label><label>Etiquetas<input value={form.etiquetas.join(', ')} onChange={(e) => set('etiquetas', e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} placeholder="Rodilla, ejercicio, prevención" /></label></section>
      </aside>
    </div>
    <BlogTemplateModal open={templateOpen} customTemplates={customTemplates} onClose={() => setTemplateOpen(false)} onUse={useTemplate} onSaveCustom={saveCustomTemplate} canSaveCustom={isAdmin && hasEditorContent} hasContent={hasEditorContent} />
  </div>;
}
