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
import Citas from '../pages/citas/Citas';
import SesionesSemanales from '../pages/sesionesSemanales/SesionesSemanales';
import PlanillasAtencion from '../pages/planillasAtencion/PlanillasAtencion';
import Reportes from '../pages/reportes/Reportes';
import RolesPermisos from '../pages/rolesPermisos/RolesPermisos';
import PrivateRoute from './PrivateRoute';
import ActividadesDiarias from '../pages/personal/ActividadesDiarias';
import PlanillaPersonal from '../pages/personal/PlanillaPersonal';
import DocumentosClinicos from '../pages/documentos/DocumentosClinicos';
import EvolutivosClinicos from '../pages/evolutivosClinicos/EvolutivosClinicos';
import PlanillaPagos from '../pages/planillaPagos/PlanillaPagos';
import ResumenDiario from '../pages/resumenDiario/ResumenDiario';
import ResumenPacientes from '../pages/resumenPacientes/ResumenPacientes';
import BlogPosts from '../pages/blog/BlogPosts';
import BlogPostForm from '../pages/blog/BlogPostForm';
import BlogPreview from '../pages/blog/BlogPreview';
import BlogCategories from '../pages/blog/BlogCategories';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="pacientes" element={<Pacientes />} />
            <Route path="resumen-pacientes" element={<ResumenPacientes />} />
            <Route path="pacientes/:id" element={<PacienteDetalle />} />
            <Route path="historias-clinicas" element={<HistoriasClinicas />} />
            <Route path="historias-clinicas/:id" element={<HistoriaClinicaDetalle />} />
            <Route path="evolutivos-clinicos" element={<EvolutivosClinicos />} />
            <Route path="sesiones" element={<Sesiones />} />
            <Route path="citas" element={<Citas />} />
            <Route path="sesiones-semanales" element={<SesionesSemanales />} />
            <Route path="planillas-atencion" element={<PlanillasAtencion />} />
            <Route path="informes-medicos" element={<Reportes />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="documentos/consentimiento-informado" element={<DocumentosClinicos tipo="consentimiento" />} />
            <Route path="documentos/signos-vitales" element={<DocumentosClinicos tipo="signos_vitales" />} />
            <Route path="documentos/administracion-farmacos" element={<DocumentosClinicos tipo="farmacos" />} />
            <Route path="personal/actividades" element={<ActividadesDiarias />} />
            <Route path="control-financiero/planilla-pagos" element={<PlanillaPagos />} />
            <Route path="control-financiero/deudores" element={<Navigate to="/control-financiero/planilla-pagos" replace />} />
            <Route path="control-financiero/arqueos" element={<Navigate to="/control-financiero/planilla-pagos" replace />} />
            <Route path="control-financiero/recibos" element={<Navigate to="/control-financiero/planilla-pagos" replace />} />
            <Route path="control-financiero/comprobantes" element={<Navigate to="/control-financiero/planilla-pagos" replace />} />
            <Route path="control-diario/resumen" element={<ResumenDiario />} />
            <Route path="control-diario/tareas" element={<Navigate to="/control-diario/resumen" replace />} />
            <Route path="control-diario/incidencias" element={<Navigate to="/control-diario/resumen" replace />} />
            <Route path="blog" element={<BlogPosts />} />
            <Route path="blog/nuevo" element={<BlogPostForm />} />
            <Route path="blog/editar/:id" element={<BlogPostForm />} />
            <Route path="blog/vista-previa/:id" element={<BlogPreview />} />
          </Route>
        </Route>
        <Route element={<PrivateRoute adminOnly />}>
          <Route element={<Layout />}>
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="roles-permisos" element={<RolesPermisos />} />
            <Route path="personal/planilla" element={<PlanillaPersonal />} />
            <Route path="blog/categorias" element={<BlogCategories />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
