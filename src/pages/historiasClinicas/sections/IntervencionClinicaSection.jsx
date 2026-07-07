import Input from '../../../components/common/Input';
import PainScale from './PainScale';

function IntervencionClinicaSection({ data, onChange }) {
  return (
    <section className="form-section">
      <div className="mb-4">
        <h3 className="mb-1">Intervencion clinica</h3>
        <p className="text-sm text-slate-500">Escala de dolor, tono, goniometria y balance muscular.</p>
      </div>
      <PainScale value={data.escala_dolor} onChange={(value) => onChange('escala_dolor', value)} />
      <div className="form-grid">
        <Input label="Escala dolor *" value={data.escala_dolor === '' ? '' : `${data.escala_dolor}/10`} readOnly className="[&_input]:bg-slate-100" />
        <Input label="Tono" value={data.tono} onChange={(e) => onChange('tono', e.target.value.toLocaleUpperCase('es-BO'))} />
        <Input label="Goniometría / Balance articular" value={data.goniometria_balance_articular} onChange={(e) => onChange('goniometria_balance_articular', e.target.value.toLocaleUpperCase('es-BO'))} multiline />
        <Input label="Balance muscular" value={data.balance_muscular} onChange={(e) => onChange('balance_muscular', e.target.value.toLocaleUpperCase('es-BO'))} multiline />
        <Input
          label="Trofismo"
          value={data.trofismo}
          onChange={(e) => onChange('trofismo', e.target.value)}
          options={[
            { value: 'CONSERVADO', label: 'CONSERVADO' },
            { value: 'DISMINUIDO', label: 'DISMINUIDO' },
            { value: 'AUMENTADO', label: 'AUMENTADO' }
          ]}
        />
        {data.trofismo !== 'CONSERVADO' && <Input label="Detalle trofismo" value={data.detalle_trofismo} onChange={(e) => onChange('detalle_trofismo', e.target.value.toLocaleUpperCase('es-BO'))} />}
        <Input label="Observaciones" value={data.observaciones} onChange={(e) => onChange('observaciones', e.target.value.toLocaleUpperCase('es-BO'))} multiline />
      </div>
    </section>
  );
}

export default IntervencionClinicaSection;
