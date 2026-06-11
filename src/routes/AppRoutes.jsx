import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import Usuarios from '../pages/usuarios/Usuarios';
import Pacientes from '../pages/pacientes/Pacientes';
import PacienteDetalle from '../pages/pacientes/PacienteDetalle';
import HistoriasClinicas from '../pages/historiasClinicas/HistoriasClinicas';
import HistoriaClinicaDetalle from '../pages/historiasClinicas/HistoriaClinicaDetalle';
import Sesiones from '../pages/sesiones/Sesiones';
import SesionesSemanales from '../pages/sesionesSemanales/SesionesSemanales';
import PlanillasAtencion from '../pages/planillasAtencion/PlanillasAtencion';
import Pagos from '../pages/pagos/Pagos';
import Reportes from '../pages/reportes/Reportes';
import PrivateRoute from './PrivateRoute';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="pacientes" element={<Pacientes />} />
            <Route path="pacientes/:id" element={<PacienteDetalle />} />
            <Route path="historias-clinicas" element={<HistoriasClinicas />} />
            <Route path="historias-clinicas/:id" element={<HistoriaClinicaDetalle />} />
            <Route path="sesiones" element={<Sesiones />} />
            <Route path="sesiones-semanales" element={<SesionesSemanales />} />
            <Route path="planillas-atencion" element={<PlanillasAtencion />} />
            <Route path="pagos" element={<Pagos />} />
            <Route path="informes-medicos" element={<Reportes />} />
            <Route path="reportes" element={<Reportes />} />
          </Route>
        </Route>
        <Route element={<PrivateRoute adminOnly />}>
          <Route element={<Layout />}>
            <Route path="usuarios" element={<Usuarios />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
