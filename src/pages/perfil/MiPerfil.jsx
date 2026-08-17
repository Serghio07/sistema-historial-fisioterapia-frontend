import { ArrowLeft, Save, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ProfilePhotoInput from '../../components/common/ProfilePhoto';
import { useAuth } from '../../context/AuthContext';
import { getMiPerfil, updateMiPerfil } from '../../services/usuarioService';

const TITULOS = ['', 'Doc.', 'Dr.', 'Dra.', 'Lic.', 'Tec. Sup.', 'Sr.', 'Sra.'];
const CARGOS = ['', 'FT.', 'KINE.', 'ENFERMERA', 'ADMINISTRACIÓN', 'RECEPCIÓN', 'AUXILIAR', 'PASANTE'];
const EMPTY_FORM = { nombres: '', apellido_paterno: '', apellido_materno: '', email: '', telefono: '', ci: '', direccion: '', titulo_profesional: '', cargo: '', usuario: '', foto: null };

function toForm(profile) {
  const ficha = profile?.ficha_personal || {};
  return {
    ...EMPTY_FORM,
    nombres: ficha.nombres || '', apellido_paterno: ficha.apellido_paterno || '', apellido_materno: ficha.apellido_materno || '',
    email: profile?.email || '', telefono: ficha.telefono || profile?.telefono || '', ci: ficha.ci || '', direccion: ficha.direccion || '',
    titulo_profesional: ficha.titulo_profesional || '', cargo: ficha.cargo || '', usuario: profile?.usuario || '', foto: profile?.foto || null
  };
}

export default function MiPerfil() {
  const { user, updateCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.rol !== 'personal') return;
    getMiPerfil().then((profile) => setForm(toForm(profile)))
      .catch((requestError) => setError(requestError.response?.data?.message || 'No se pudo cargar el perfil.'))
      .finally(() => setLoading(false));
  }, [user?.rol]);

  if (user?.rol !== 'personal') return <Navigate to="/" replace />;
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setUppercase = (key, value) => set(key, String(value || '').toLocaleUpperCase('es-BO'));
  const cargosDisponibles = form.cargo && !CARGOS.includes(form.cargo) ? [...CARGOS, form.cargo] : CARGOS;
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const response = await updateMiPerfil(form);
      updateCurrentUser(response.usuario);
      setForm(toForm(response.usuario));
      window.dispatchEvent(new CustomEvent('app:success', { detail: { message: response.message } }));
      navigate('/');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo actualizar el perfil.');
    } finally { setSaving(false); }
  };

  return <div className="mx-auto grid max-w-4xl gap-5">
    <div className="flex items-center gap-3">
      <Button variant="secondary" onClick={() => navigate(-1)} aria-label="Volver"><ArrowLeft size={18} /></Button>
      <div><h1 className="text-2xl font-black text-slate-900">Mi perfil</h1><p className="text-sm text-slate-500">Actualiza tus datos personales y profesionales.</p></div>
    </div>
    <form onSubmit={submit} className="panel grid gap-5">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4"><span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-white"><UserRound size={24} /></span><div><h2 className="font-black text-slate-900">Información del personal</h2><p className="text-xs text-slate-500">Los cambios se reflejarán en tu nombre mostrado dentro del sistema.</p></div></div>
      {loading ? <p className="py-8 text-center text-sm text-slate-500">Cargando perfil…</p> : <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><ProfilePhotoInput value={form.foto} name={`${form.nombres} ${form.apellido_paterno}`} label="Foto del personal" onChange={(foto) => set('foto', foto)} /></div>
        <Input label="Nombres" value={form.nombres} onChange={(e) => setUppercase('nombres', e.target.value)} required />
        <Input label="Apellido paterno" value={form.apellido_paterno} onChange={(e) => setUppercase('apellido_paterno', e.target.value)} required />
        <Input label="Apellido materno" value={form.apellido_materno} onChange={(e) => setUppercase('apellido_materno', e.target.value)} />
        <Input label="Cédula de identidad" value={form.ci} onChange={(e) => setUppercase('ci', e.target.value)} required />
        <Input label="Correo electrónico" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
        <Input label="Teléfono" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
        <Input label="Título profesional (opcional)" value={form.titulo_profesional} onChange={(e) => set('titulo_profesional', e.target.value)} options={TITULOS.map((value) => ({ value, label: value || 'Sin título' }))} />
        <Input label="Cargo / Área" value={form.cargo} onChange={(e) => setUppercase('cargo', e.target.value)} options={cargosDisponibles.map((value) => ({ value, label: value || 'Seleccionar cargo / área' }))} required />
        <Input label="Usuario" value={form.usuario} onChange={(e) => set('usuario', e.target.value)} required />
        <Input label="Dirección" value={form.direccion} onChange={(e) => setUppercase('direccion', e.target.value)} multiline className="sm:col-span-2" />
      </div>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="flex justify-end border-t border-slate-200 pt-4"><Button type="submit" disabled={loading || saving}><Save size={17} />{saving ? 'Guardando…' : 'Guardar cambios'}</Button></div>
    </form>
  </div>;
}
