import { ArrowLeft, ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';

function Forbidden() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <section className="w-full max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-50 text-red-600">
          <ShieldX size={34} />
        </span>
        <p className="mt-5 text-sm font-black uppercase tracking-wider text-red-600">Error 403</p>
        <h1 className="mt-2 text-2xl font-black text-ink">Acceso restringido</h1>
        <p className="mt-3 text-slate-600">No tienes permisos para acceder a este módulo.</p>
        <Link to="/" className="btn-primary mt-6 inline-flex items-center gap-2">
          <ArrowLeft size={17} />
          Volver al panel principal
        </Link>
      </section>
    </main>
  );
}

export default Forbidden;
