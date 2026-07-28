import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { ArrowLeft, CalendarDays, Clock } from 'lucide-react';
import { getBlogPost, mediaUrl } from '../../services/blogService';
import './blog.css';

export default function BlogPreview() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { getBlogPost(id).then(setPost).catch((err) => setError(err.message)); }, [id]);
  if (error) return <div className="blog-error">{error}</div>;
  if (!post) return <div className="blog-loading">Cargando vista previa…</div>;
  return <div className="blog-preview">
    <div className="blog-preview-bar"><Link to={`/blog/editar/${id}`}><ArrowLeft size={17} />Volver al editor</Link><span>Vista previa · {post.estado}</span></div>
    <article><header><span>{post.categoria?.nombre || 'Sin categoría'}</span><h1>{post.titulo}</h1><p>{post.resumen}</p><div><CalendarDays size={16} />{post.fechaPublicacion ? new Date(post.fechaPublicacion).toLocaleDateString('es-BO') : 'Sin fecha'}<Clock size={16} />{post.tiempoLectura} min de lectura</div></header>
      {post.imagenPortada && <img className="blog-preview-cover" src={mediaUrl(post.imagenPortada)} alt={post.imagenAlt} />}
      <div className="blog-html" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.contenido || '') }} />
    </article>
  </div>;
}
