import Table from '../../components/common/Table';

function Reportes() {
  return (
    <section className="grid gap-5">
      <div className="page-title">
        <div>
          <p>Informes</p>
          <h2>Reportes</h2>
          <span>Resumen preparado para reportes diarios, semanales e informes fisioterapeuticos.</span>
        </div>
      </div>
      <div className="panel">
        <Table columns={['Reporte', 'Estado', 'Accion']} rows={[['Registro diario', 'Pendiente de backend', 'Configurar'], ['Registro semanal', 'Pendiente de backend', 'Configurar']]} />
      </div>
    </section>
  );
}

export default Reportes;
