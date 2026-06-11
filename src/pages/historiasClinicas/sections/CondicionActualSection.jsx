import Input from '../../../components/common/Input';
import BodyMap from './BodyMap';

const lesionTypes = [
  { value: 'T', label: 'Traumatismo' },
  { value: 'E', label: 'Enfermedad' },
  { value: 'I', label: 'Intervencion Quirurgica' },
  { value: 'S', label: 'Sobrecarga' },
  { value: 'PF', label: 'Postura Forzada' },
  { value: 'M', label: 'Molestias' }
];

function CondicionActualSection({ data, onChange }) {
  return (
    <section className="form-section">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="mb-1">Condicion actual</h3>
          <p className="text-sm text-slate-500">Mapa corporal, tipo de lesion y estudios imagenologicos.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-600">
          {lesionTypes.map((item) => (
            <span key={item.value} className="mr-3 inline-block">
              {item.value} = {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <BodyMap value={data.zona_cuerpo} onChange={(value) => onChange('zona_cuerpo', value)} />
        <div className="grid content-start gap-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {lesionTypes.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onChange('tipo_lesion', item.value)}
                className={`rounded-lg border p-3 text-left transition ${
                  data.tipo_lesion === item.value ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-100'
                }`}
              >
                <strong className="block text-lg">{item.value}</strong>
                <span className="text-xs font-semibold">{item.label}</span>
              </button>
            ))}
          </div>
          <Input label="Zona cuerpo" value={data.zona_cuerpo} onChange={(e) => onChange('zona_cuerpo', e.target.value)} />
          <Input label="Estudios imagenologicos" value={data.estudios_imagenologicos} onChange={(e) => onChange('estudios_imagenologicos', e.target.value)} multiline />
          <Input label="Descripcion" value={data.descripcion} onChange={(e) => onChange('descripcion', e.target.value)} multiline />
        </div>
      </div>
    </section>
  );
}

export default CondicionActualSection;
