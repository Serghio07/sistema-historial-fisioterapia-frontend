import { Camera, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const OUTPUT_SIZE = 512;

const getInitials = (name = '') =>
  String(name || 'P')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

export function Avatar({ src, name, size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-9 w-9 text-xs rounded-lg',
    md: 'h-14 w-14 text-sm rounded-xl',
    lg: 'h-20 w-20 text-xl rounded-2xl',
    patient: 'h-[72px] w-[72px] text-xl rounded-full'
  };

  return (
    <div className={`${sizes[size]} grid shrink-0 place-items-center overflow-hidden bg-gradient-to-br from-brand-700 to-cyan-500 font-black text-white shadow-sm ${className}`}>
      {src ? <img src={src} alt={`Foto de ${name || 'perfil'}`} className="h-full w-full object-cover" /> : getInitials(name)}
    </div>
  );
}

const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('El archivo seleccionado no es una imagen valida.'));
      image.onload = () => {
        const side = Math.min(image.width, image.height);
        const sourceX = (image.width - side) / 2;
        const sourceY = (image.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        canvas.getContext('2d').drawImage(image, sourceX, sourceY, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
        resolve(canvas.toDataURL('image/webp', 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

function ProfilePhotoInput({ value, onChange, name, label = 'Foto de perfil' }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const selectFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Selecciona una imagen JPG, PNG o WebP.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('La imagen original no puede superar 8 MB.');
      return;
    }

    setProcessing(true);
    try {
      onChange(await compressImage(file));
    } catch (imageError) {
      setError(imageError.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          <Avatar src={value} name={name} size="lg" />
          <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-brand-600 text-white">
            <Camera size={14} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-slate-800">{label}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">Se recorta en formato cuadrado y se comprime automáticamente.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
              onClick={() => inputRef.current?.click()}
              disabled={processing}
            >
              <Upload size={15} />
              {processing ? 'Procesando...' : value ? 'Cambiar foto' : 'Seleccionar foto'}
            </button>
            {value && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                onClick={() => onChange(null)}
              >
                <Trash2 size={15} />
                Quitar
              </button>
            )}
          </div>
          <input ref={inputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectFile} />
          {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
        </div>
      </div>
    </section>
  );
}

export default ProfilePhotoInput;
