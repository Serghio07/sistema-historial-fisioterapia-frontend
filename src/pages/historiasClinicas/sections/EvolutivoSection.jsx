import { Plus, Trash2 } from 'lucide-react';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';

const emptySession = (numero) => ({
  numero, fecha: new Date().toISOString().slice(0, 10), aplicacion: '',
  dolor_inicial: '', dolor_final: '', observaciones: '', inyectables: ''
});

function EvolutivoSection({ data = [], onChange }) {
  const sessions = Array.isArray(data) ? data : [];
  const update = (index, key, value) => onChange(sessions.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const add = () => onChange([...sessions, emptySession(sessions.length + 1)]);
  const remove = (index) => onChange(sessions.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, numero: itemIndex + 1 })));

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 px-4 py-3">
        <div><strong className="block text-sm text-brand-800">{sessions.length} {sessions.length === 1 ? 'SESIÓN REGISTRADA' : 'SESIONES REGISTRADAS'}</strong><span className="text-xs text-slate-500">Registre la evolución observada en cada atención.</span></div>
        <Button type="button" onClick={add}><Plus size={17} />NUEVA SESIÓN</Button>
      </div>
      <div className="grid gap-3">
        {sessions.map((session, index) => (
          <article key={`${session.numero}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
              <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-black text-white">SESIÓN {index + 1}</span>
              <button type="button" onClick={() => remove(index)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="Quitar sesión"><Trash2 size={17} /></button>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
              <Input label="Número de sesión" value={session.numero || index + 1} readOnly />
              <Input label="Fecha de sesión" type="date" value={session.fecha || ''} onChange={(e) => update(index, 'fecha', e.target.value)} />
              <Input label="Dolor inicial (0-10)" type="number" min="0" max="10" value={session.dolor_inicial ?? ''} onChange={(e) => update(index, 'dolor_inicial', e.target.value)} />
              <Input label="Dolor final (0-10)" type="number" min="0" max="10" value={session.dolor_final ?? ''} onChange={(e) => update(index, 'dolor_final', e.target.value)} />
              <Input className="md:col-span-2" label="Procedimiento realizado" value={session.aplicacion || ''} onChange={(e) => update(index, 'aplicacion', e.target.value.toLocaleUpperCase('es-BO'))} multiline />
              <Input className="md:col-span-2" label="Observaciones" value={session.observaciones || ''} onChange={(e) => update(index, 'observaciones', e.target.value.toLocaleUpperCase('es-BO'))} multiline />
              <details className="md:col-span-2 lg:col-span-4 rounded-lg border border-slate-200 p-3">
                <summary className="cursor-pointer text-xs font-black uppercase text-slate-500">Inyectables (opcional)</summary>
                <Input className="mt-3" value={session.inyectables || ''} onChange={(e) => update(index, 'inyectables', e.target.value.toLocaleUpperCase('es-BO'))} multiline />
              </details>
            </div>
          </article>
        ))}
        {!sessions.length && <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Todavía no hay sesiones evolutivas.</div>}
      </div>
    </section>
  );
}

export default EvolutivoSection;
