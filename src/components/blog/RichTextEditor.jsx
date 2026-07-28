import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Bold, Italic, UnderlineIcon, List, ListOrdered, Heading2, Heading3, Quote, Undo2, Redo2, AlignLeft, AlignCenter, Eraser, ImageIcon, LinkIcon, Minus } from 'lucide-react';

export default function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ allowBase64: false }),
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
  const addImage = () => {
    const src = window.prompt('Dirección pública de la imagen');
    if (src) editor.chain().focus().setImage({ src, alt: 'Imagen del artículo' }).run();
  };

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
      {action('Insertar imagen', ImageIcon, addImage)}
      {action('Separador', Minus, () => editor.chain().focus().setHorizontalRule().run())}
      {action('Alinear izquierda', AlignLeft, () => editor.chain().focus().setTextAlign('left').run())}
      {action('Centrar', AlignCenter, () => editor.chain().focus().setTextAlign('center').run())}
      {action('Limpiar formato', Eraser, () => editor.chain().focus().unsetAllMarks().clearNodes().run())}
      {action('Deshacer', Undo2, () => editor.chain().focus().undo().run())}
      {action('Rehacer', Redo2, () => editor.chain().focus().redo().run())}
    </div>
    <EditorContent editor={editor} />
  </div>;
}
