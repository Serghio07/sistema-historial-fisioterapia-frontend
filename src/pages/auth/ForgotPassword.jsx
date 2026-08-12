import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Mail, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import logo from '../../assets/logos/logo.png';
import { forgotPasswordRequest } from '../../services/authService';

const GENERIC_MESSAGE = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';
const emailIsValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setError('');
    setMessage('');

    if (!normalizedEmail) {
      setError('Ingresa tu correo electrónico.');
      return;
    }
    if (!emailIsValid(normalizedEmail)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    setSending(true);
    try {
      await forgotPasswordRequest(normalizedEmail);
      setMessage(GENERIC_MESSAGE);
    } catch (requestError) {
      if (requestError.status) setMessage(GENERIC_MESSAGE);
      else setError('No se pudo conectar con el sistema. Inténtalo nuevamente.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="auth-page relative min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-28 -top-28 h-96 w-96 rounded-full bg-sky-200/50 blur-3xl" />
        <div className="absolute -bottom-36 -right-24 h-[28rem] w-[28rem] rounded-full bg-cyan-200/40 blur-3xl" />
      </div>
      <section className="auth-card relative mx-auto my-auto w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/95 shadow-[0_24px_70px_rgba(14,116,144,0.16)] backdrop-blur">
          <div className="h-2 bg-gradient-to-r from-teal-400 via-cyan-400 to-brand-200" />
          <div className="p-6 sm:p-8">
            <header className="text-center">
              <img src={logo} alt="Physio Active" className="mx-auto h-20 w-full max-w-64 object-contain" />
              <p className="mt-3 text-sm font-semibold text-sky-700">Sistema de gestión fisioterapéutica</p>
            </header>
            <div className="auth-view mt-7">
              <div className="text-center">
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-sky-700"><Mail size={22} /></span>
                <h1 className="mt-3 text-2xl font-black text-slate-900">Recuperar contraseña</h1>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Ingresa el correo asociado a tu cuenta y te enviaremos las instrucciones.</p>
              </div>

              {message && <div role="status" className="mt-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><CheckCircle2 size={20} className="mt-0.5 shrink-0" /><span>{message}</span></div>}

              <form onSubmit={submit} className="mt-6 grid gap-4" noValidate>
                <label className="grid gap-1.5 text-sm font-bold text-slate-700">
                  <span>Correo electrónico</span>
                  <span className={`flex min-h-12 items-center rounded-xl border bg-white px-3 shadow-sm transition focus-within:ring-4 ${error ? 'border-red-300 focus-within:ring-red-100' : 'border-slate-200 focus-within:border-sky-500 focus-within:ring-sky-100'}`}>
                    <Mail size={18} className="mr-3 shrink-0 text-sky-600" />
                    <input type="email" autoComplete="email" className="w-full border-0 bg-transparent p-0 text-sm text-slate-800 shadow-none placeholder:text-slate-400 focus:ring-0" placeholder="nombre@correo.com" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(error)} />
                  </span>
                  {error && <span role="alert" className="text-xs font-semibold text-red-600">{error}</span>}
                </label>
                <Button type="submit" disabled={sending} className="min-h-12 w-full rounded-xl">
                  <Send size={18} />{sending ? 'Enviando enlace...' : 'Enviar enlace'}
                </Button>
              </form>
              <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-sky-700 transition hover:text-blue-800"><ArrowLeft size={17} />Volver al inicio de sesión</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ForgotPassword;
