import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logos/logo.png';

function Navbar() {
  const { user } = useAuth();

  return (
    <header className="navbar">
      <div className="flex items-center gap-3">
        <img src={logo} alt="Physio Active" className="hidden h-14 w-40 rounded-lg bg-white object-contain p-1.5 shadow-sm sm:block" />
        <div>
          <p className="text-xs font-bold uppercase text-brand-600">Centro de Fisioterapia</p>
          <h1 className="text-xl font-bold text-ink">Sistema de historial clinico</h1>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
        <ShieldCheck size={17} className="text-brand-600" />
        <span>{user?.nombre || user?.usuario}</span>
      </div>
    </header>
  );
}

export default Navbar;
