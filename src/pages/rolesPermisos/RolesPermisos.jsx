import { useEffect, useState } from 'react';
import { Check, LockKeyhole, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import Loader from '../../components/common/Loader';
import { PERMISSION_ACTIONS, ROLE_PERMISSION_MATRIX } from '../../config/permissions';
import { getRolePermissions, updateRolePermissions } from '../../services/rolePermissionService';

const roles = [{ key: 'admin', label: 'Doctor / Administrador', locked: true }, { key: 'personal', label: 'Personal', locked: false }];

function PermissionCheck({ checked, disabled, onChange, label }) {
  return <label className={`mx-auto grid h-8 w-8 place-items-center rounded-lg border transition ${checked ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-300'} ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-teal-400'}`} title={disabled ? `${label}: protegido` : label}>
    <input type="checkbox" className="sr-only" checked={checked} disabled={disabled} onChange={onChange}/>
    {checked ? <Check size={18} strokeWidth={3}/> : <span className="h-3 w-3 rounded border-2 border-current"/>}
  </label>;
}

function RolesPermisos() {
  const [matrix,setMatrix]=useState(null);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [dirty,setDirty]=useState(false);
  const load=async()=>{setLoading(true);setError('');try{setMatrix(await getRolePermissions());setDirty(false)}catch(err){setError(err.message)}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  const toggle=(module,action)=>setMatrix(current=>{const actions=new Set(current.personal[module]||[]);if(actions.has(action)){actions.delete(action);if(action==='view')actions.clear()}else{actions.add(action);actions.add('view')}setDirty(true);return{...current,personal:{...current.personal,[module]:[...actions]}}});
  const save=async()=>{setSaving(true);setError('');try{const result=await updateRolePermissions('personal',matrix.personal);setMatrix(current=>({...current,personal:result.permissions}));setDirty(false)}catch(err){setError(err.message)}finally{setSaving(false)}};
  if(loading)return <Loader/>;
  return <section className="grid gap-4">
    <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm"><div className="module-hero"><div><p className="text-xs font-black uppercase text-brand-50">Seguridad y accesos</p><h2 className="mt-1 text-2xl font-black md:text-3xl">Roles y permisos del sistema</h2><span className="mt-2 block text-sm text-brand-50">Activa o restringe con checks los módulos y acciones disponibles para el personal.</span></div><ShieldCheck size={42} className="self-center text-brand-50"/></div></div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900"><div className="flex items-start gap-3"><LockKeyhole size={20} className="mt-0.5 shrink-0"/><p>Los permisos del Administrador están protegidos. Los cambios del rol Personal se guardan en el servidor y se aplican al volver a cargar su sesión.</p></div><div className="flex gap-2"><button type="button" onClick={load} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2 font-bold"><RefreshCw size={16}/>Actualizar</button><button type="button" onClick={save} disabled={!dirty||saving} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Save size={16}/>{saving?'Guardando...':'Guardar permisos'}</button></div></div>
    {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 font-bold text-red-700">{error}</p>}
    {roles.map(role=><div key={role.key} className="panel overflow-hidden"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-black text-ink">Matriz: {role.label}</h3><p className="text-sm text-slate-500">{role.locked?'Permisos protegidos del responsable del sistema.':'Marca las acciones que podrá realizar el personal.'}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${role.locked?'bg-brand-50 text-brand-700':'bg-sky-50 text-sky-700'}`}>{role.locked?'Protegido':'Editable'}</span></div><div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="min-w-[1120px] divide-y divide-slate-200"><thead className="bg-slate-50"><tr><th className="sticky left-0 z-10 min-w-56 bg-slate-50 px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Módulo</th>{PERMISSION_ACTIONS.map(action=><th key={action.key} className="min-w-24 px-3 py-3 text-center text-xs font-bold uppercase text-slate-500">{action.label}</th>)}<th className="min-w-80 px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Alcance real</th></tr></thead><tbody className="divide-y divide-slate-100">{ROLE_PERMISSION_MATRIX.map(item=><tr key={`${role.key}-${item.permission}`} className="hover:bg-slate-50"><td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-bold text-ink">{item.module}</td>{PERMISSION_ACTIONS.map(action=><td key={action.key} className="px-3 py-3 text-center"><PermissionCheck label={`${item.module}: ${action.label}`} checked={(matrix?.[role.key]?.[item.permission]||[]).includes(action.key)} disabled={role.locked} onChange={()=>toggle(item.permission,action.key)}/></td>)}<td className="max-w-md px-4 py-3 text-sm text-slate-600">{item.description}</td></tr>)}</tbody></table></div></div>)}
  </section>;
}

export default RolesPermisos;
