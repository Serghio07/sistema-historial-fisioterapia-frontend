import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LogIn, Shield, UserPlus } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAuth } from '../../context/AuthContext';
import { registerRequest } from '../../services/authService';
import logo from '../../assets/logos/logo.png';
import icono from '../../assets/images/icono.png';
import fondo from '../../assets/images/fondo.avif';

const loginInitial = { usuario: 'admin', password: '123456' };
const registerInitial = { nombre: '', usuario: '', email: '', password: '', confirmarPassword: '' };

function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('login');
  const [form, setForm] = useState(loginInitial);
  const [registerForm, setRegisterForm] = useState(registerInitial);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/" replace />;

  const submitLogin = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await login(form);
    } catch (err) {
      setError(err.message);
    }
  };

  const submitRegister = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (registerForm.password !== registerForm.confirmarPassword) {
      setError('Las contrasenas no coinciden.');
      return;
    }

    try {
      await registerRequest({
        nombre: registerForm.nombre,
        usuario: registerForm.usuario,
        email: registerForm.email,
        password: registerForm.password
      });
      setMessage('Usuario registrado correctamente. Ahora puedes iniciar sesion.');
      setForm({ usuario: registerForm.usuario, password: '' });
      setRegisterForm(registerInitial);
      setActiveTab('login');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main
      className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 p-4"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(8, 47, 73, 0.76), rgba(15, 23, 42, 0.58)), url(${fondo})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover'
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(20,184,166,0.22),transparent_34%)]" />
      <section className="relative w-full max-w-[460px] rounded-lg border border-white/30 bg-white/90 p-7 shadow-2xl backdrop-blur-md">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-lg border border-white/70 bg-white p-2 shadow-lg">
          <img src={icono} alt="Physio Active" className="h-full w-full object-contain" />
        </div>
        <img src={logo} alt="Physio Active" className="mx-auto mt-4 h-16 w-full max-w-72 object-contain" />

        <div className="mt-7 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-100/90 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setError('');
              setMessage('');
            }}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-black transition ${
              activeTab === 'login' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-brand-700'
            }`}
          >
            <LogIn size={17} />
            Inicio de sesion
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setError('');
              setMessage('');
            }}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-black transition ${
              activeTab === 'register' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-brand-700'
            }`}
          >
            <UserPlus size={17} />
            Registrarse
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs font-black uppercase text-brand-600">Acceso seguro</p>
          <h1 className="mt-1 text-2xl font-black text-ink">{activeTab === 'login' ? 'Ingresar al sistema' : 'Crear cuenta'}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {activeTab === 'login' ? 'Usa tu usuario y contrasena para continuar.' : 'Registra tus datos para solicitar acceso como personal.'}
          </p>
        </div>

        {message && <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p>}
        {error && <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

        {activeTab === 'login' ? (
          <form onSubmit={submitLogin} className="mt-6 grid gap-4">
            <Input label="Usuario" value={form.usuario} onChange={(event) => setForm({ ...form, usuario: event.target.value })} />
            <Input label="Contrasena" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            <Button type="submit" disabled={loading} className="min-h-12 shadow-lg shadow-brand-900/20">
              <Shield size={18} />
              {loading ? 'Validando...' : 'Ingresar'}
            </Button>
          </form>
        ) : (
          <form onSubmit={submitRegister} className="mt-6 grid gap-4">
            <Input label="Nombre completo" value={registerForm.nombre} onChange={(event) => setRegisterForm({ ...registerForm, nombre: event.target.value })} />
            <Input label="Usuario" value={registerForm.usuario} onChange={(event) => setRegisterForm({ ...registerForm, usuario: event.target.value })} />
            <Input label="Email" type="email" value={registerForm.email} onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })} />
            <Input label="Contrasena" type="password" value={registerForm.password} onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })} />
            <Input
              label="Confirmar contrasena"
              type="password"
              value={registerForm.confirmarPassword}
              onChange={(event) => setRegisterForm({ ...registerForm, confirmarPassword: event.target.value })}
            />
            <Button type="submit" className="min-h-12 shadow-lg shadow-brand-900/20">
              <UserPlus size={18} />
              Crear cuenta
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}

export default Login;
