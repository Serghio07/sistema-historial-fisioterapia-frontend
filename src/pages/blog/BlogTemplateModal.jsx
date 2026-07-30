import { useEffect, useState } from 'react';
import { Check, Eye, FileText, Save, X } from 'lucide-react';
import DOMPurify from 'dompurify';
import { BUILT_IN_TEMPLATES, CUSTOM_TEMPLATE_ICON } from './blogTemplates';

export default function BlogTemplateModal({ open, customTemplates, onClose, onUse, onSaveCustom, canSaveCustom, hasContent }) {
  const [selectedId, setSelectedId] = useState('educativo');
  const [showSave, setShowSave] = useState(false);
  const [customName, setCustomName] = useState('');
  const templates = [...BUILT_IN_TEMPLATES, ...customTemplates.map((item) => ({ ...item, icon: CUSTOM_TEMPLATE_ICON, custom: true }))];
  const selected = templates.find((item) => item.id === selectedId) || templates[0];

  useEffect(() => { if (open) { setSelectedId('educativo'); setShowSave(false); setCustomName(''); } }, [open]);
  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open, onClose]);

  if (!open) return null;
  return <div className="blog-template-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="blog-template-modal" role="dialog" aria-modal="true" aria-labelledby="template-title">
      <header><div className="blog-template-heading"><span><FileText size={21} /></span><div><h2 id="template-title">Elige una plantilla</h2><p>Empieza con una estructura profesional y personalízala en el editor.</p></div></div><button type="button" className="blog-modal-close" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></header>
      <div className="blog-template-content">
        <div className="blog-template-grid">{templates.map((template) => {
          const Icon = template.icon;
          return <button type="button" key={template.id} className={`blog-template-card ${selectedId === template.id ? 'selected' : ''}`} onClick={() => setSelectedId(template.id)}>
          {template.previewImage
            ? <span className="blog-template-thumb"><img src={template.previewImage} alt="" /><span>{template.layoutLabel}</span></span>
            : <span className="blog-template-icon"><Icon size={20} /></span>}
          <span className="blog-template-copy"><strong>{template.name}</strong>{template.custom && <em>Personalizada</em>}<small>{template.description}</small><span className="blog-template-structure">{template.structure}</span></span><span className="blog-template-check"><Check size={13} /></span>
          </button>;
        })}</div>
        <aside className="blog-template-preview" aria-live="polite">
          <div className="blog-template-preview-title"><span><Eye size={16} /></span><div><small>VISTA PREVIA</small><strong>{selected.name}</strong></div></div>
          <div className="blog-template-paper">
            {selected.previewImage && <div className={`blog-template-visual-layout layout-${selected.id}`}><img src={selected.previewImage} alt={`Ejemplo visual de ${selected.name}`} /><div><i /><i /><i /><i /></div></div>}
            {selected.content
              ? <div className="blog-template-preview-html" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selected.content.replace(/^<img[^>]+>/, '')) }} />
              : <div className="blog-template-blank-preview"><FileText size={32} /><strong>Documento en blanco</strong><p>Comienza a escribir tu propia estructura directamente en el editor.</p></div>}
          </div>
          <p className="blog-template-preview-note">Este contenido es editable después de aplicar la plantilla.</p>
        </aside>
      </div>
      {showSave && <div className="blog-custom-template-form"><label>Nombre de la plantilla personalizada<input autoFocus maxLength="60" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Ej. Evaluación de dolor lumbar" /></label><button type="button" disabled={!customName.trim()} onClick={() => { onSaveCustom(customName.trim()); setShowSave(false); setCustomName(''); }}><Save size={16} />Guardar estructura</button></div>}
      <footer><div>{canSaveCustom && <button type="button" className="blog-save-template" onClick={() => setShowSave((value) => !value)}><Save size={16} />Guardar como plantilla personalizada</button>}</div><div><button type="button" onClick={onClose}>Cancelar</button><button type="button" className="blog-primary" onClick={() => onUse(selected)}>{hasContent ? 'Reemplazar con plantilla' : 'Usar plantilla'}</button></div></footer>
    </section>
  </div>;
}
