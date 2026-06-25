import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  LogIn,
  Mail,
  Phone,
  Send,
  User,
  UserRoundPlus
} from 'lucide-react';
import Button from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { accessRequest } from '../../services/authService';
import logo from '../../assets/logos/logo.png';

const loginInitial = { usuario: '', password: '' };
const requestInitial = {
  nombre: '',
  usuario: '',
  email: '',
  telefono: '',
  password: '',
  confirmarPassword: ''
};

const passwordIsStrong = (password) =>
  password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);

function Field({ label, error, icon: Icon, action, ...props }) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-slate-700">
      <span>{label}</span>
      <span
        className={`flex min-h-12 items-center rounded-xl border bg-white px-3 shadow-sm transition focus-within:ring-4 ${
          error
            ? 'border-red-300 focus-within:border-red-400 focus-within:ring-red-100'
            : 'border-slate-200 hover:border-sky-300 focus-within:border-sky-500 focus-within:ring-sky-100'
        }`}
      >
        <Icon size={18} className="mr-3 shrink-0 text-sky-600" />
        <input
          className="w-full border-0 bg-transparent p-0 text-sm text-slate-800 shadow-none placeholder:text-slate-400 focus:ring-0"
          {...props}
        />
        {action}
      </span>
      {error && <span className="text-xs font-semibold text-red-600">{error}</span>}
    </label>
  );
}

function PasswordToggle({ visible, onClick }) {
  return (
    <button
      type="button"
      className="ml-2 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-sky-50 hover:text-sky-700"
      onClick={onClick}
      aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
    >
      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}

function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const [view, setView] = useState('login');
  const [form, setForm] = useState(loginInitial);
  const [requestForm, setRequestForm] = useState(requestInitial);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const passwordHint = useMemo(() => {
    if (!requestForm.password) return '';
    return passwordIsStrong(requestForm.password)
      ? 'Contraseña segura.'
      : 'Sugerencia: usa 8 caracteres o más, con mayúscula, minúscula y número.';
  }, [requestForm.password]);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const changeView = (nextView) => {
    setView(nextView);
    setError('');
    setMessage('');
    setFieldErrors({});
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!form.usuario.trim()) errors.usuario = 'Ingresa tu usuario o correo electrónico.';
    if (!form.password) errors.password = 'Ingresa tu contraseña.';
    setFieldErrors(errors);
    setError('');
    setMessage('');
    if (Object.keys(errors).length) return;

    try {
      await login({ usuario: form.usuario.trim(), password: form.password });
    } catch (err) {
      setError(err.message);
    }
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!requestForm.nombre.trim()) errors.nombre = 'El nombre completo es obligatorio.';
    if (!requestForm.usuario.trim()) errors.usuario = 'El usuario es obligatorio.';
    if (!requestForm.email.trim()) errors.email = 'El correo electrónico es obligatorio.';
    if (!requestForm.password) errors.password = 'La contraseña es obligatoria.';
    if (!requestForm.confirmarPassword) errors.confirmarPassword = 'Confirma tu contraseña.';
    else if (requestForm.password !== requestForm.confirmarPassword) {
      errors.confirmarPassword = 'Las contraseñas no coinciden.';
    }

    setFieldErrors(errors);
    setError('');
    setMessage('');
    if (Object.keys(errors).length) return;

    setSending(true);
    try {
      const response = await accessRequest({
        nombre: requestForm.nombre.trim(),
        usuario: requestForm.usuario.trim(),
        email: requestForm.email.trim(),
        telefono: requestForm.telefono.trim() || null,
        password: requestForm.password
      });
      setMessage(response.message);
      setRequestForm(requestInitial);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="auth-page relative min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-28 -top-28 h-96 w-96 rounded-full bg-sky-200/50 blur-3xl" />
        <div className="absolute -bottom-36 -right-24 h-[28rem] w-[28rem] rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-56 w-56 rounded-full bg-blue-100/50 blur-3xl" />
      </div>

      <section className={`auth-card relative mx-auto my-auto w-full ${view === 'login' ? 'max-w-md' : 'max-w-2xl'}`}>
        <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/95 shadow-[0_24px_70px_rgba(14,116,144,0.16)] backdrop-blur">
          <div className="h-2 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400" />
          <div className="p-6 sm:p-8">
            <header className="text-center">
              <img src={logo} alt="Physio Active" className="mx-auto h-20 w-full max-w-64 object-contain" />
              <p className="mt-3 text-sm font-semibold text-sky-700">Sistema de gestión fisioterapéutica</p>
            </header>

            <div key={view} className="auth-view mt-7">
              {view === 'login' ? (
                <>
                  <div className="text-center">
                    <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-sky-700">
                      <LockKeyhole size={22} />
                    </span>
                    <h1 className="mt-3 text-2xl font-black text-slate-900">Inicio de sesión</h1>
                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                      Ingresa tus credenciales para acceder al sistema de gestión clínica.
                    </p>
                  </div>

                  {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
                  {message && <p className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm font-semibold text-sky-800">{message}</p>}

                  <form onSubmit={submitLogin} className="mt-6 grid gap-4" noValidate>
                    <Field
                      label="Usuario o correo electrónico"
                      icon={User}
                      autoComplete="username"
                      placeholder="Ingresa tu usuario o correo"
                      value={form.usuario}
                      error={fieldErrors.usuario}
                      onChange={(event) => setForm({ ...form, usuario: event.target.value })}
                    />
                    <Field
                      label="Contraseña"
                      icon={KeyRound}
                      type={visiblePasswords.login ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Ingresa tu contraseña"
                      value={form.password}
                      error={fieldErrors.password}
                      onChange={(event) => setForm({ ...form, password: event.target.value })}
                      action={
                        <PasswordToggle
                          visible={visiblePasswords.login}
                          onClick={() => setVisiblePasswords({ ...visiblePasswords, login: !visiblePasswords.login })}
                        />
                      }
                    />
                    <button
                      type="button"
                      className="justify-self-end text-sm font-bold text-sky-700 transition hover:text-blue-800 hover:underline"
                      onClick={() => {
                        setError('');
                        setMessage('Para restablecer tu contraseña, comunícate con el doctor administrador.');
                      }}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="min-h-12 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 shadow-lg shadow-sky-900/20 hover:from-blue-700 hover:to-sky-600"
                    >
                      <LogIn size={18} />
                      {loading ? 'Validando acceso...' : 'Iniciar sesión'}
                    </Button>
                  </form>

                  <div className="mt-6 border-t border-slate-100 pt-5 text-center">
                    <p className="text-sm text-slate-500">¿Formas parte del personal y aún no tienes cuenta?</p>
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center gap-2 font-black text-sky-700 transition hover:text-blue-800"
                      onClick={() => changeView('request')}
                    >
                      <UserRoundPlus size={18} />
                      Solicitar acceso
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-sm font-bold text-sky-700 transition hover:text-blue-800"
                    onClick={() => changeView('login')}
                  >
                    <ArrowLeft size={17} />
                    Volver al inicio de sesión
                  </button>

                  <div className="mt-4 text-center">
                    <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
                      <UserRoundPlus size={22} />
                    </span>
                    <h1 className="mt-3 text-2xl font-black text-slate-900">Solicitar acceso</h1>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                      Completa tus datos para solicitar acceso como personal de Physio Active. Tu cuenta será revisada por el administrador.
                    </p>
                  </div>

                  {message && (
                    <div className="mt-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                      <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
                      <span>{message}</span>
                    </div>
                  )}
                  {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

                  <form onSubmit={submitRequest} className="mt-6 grid gap-4 sm:grid-cols-2" noValidate>
                    <Field
                      label="Nombre completo"
                      icon={User}
                      autoComplete="name"
                      placeholder="Nombre y apellidos"
                      value={requestForm.nombre}
                      error={fieldErrors.nombre}
                      onChange={(event) => setRequestForm({ ...requestForm, nombre: event.target.value })}
                    />
                    <Field
                      label="Usuario"
                      icon={User}
                      autoComplete="username"
                      placeholder="Elige un nombre de usuario"
                      value={requestForm.usuario}
                      error={fieldErrors.usuario}
                      onChange={(event) => setRequestForm({ ...requestForm, usuario: event.target.value })}
                    />
                    <Field
                      label="Correo electrónico"
                      icon={Mail}
                      type="email"
                      autoComplete="email"
                      placeholder="nombre@correo.com"
                      value={requestForm.email}
                      error={fieldErrors.email}
                      onChange={(event) => setRequestForm({ ...requestForm, email: event.target.value })}
                    />
                    <Field
                      label="Teléfono (opcional)"
                      icon={Phone}
                      type="tel"
                      autoComplete="tel"
                      placeholder="Número de contacto"
                      value={requestForm.telefono}
                      onChange={(event) => setRequestForm({ ...requestForm, telefono: event.target.value })}
                    />
                    <div>
                      <Field
                        label="Contraseña"
                        icon={KeyRound}
                        type={visiblePasswords.request ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Crea una contraseña segura"
                        value={requestForm.password}
                        error={fieldErrors.password}
                        onChange={(event) => setRequestForm({ ...requestForm, password: event.target.value })}
                        action={
                          <PasswordToggle
                            visible={visiblePasswords.request}
                            onClick={() => setVisiblePasswords({ ...visiblePasswords, request: !visiblePasswords.request })}
                          />
                        }
                      />
                      {passwordHint && (
                        <p className={`mt-1.5 text-xs font-semibold ${passwordIsStrong(requestForm.password) ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {passwordHint}
                        </p>
                      )}
                    </div>
                    <Field
                      label="Confirmar contraseña"
                      icon={KeyRound}
                      type={visiblePasswords.confirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Repite tu contraseña"
                      value={requestForm.confirmarPassword}
                      error={fieldErrors.confirmarPassword}
                      onChange={(event) => setRequestForm({ ...requestForm, confirmarPassword: event.target.value })}
                      action={
                        <PasswordToggle
                          visible={visiblePasswords.confirm}
                          onClick={() => setVisiblePasswords({ ...visiblePasswords, confirm: !visiblePasswords.confirm })}
                        />
                      }
                    />
                    <div className="sm:col-span-2">
                      <Button
                        type="submit"
                        disabled={sending}
                        className="min-h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg shadow-sky-900/20 hover:from-blue-700 hover:to-cyan-600"
                      >
                        <Send size={18} />
                        {sending ? 'Enviando solicitud...' : 'Enviar solicitud'}
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
        <p className="mt-5 text-center text-xs font-semibold text-slate-500">
          Acceso exclusivo para el doctor administrador y personal autorizado.
        </p>
      </section>
    </main>
  );
}

export default Login;
