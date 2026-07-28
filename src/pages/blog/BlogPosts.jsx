import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive, Eye, EyeOff, FileEdit, MoreVertical, Plus, RotateCcw, Search, Send, Trash2 } from 'lucide-react';
import { archiveBlogPost, deleteBlogPost, getBlogCategories, getBlogPosts, hideBlogPost, mediaUrl, publishBlogPost, restoreBlogPost } from '../../services/blogService';
import { useAuth } from '../../context/AuthContext';
import './blog.css';

const statusClass = { PUBLICADO: 'published', BORRADOR: 'draft', OCULTO: 'hidden', ARCHIVADO: 'archived' };
const formatDate = (value) => value ? new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium' }).format(new Date(value)) : 'Sin definir';

export default function BlogPosts() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [result, setResult] = useState({ data: [], stats: {}, pagination: {} });
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: '', estado: '', categoriaId: '', fecha: '', page: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(null);

  const load = async () => {
    setLoading(true); setError('');
    try { setResult(await getBlogPosts(filters)); } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filters.page, filters.limit, filters.estado, filters.categoriaId, filters.fecha]);
  useEffect(() => { getBlogCategories().then(setCategories).catch(() => {}); }, []);

  const search = (event) => { event.preventDefault(); setFilters((old) => ({ ...old, page: 1 })); load(); };
  const act = async (label, action) => {
    if (!window.confirm(label)) return;
    try { await action(); setMenu(null); load(); } catch (err) { setError(err.message); }
  };
  const tabs = ['', 'PUBLICADO', 'BORRADOR', 'OCULTO', 'ARCHIVADO'];

  return <div className="blog-admin">
    <header className="blog-page-header"><div><h1>Blog y publicaciones</h1><p>Administra los artículos y contenidos que se muestran en el sitio web de Physio Active.</p></div><Link className="blog-primary" to="/blog/nuevo"><Plus size={18} />Nuevo artículo</Link></header>
    <section className="blog-stats">{[
      ['Total', result.stats.total || 0], ['Publicados', result.stats.PUBLICADO || 0], ['Borradores', result.stats.BORRADOR || 0], ['Ocultos', result.stats.OCULTO || 0], ['Archivados', result.stats.ARCHIVADO || 0]
    ].map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}</section>
    <div className="blog-tabs">{tabs.map((tab) => <button key={tab || 'TODOS'} className={filters.estado === tab ? 'active' : ''} onClick={() => setFilters((old) => ({ ...old, estado: tab, page: 1 }))}>{tab || 'TODOS'}</button>)}</div>
    <form className="blog-filters" onSubmit={search}>
      <label className="blog-search"><Search size={17} /><input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Buscar por título, resumen o slug" /></label>
      <select value={filters.categoriaId} onChange={(e) => setFilters({ ...filters, categoriaId: e.target.value, page: 1 })}><option value="">Todas las categorías</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
      <input type="date" value={filters.fecha} onChange={(e) => setFilters({ ...filters, fecha: e.target.value, page: 1 })} />
      <button type="submit">Buscar</button>
      <button type="button" className="blog-secondary" onClick={() => setFilters({ search: '', estado: '', categoriaId: '', fecha: '', page: 1, limit: 10 })}>Limpiar</button>
      <select value={filters.limit} onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value), page: 1 })}><option>10</option><option>20</option><option>30</option></select>
    </form>
    {error && <div className="blog-error">{error}<button onClick={load}>Reintentar</button></div>}
    <section className="blog-table-wrap">
      {loading ? <div className="blog-loading">Cargando publicaciones…</div> : !result.data.length ? <div className="blog-empty"><FileEdit size={38} /><h3>Aún no existen artículos.</h3><Link to="/blog/nuevo">Crear primer artículo</Link></div> :
      <table className="blog-table"><thead><tr><th>Portada</th><th>Artículo</th><th>Categoría</th><th>Autor</th><th>Estado</th><th>Publicación</th><th>Modificado</th><th /></tr></thead>
      <tbody>{result.data.map((post) => <tr key={post.id}>
        <td>{post.imagenPortada ? <img className="blog-thumb" src={mediaUrl(post.imagenPortada)} alt="" /> : <div className="blog-thumb placeholder" />}</td>
        <td><strong>{post.titulo}</strong><small>/blog/{post.slug}</small><p>{post.resumen || 'Borrador sin resumen'}</p></td>
        <td>{post.categoria?.nombre || 'Sin categoría'}</td><td>{post.autor?.nombre}</td>
        <td><span className={`blog-badge ${statusClass[post.estado]}`}>{post.estado}</span></td>
        <td>{formatDate(post.fechaPublicacion)}</td><td>{formatDate(post.updatedAt)}</td>
        <td className="blog-menu-cell"><button className="blog-icon-btn" onClick={() => setMenu(menu === post.id ? null : post.id)}><MoreVertical size={18} /></button>
          {menu === post.id && <div className="blog-menu">
            <button onClick={() => navigate(`/blog/vista-previa/${post.id}`)}><Eye size={15} />Vista previa</button>
            <button onClick={() => navigate(`/blog/editar/${post.id}`)}><FileEdit size={15} />Editar</button>
            {isAdmin && post.estado !== 'PUBLICADO' && <button onClick={() => act('¿Publicar este artículo? Será visible en el sitio web.', () => publishBlogPost(post.id))}><Send size={15} />Publicar</button>}
            {isAdmin && post.estado === 'PUBLICADO' && <button onClick={() => act('El artículo dejará de mostrarse en el sitio web.', () => hideBlogPost(post.id))}><EyeOff size={15} />Ocultar</button>}
            {isAdmin && post.estado !== 'ARCHIVADO' && <button onClick={() => act('¿Archivar este artículo?', () => archiveBlogPost(post.id))}><Archive size={15} />Archivar</button>}
            {isAdmin && ['OCULTO','ARCHIVADO'].includes(post.estado) && <button onClick={() => act('¿Restaurar como borrador?', () => restoreBlogPost(post.id))}><RotateCcw size={15} />Restaurar</button>}
            {isAdmin && <button className="danger" onClick={() => act('¿Eliminar este artículo? Se conservará mediante eliminación lógica.', () => deleteBlogPost(post.id))}><Trash2 size={15} />Eliminar</button>}
          </div>}
        </td>
      </tr>)}</tbody></table>}
    </section>
    {result.pagination.totalPages > 1 && <div className="blog-pagination"><button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Anterior</button><span>Página {filters.page} de {result.pagination.totalPages}</span><button disabled={filters.page >= result.pagination.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Siguiente</button></div>}
  </div>;
}
