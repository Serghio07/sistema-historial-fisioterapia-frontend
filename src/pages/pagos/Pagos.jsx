import PagoForm from './PagoForm';

function Pagos() {
  return (
    <section className="grid gap-5">
      <header className="module-hero rounded-xl">
        <div>
          <p className="text-sm font-bold text-brand-700">Administración</p>
          <h2 className="mt-1 text-3xl font-black text-brand-900">Pagos</h2>
          <span className="mt-1 block text-sm text-brand-900/70">Módulo preparado para QR, efectivo y control de deudas.</span>
        </div>
      </header>
      <div className="panel">
        <PagoForm />
      </div>
    </section>
  );
}

export default Pagos;
