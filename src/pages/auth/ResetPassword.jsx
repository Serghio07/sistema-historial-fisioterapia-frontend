import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import logo from '../../assets/logos/logo.png';
import { resetPasswordRequest } from '../../services/authService';

const passwordIsStrong = (password) => password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);

function PasswordField({ label, value, visible, error, onChange, onToggle }) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-slate-700">
      <span>{label}</span>
      <span className={`flex min-h-12 items-center rounded-xl border bg-white px-3 shadow-sm transition focus-within:ring-4 ${error ? 'border-red-300 focus-within:ring-red-100' : 'border-slate-200 focus-within:border-sky-500 focus-within:ring-sky-100'}`}>
        <KeyRound size={18} className="mr-3 shrink-0 text-sky-600" />
        <input type={visible ? 'text' : 'password'} autoComplete="new-password" className="w-full border-0 bg-transparent p-0 text-sm text-slate-800 shadow-none placeholder:text-slate-400 focus:ring-0" placeholder="Ingresa tu nueva contraseña" value={value} onChange={onChange} aria-invalid={Boolean(error)} />
        <button type="button" onClick={onToggle} className="ml-2 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-700" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
      </span>
      {error && <span role="alert" className="text-xs font-semibold text-red-600">{error}</span>}
    </label>
  );
}

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token')?.trim() || '';
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [visible, setVisible] = useState({});
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!token) nextErrors.token = 'El enlace de recuperación no es válido o está incompleto.';
    if (!form.password) nextErrors.password = 'Ingresa tu nueva contraseña.';
    else if (!passwordIsStrong(form.password)) nextErrors.password = 'Usa al menos 8 caracteres, con mayúscula, minúscula y número.';
    if (!form.confirmPassword) nextErrors.confirmPassword = 'Confirma tu nueva contraseña.';
    else if (form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Las contraseñas no coinciden.';
    setErrors(nextErrors);
    setRequestError('');
    if (Object.keys(nextErrors).length) return;

    setSending(true);
    try {
      await resetPasswordRequest({ token, newPassword: form.password });
      setSuccess(true);
      window.setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (error) {
      setRequestError(error.message || 'El enlace no es válido o ha expirado. Solicita uno nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="auth-page relative min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden"><div className="absolute -left-28 -top-28 h-96 w-96 rounded-full bg-sky-200/50 blur-3xl" /><div className="absolute -bottom-36 -right-24 h-[28rem] w-[28rem] rounded-full bg-cyan-200/40 blur-3xl" /></div>
      <section className="auth-card relative mx-auto my-auto w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/95 shadow-[0_24px_70px_rgba(14,116,144,0.16)] backdrop-blur">
          <div className="h-2 bg-gradient-to-r from-teal-400 via-cyan-400 to-brand-200" />
          <div className="p-6 sm:p-8">
            <header className="text-center"><img src={logo} alt="Physio Active" className="mx-auto h-20 w-full max-w-64 object-contain" /><p className="mt-3 text-sm font-semibold text-sky-700">Sistema de gestión fisioterapéutica</p></header>
            <div className="auth-view mt-7">
              <div className="text-center"><span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-sky-700"><KeyRound size={22} /></span><h1 className="mt-3 text-2xl font-black text-slate-900">Nueva contraseña</h1><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Crea una contraseña nueva para volver a ingresar al sistema.</p></div>
              {success ? <div role="status" className="mt-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><CheckCircle2 size={20} className="shrink-0" /><span>Contraseña actualizada correctamente. Redirigiendo al inicio de sesión...</span></div> : (
                <form onSubmit={submit} className="mt-6 grid gap-4" noValidate>
                  {(errors.token || requestError) && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{errors.token || requestError}</p>}
                  <PasswordField label="Nueva contraseña" value={form.password} visible={visible.password} error={errors.password} onChange={(event) => setForm({ ...form, password: event.target.value })} onToggle={() => setVisible({ ...visible, password: !visible.password })} />
                  <PasswordField label="Confirmar contraseña" value={form.confirmPassword} visible={visible.confirmPassword} error={errors.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} onToggle={() => setVisible({ ...visible, confirmPassword: !visible.confirmPassword })} />
                  <p className="text-xs font-semibold text-slate-500">Usa 8 caracteres o más, con mayúscula, minúscula y número.</p>
                  <Button type="submit" disabled={sending || !token} className="min-h-12 w-full rounded-xl">{sending ? 'Actualizando contraseña...' : 'Actualizar contraseña'}</Button>
                </form>
              )}
              <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-sky-700 transition hover:text-blue-800"><ArrowLeft size={17} />Volver al inicio de sesión</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ResetPassword;
