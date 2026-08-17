import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Bold, Italic, UnderlineIcon, List, ListOrdered, Heading2, Heading3, Quote, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight, Eraser, ImageIcon, LinkIcon, Minus, Maximize2 } from 'lucide-react';
import { mediaUrl, uploadBlogImage } from '../../services/blogService';

const AdjustableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: '100%', parseHTML: (element) => element.style.width || element.getAttribute('width') || '100%' },
      alignment: {
        default: 'center',
        parseHTML: (element) => element.dataset.alignment || 'center',
        renderHTML: (attributes) => {
          const margin = attributes.alignment === 'left' ? '0 auto 1rem 0' : attributes.alignment === 'right' ? '0 0 1rem auto' : '0 auto 1rem';
          return { 'data-alignment': attributes.alignment, style: `display:block;width:${attributes.width};max-width:100%;height:auto;margin:${margin};border-radius:12px` };
        }
      }
    };
  }
});

export default function RichTextEditor({ value, onChange }) {
  const imageInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      AdjustableImage.configure({ allowBase64: false }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] })
    ],
    content: value || '',
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML())
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value || '', { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;
  const action = (label, Icon, callback, active) => <button type="button" title={label} className={active ? 'rte-active' : ''} onClick={callback}><Icon size={17} /></button>;
  const addLink = () => {
    const url = window.prompt('Dirección del enlace (https://...)');
    if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
  };
  const addImage = () => imageInputRef.current?.click();
  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadingImage(true);
    setImageError('');
    try {
      const response = await uploadBlogImage(file);
      const src = mediaUrl(response.data.url);
      editor.chain().focus().setImage({ src, alt: file.name.replace(/\.[^.]+$/, ''), width: '100%', alignment: 'center' }).run();
    } catch (error) {
      setImageError(error.message || 'No se pudo subir la imagen.');
    } finally {
      setUploadingImage(false);
    }
  };
  const imageSize = (width) => editor.chain().focus().updateAttributes('image', { width }).run();
  const imageAlign = (alignment) => editor.chain().focus().updateAttributes('image', { alignment }).run();

  return <div className="rte">
    <div className="rte-toolbar">
      {action('Título H2', Heading2, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }))}
      {action('Título H3', Heading3, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }))}
      {action('Negrita', Bold, () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
      {action('Cursiva', Italic, () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
      {action('Subrayado', UnderlineIcon, () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'))}
      {action('Viñetas', List, () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'))}
      {action('Numeración', ListOrdered, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'))}
      {action('Cita', Quote, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'))}
      {action('Enlace', LinkIcon, addLink, editor.isActive('link'))}
      <button type="button" title={uploadingImage ? 'Subiendo imagen…' : 'Seleccionar imagen desde archivo'} onClick={addImage} disabled={uploadingImage} aria-label={uploadingImage ? 'Subiendo imagen' : 'Insertar imagen desde archivo'}>
        <ImageIcon size={17} />
      </button>
      {editor.isActive('image') && <span className="rte-image-tools">
        <span>Imagen</span>
        <button type="button" title="Imagen pequeña" onClick={() => imageSize('33%')}>33%</button>
        <button type="button" title="Imagen mediana" onClick={() => imageSize('50%')}>50%</button>
        <button type="button" title="Imagen grande" onClick={() => imageSize('75%')}>75%</button>
        {action('Ancho completo', Maximize2, () => imageSize('100%'))}
        {action('Alinear imagen a la izquierda', AlignLeft, () => imageAlign('left'))}
        {action('Centrar imagen', AlignCenter, () => imageAlign('center'))}
        {action('Alinear imagen a la derecha', AlignRight, () => imageAlign('right'))}
      </span>}
      {action('Separador', Minus, () => editor.chain().focus().setHorizontalRule().run())}
      {action('Alinear izquierda', AlignLeft, () => editor.chain().focus().setTextAlign('left').run())}
      {action('Centrar', AlignCenter, () => editor.chain().focus().setTextAlign('center').run())}
      {action('Limpiar formato', Eraser, () => editor.chain().focus().unsetAllMarks().clearNodes().run())}
      {action('Deshacer', Undo2, () => editor.chain().focus().undo().run())}
      {action('Rehacer', Redo2, () => editor.chain().focus().redo().run())}
    </div>
    <input ref={imageInputRef} className="rte-file-input" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={uploadImage} />
    {imageError && <p className="rte-image-error" role="alert">{imageError}</p>}
    <EditorContent editor={editor} />
  </div>;
}
