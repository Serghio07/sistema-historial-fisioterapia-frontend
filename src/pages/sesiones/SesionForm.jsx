import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

function SesionForm() {
  return (
    <form className="form-grid">
      <Input label="Fecha" type="date" />
      <Input label="Numero de sesion" type="number" />
      <Input label="Asistencia" options={[{ value: 'pendiente', label: 'Pendiente' }, { value: 'asistio', label: 'Asistio' }, { value: 'falto', label: 'Falto' }]} />
      <Input label="Observacion" multiline />
      <Button className="md:col-span-2">Guardar sesion</Button>
    </form>
  );
}

export default SesionForm;
