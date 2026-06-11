import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

function PagoForm() {
  return (
    <form className="form-grid">
      <Input label="Fecha pago" type="date" />
      <Input label="Metodo" options={[{ value: 'QR', label: 'QR' }, { value: 'Efectivo', label: 'Efectivo' }]} />
      <Input label="Monto" type="number" />
      <Input label="Estado" options={[{ value: 'pagado', label: 'Pagado' }, { value: 'parcial', label: 'Parcial' }, { value: 'debe', label: 'Debe' }]} />
      <Input label="Observacion" multiline className="md:col-span-2" />
      <Button className="md:col-span-2">Guardar pago</Button>
    </form>
  );
}

export default PagoForm;
