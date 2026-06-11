import SesionForm from './SesionForm';

function Sesiones() {
  return (
    <section className="grid gap-5">
      <div className="page-title">
        <div>
          <p>Atencion</p>
          <h2>Sesiones</h2>
          <span>Modulo visual preparado para conectar con el backend de sesiones.</span>
        </div>
      </div>
      <div className="panel">
        <SesionForm />
      </div>
    </section>
  );
}

export default Sesiones;
