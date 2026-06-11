import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logos/logo.png';
import icono from '../../assets/images/icono.png';

function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const [form, setForm] = useState({ usuario: 'admin', password: '123456' });
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await login(form);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="grid min-h-screen grid-cols-1 bg-login lg:grid-cols-[1fr_460px]">
      <section className="relative flex flex-col justify-center overflow-hidden bg-brand-900 p-8 text-white lg:p-20">
        <img src={icono} alt="" className="pointer-events-none absolute -bottom-20 -right-16 h-[420px] w-[420px] rounded-full object-contain opacity-10" />
        <div className="relative mb-7 flex h-28 w-28 items-center justify-center rounded-xl bg-white p-3 shadow-soft">
          <img src={icono} alt="Physio Active" className="h-full w-full object-contain" />
        </div>
        <img src={logo} alt="Physio Active" className="relative max-h-32 w-full max-w-xl rounded-xl bg-white/95 object-contain p-4 shadow-soft" />
        <p className="mt-5 max-w-2xl text-lg leading-8 text-brand-50">Gestion clinica para fisioterapia y kinesiologia.</p>
        <div className="mt-8 flex flex-wrap gap-2">
          {['Pacientes', 'Historias', 'Equipo'].map((item) => (
            <span key={item} className="rounded-lg border border-white/40 bg-white/10 px-4 py-2">
              {item}
            </span>
          ))}
        </div>
      </section>

      <form onSubmit={submit} className="m-5 self-center rounded-lg bg-white/95 p-8 shadow-soft">
        <img src={logo} alt="Physio Active" className="mb-5 h-24 w-full rounded-lg border border-slate-100 object-contain p-2" />
        <p className="text-xs font-bold uppercase text-brand-600">Acceso seguro</p>
        <h2 className="mt-1 text-2xl font-black text-ink">Ingresar al sistema</h2>
        <div className="mt-6 grid gap-4">
          <Input label="Usuario" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          <Button type="submit" disabled={loading}>
            <Shield size={18} />
            {loading ? 'Validando...' : 'Ingresar'}
          </Button>
        </div>
      </form>
    </main>
  );
}

export default Login;
