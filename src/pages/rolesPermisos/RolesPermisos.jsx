import { useMemo, useState } from 'react';
import { RotateCcw, ShieldCheck, UserRoundCheck } from 'lucide-react';
import Button from '../../components/common/Button';

const modules = [
  'Panel',
  'Pacientes',
  'Historias Clinicas',
  'Citas / Agenda',
  'Registro Diario / Registro de Atencion',
  'Sesiones',
  'Sesiones Semanales',
  'Planillas',
  'Informes Medicos',
  'Usuarios'
];

const actions = ['Ver', 'Crear', 'Editar', 'Eliminar', 'Imprimir', 'Exportar', 'Administrar'];

const initialMatrix = {
  admin: Object.fromEntries(modules.map((module) => [module, Object.fromEntries(actions.map((action) => [action, true]))])),
  personal: {
    Panel: { Ver: true, Crear: false, Editar: false, Eliminar: false, Imprimir: false, Exportar: false, Administrar: false },
    Pacientes: { Ver: true, Crear: true, Editar: true, Eliminar: false, Imprimir: true, Exportar: false, Administrar: false },
    'Historias Clinicas': { Ver: true, Crear: true, Editar: true, Eliminar: false, Imprimir: true, Exportar: true, Administrar: false },
    'Citas / Agenda': { Ver: true, Crear: true, Editar: true, Eliminar: false, Imprimir: true, Exportar: false, Administrar: false },
    'Registro Diario / Registro de Atencion': { Ver: true, Crear: true, Editar: true, Eliminar: false, Imprimir: true, Exportar: false, Administrar: false },
    Sesiones: { Ver: true, Crear: true, Editar: true, Eliminar: false, Imprimir: true, Exportar: false, Administrar: false },
    'Sesiones Semanales': { Ver: true, Crear: true, Editar: true, Eliminar: false, Imprimir: true, Exportar: false, Administrar: false },
    Planillas: { Ver: true, Crear: true, Editar: true, Eliminar: false, Imprimir: true, Exportar: true, Administrar: false },
    'Informes Medicos': { Ver: true, Crear: true, Editar: true, Eliminar: false, Imprimir: true, Exportar: true, Administrar: false },
    Usuarios: { Ver: false, Crear: false, Editar: false, Eliminar: false, Imprimir: false, Exportar: false, Administrar: false }
  }
};

const personalCapabilities = [
  'Registrar pacientes y editar datos basicos.',
  'Completar historias clinicas sin eliminarlas.',
  'Crear, editar y confirmar citas.',
  'Registrar atencion diaria, asistencia, sesiones y metodo de pago.',
  'Completar sesiones semanales.',
  'Llenar, imprimir y exportar planillas.',
  'Generar, imprimir y exportar informes medicos.',
  'No administra usuarios ni elimina informacion critica.'
];

function loadInitialMatrix() {
  try {
    const saved = localStorage.getItem('rolesPermissionMatrix');
    return saved ? JSON.parse(saved) : initialMatrix;
  } catch {
    return initialMatrix;
  }
}

function PermissionCheck({ checked, onChange }) {
  return (
    <label className="grid place-items-center">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function RoleMatrix({ title, role, matrix, onToggle }) {
  const totals = useMemo(() => {
    const values = modules.flatMap((module) => actions.map((action) => matrix[role]?.[module]?.[action]));
    const enabled = values.filter(Boolean).length;
    return { enabled, total: values.length };
  }, [matrix, role]);

  return (
    <div className="panel overflow-hidden">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-ink">{title}</h3>
          <p className="text-sm text-slate-500">{totals.enabled} de {totals.total} permisos activos.</p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase text-brand-700">{role}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-[920px] divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2.5 text-left text-xs font-bold uppercase text-slate-500">Modulo</th>
              {actions.map((action) => (
                <th key={action} className="px-3 py-2.5 text-center text-xs font-bold uppercase text-slate-500">{action}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {modules.map((module) => (
              <tr key={`${role}-${module}`} className="hover:bg-slate-50">
                <td className="sticky left-0 z-10 bg-white px-3 py-2.5 text-sm font-bold text-ink">{module}</td>
                {actions.map((action) => (
                  <td key={`${module}-${action}`} className="px-3 py-2.5">
                    <PermissionCheck checked={Boolean(matrix[role]?.[module]?.[action])} onChange={(value) => onToggle(role, module, action, value)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RolesPermisos() {
  const [matrix, setMatrix] = useState(loadInitialMatrix);

  const updateMatrix = (nextMatrix) => {
    setMatrix(nextMatrix);
    localStorage.setItem('rolesPermissionMatrix', JSON.stringify(nextMatrix));
  };

  const togglePermission = (role, module, action, value) => {
    updateMatrix({
      ...matrix,
      [role]: {
        ...matrix[role],
        [module]: {
          ...matrix[role][module],
          [action]: value
        }
      }
    });
  };

  const resetMatrix = () => {
    updateMatrix(initialMatrix);
  };

  return (
    <section className="grid gap-4">
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="grid gap-3 bg-gradient-to-r from-brand-900 to-brand-600 p-4 text-white md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-black uppercase text-brand-50">Seguridad y accesos</p>
            <h2 className="mt-1 text-2xl font-black md:text-3xl">Matriz de roles y permisos</h2>
            <span className="mt-2 block text-sm text-brand-50">Configura con checks que puede hacer Administrador y Personal.</span>
          </div>
          <ShieldCheck size={42} className="self-center text-brand-50" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
        <span>Esta matriz es configurable en pantalla y se guarda localmente. Para aplicar permisos reales, el backend debe validar estas reglas en cada endpoint.</span>
        <Button variant="ghost" onClick={resetMatrix}>
          <RotateCcw size={17} />
          Restaurar matriz
        </Button>
      </div>

      <RoleMatrix title="Administrador" role="admin" matrix={matrix} onToggle={togglePermission} />
      <RoleMatrix title="Personal" role="personal" matrix={matrix} onToggle={togglePermission} />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="panel">
          <div className="mb-3 flex items-center gap-2">
            <UserRoundCheck size={20} className="text-brand-600" />
            <h3 className="font-black text-ink">Personal puede</h3>
          </div>
          <div className="grid gap-2">
            {personalCapabilities.map((item) => (
              <p key={item} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">{item}</p>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3 className="font-black text-ink">Aplicacion en el sistema</h3>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            <p><strong>Menu dinamico:</strong> los modulos se muestran segun rol; Usuarios y Roles solo para Admin.</p>
            <p><strong>Rutas protegidas:</strong> las rutas administrativas usan proteccion por rol.</p>
            <p><strong>Backend:</strong> eliminar, administrar usuarios y cambiar roles deben validarse en servidor.</p>
            <p><strong>URL directa:</strong> Personal no debe entrar a rutas admin aunque escriba la URL.</p>
            <p><strong>Acciones:</strong> los checks sirven como base para ocultar o habilitar botones de crear, editar, eliminar, imprimir y exportar.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default RolesPermisos;
