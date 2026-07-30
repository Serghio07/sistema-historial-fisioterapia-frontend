import { useEffect, useState } from 'react';
import { Edit3, Plus, Power, Trash2, X } from 'lucide-react';
import { createBlogCategory, deleteBlogCategory, getBlogCategories, toggleBlogCategory, updateBlogCategory } from '../../services/blogService';
import './blog.css';

const blank = { nombre: '', slug: '', descripcion: '', activo: true };
export default function BlogCategories() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const categories = await getBlogCategories();
      setRows(Array.isArray(categories) ? categories : []);
    } catch (err) {
      setRows([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const save = async (event) => {
    event.preventDefault(); setError('');
    try {
      if (editing) await updateBlogCategory(editing, form);
      else await createBlogCategory(form);
      setForm(blank);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };
  const changeStatus = async (category) => {
    setError('');
    try {
      await toggleBlogCategory(category.id, !category.activo);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };
  return <div className="blog-admin"><header className="blog-page-header"><div><h1>Categorías del blog</h1><p>Organiza los artículos que se muestran en el sitio público.</p></div></header>
    {error && <div className="blog-error">{error}</div>}
    <div className="blog-category-layout"><form className="blog-card blog-category-form" onSubmit={save}><h2>{editing ? 'Editar categoría' : 'Nueva categoría'}</h2><label>Nombre *<input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label><label>Slug<input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="Se genera automáticamente" /></label><label>Descripción<textarea rows="4" value={form.descripcion || ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></label><label className="blog-check"><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />Categoría activa</label><div><button className="blog-primary" type="submit"><Plus size={17} />{editing ? 'Guardar cambios' : 'Crear categoría'}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm(blank); }}><X size={17} />Cancelar</button>}</div></form>
      <section className="blog-card blog-category-list"><h2>Categorías disponibles</h2>{loading && <p>Cargando categorías...</p>}{!loading && !rows.length && <p>No existen categorías registradas.</p>}{rows.map((category) => <div key={category.id}><div><strong>{category.nombre}</strong><span>/blog?category={category.slug}</span><p>{category.descripcion || 'Sin descripción'}</p></div><span className={`blog-badge ${category.activo ? 'published' : 'archived'}`}>{category.activo ? 'ACTIVA' : 'INACTIVA'}</span><div className="blog-category-actions"><button type="button" title="Editar" onClick={() => { setEditing(category.id); setForm({ ...blank, ...category }); }}><Edit3 size={16} /></button><button type="button" title={category.activo ? 'Desactivar' : 'Activar'} onClick={() => changeStatus(category)}><Power size={16} /></button><button type="button" title="Eliminar" onClick={async () => { if (window.confirm('¿Eliminar esta categoría?')) { try { await deleteBlogCategory(category.id); await load(); } catch (err) { setError(err.message); } } }}><Trash2 size={16} /></button></div></div>)}</section></div>
  </div>;
}
