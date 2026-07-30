import { CheckCircle2, LockKeyhole, ShieldCheck, XCircle } from 'lucide-react';
import {
  canPerformAction,
  PERMISSION_ACTIONS,
  ROLE_PERMISSION_MATRIX
} from '../../config/permissions';

const roles = [
  { key: 'admin', label: 'Doctor / Administrador' },
  { key: 'personal', label: 'Personal' }
];

function RolesPermisos() {
  return (
    <section className="grid gap-4">
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="module-hero">
          <div>
            <p className="text-xs font-black uppercase text-brand-50">Seguridad y accesos</p>
            <h2 className="mt-1 text-2xl font-black md:text-3xl">Matriz real de roles y permisos</h2>
            <span className="mt-2 block text-sm text-brand-50">Política de acceso aplicada por las rutas y validada nuevamente por el servidor.</span>
          </div>
          <ShieldCheck size={42} className="self-center text-brand-50" />
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
        <LockKeyhole size={20} className="mt-0.5 shrink-0" />
        <p>
          Esta matriz es informativa y de solo lectura. Los permisos no se guardan en el navegador:
          se aplican de forma central y el backend vuelve a comprobar el rol en cada operación protegida.
        </p>
      </div>

      {roles.map((role) => (
        <div key={role.key} className="panel overflow-hidden">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-ink">Matriz: {role.label}</h3>
              <p className="text-sm text-slate-500">Permisos efectivos por módulo y acción.</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${role.key === 'admin' ? 'bg-brand-50 text-brand-700' : 'bg-sky-50 text-sky-700'}`}>
              Rol técnico: {role.key}
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-[1120px] divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="sticky left-0 z-10 min-w-56 bg-slate-50 px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Módulo</th>
                  {PERMISSION_ACTIONS.map((action) => (
                    <th key={action.key} className="min-w-24 px-3 py-3 text-center text-xs font-bold uppercase text-slate-500">{action.label}</th>
                  ))}
                  <th className="min-w-80 px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Alcance real</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ROLE_PERMISSION_MATRIX.map((item) => (
                  <tr key={`${role.key}-${item.module}`} className="hover:bg-slate-50">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-bold text-ink">{item.module}</td>
                    {PERMISSION_ACTIONS.map((action) => {
                      const allowed = canPerformAction(role.key, item.permission, action.key);
                      return (
                        <td key={action.key} className="px-3 py-3 text-center">
                          <span className={`mx-auto grid h-7 w-7 place-items-center rounded-full ${allowed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`} title={allowed ? 'Permitido' : 'Restringido'}>
                            {allowed
                              ? <CheckCircle2 size={18} aria-label="Permitido" />
                              : <XCircle size={18} aria-label="Restringido" />}
                          </span>
                        </td>
                      );
                    })}
                    <td className="max-w-md px-4 py-3 text-sm text-slate-600">{item.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}

export default RolesPermisos;
