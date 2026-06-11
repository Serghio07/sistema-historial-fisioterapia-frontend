import PagoForm from './PagoForm';

function Pagos() {
  return (
    <section className="grid gap-5">
      <div className="page-title">
        <div>
          <p>Administracion</p>
          <h2>Pagos</h2>
          <span>Modulo visual preparado para QR, efectivo y deudas.</span>
        </div>
      </div>
      <div className="panel">
        <PagoForm />
      </div>
    </section>
  );
}

export default Pagos;
