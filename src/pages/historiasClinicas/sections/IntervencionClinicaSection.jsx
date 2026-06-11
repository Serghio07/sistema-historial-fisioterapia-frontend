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
        <Input label="Escala dolor" type="number" min="0" max="10" value={data.escala_dolor} onChange={(e) => onChange('escala_dolor', e.target.value)} />
        <Input label="Tono" value={data.tono} onChange={(e) => onChange('tono', e.target.value)} />
        <Input label="Goniometria / Balance articular" value={data.goniometria_balance_articular} onChange={(e) => onChange('goniometria_balance_articular', e.target.value)} multiline />
        <Input label="Balance muscular" value={data.balance_muscular} onChange={(e) => onChange('balance_muscular', e.target.value)} multiline />
        <Input
          label="Trofismo"
          value={data.trofismo}
          onChange={(e) => onChange('trofismo', e.target.value)}
          options={[
            { value: 'Conservado', label: 'Conservado' },
            { value: 'Alterado', label: 'Alterado' }
          ]}
        />
        <Input label="Detalle trofismo" value={data.detalle_trofismo} onChange={(e) => onChange('detalle_trofismo', e.target.value)} />
        <Input label="Observaciones" value={data.observaciones} onChange={(e) => onChange('observaciones', e.target.value)} multiline />
      </div>
    </section>
  );
}

export default IntervencionClinicaSection;
