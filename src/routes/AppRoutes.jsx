import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Login from '../pages/auth/Login';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
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
import Arqueos from '../pages/planillaPagos/Arqueos';
import ResumenFinanciero from '../pages/planillaPagos/ResumenFinanciero';
import MovimientosCaja from '../pages/movimientosCaja/MovimientosCaja';
import ResumenDiario from '../pages/resumenDiario/ResumenDiarioPorRol';
import ResumenPacientes from '../pages/resumenPacientes/ResumenPacientes';
import BlogPosts from '../pages/blog/BlogPosts';
import BlogPostForm from '../pages/blog/BlogPostForm';
import BlogPreview from '../pages/blog/BlogPreview';
import BlogCategories from '../pages/blog/BlogCategories';
import Notificaciones from '../pages/notificaciones/Notificaciones';
import WhatsappReception from '../pages/whatsappReception/WhatsappReception';
import WhatsappMonitoring from '../pages/whatsappMonitoring/WhatsappMonitoring';
import Integraciones from '../pages/integraciones/Integraciones';
import Galeria from '../pages/galeria/Galeria';
import MiPerfil from '../pages/perfil/MiPerfil';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="mi-perfil" element={<MiPerfil />} />
            <Route element={<PrivateRoute permission="pacientes" />}><Route path="pacientes" element={<Pacientes />} /><Route path="resumen-pacientes" element={<ResumenPacientes />} /><Route path="pacientes/:id" element={<PacienteDetalle />} /></Route>
            <Route element={<PrivateRoute permission="historias" />}><Route path="historias-clinicas" element={<HistoriasClinicas />} /><Route path="historias-clinicas/:id" element={<HistoriaClinicaDetalle />} /></Route>
            <Route element={<PrivateRoute permission="evolutivos" />}><Route path="evolutivos-clinicos" element={<EvolutivosClinicos />} /></Route>
            <Route element={<PrivateRoute permission="sesiones" />}><Route path="sesiones" element={<Sesiones />} /></Route>
            <Route element={<PrivateRoute permission="agenda" />}><Route path="citas" element={<Citas />} /></Route>
            <Route path="notificaciones" element={<Notificaciones />} />
            <Route element={<PrivateRoute permission="recepcionWhatsapp" />}><Route path="whatsapp/recepcion" element={<WhatsappReception />} /></Route>
            <Route element={<PrivateRoute permission="sesionesSemanales" />}><Route path="sesiones-semanales" element={<SesionesSemanales />} /></Route>
            <Route element={<PrivateRoute permission="planillasAtencion" />}><Route path="planillas-atencion" element={<PlanillasAtencion />} /></Route>
            <Route element={<PrivateRoute permission="informes" />}><Route path="informes-medicos" element={<Reportes />} /><Route path="reportes" element={<Reportes />} /></Route>
            <Route element={<PrivateRoute permission="documentosClinicos" />}><Route path="documentos/consentimiento-informado" element={<DocumentosClinicos tipo="consentimiento" />} /><Route path="documentos/signos-vitales" element={<DocumentosClinicos tipo="signos_vitales" />} /><Route path="documentos/administracion-farmacos" element={<DocumentosClinicos tipo="farmacos" />} /></Route>
            <Route element={<PrivateRoute permission="actividadesPropias" />}><Route path="personal/actividades" element={<ActividadesDiarias />} /></Route>
            <Route element={<PrivateRoute permission="resumenDiarioClinico" />}><Route path="control-diario/resumen" element={<ResumenDiario />} /></Route>
            <Route path="control-diario/tareas" element={<Navigate to="/control-diario/resumen" replace />} />
            <Route path="control-diario/incidencias" element={<Navigate to="/control-diario/resumen" replace />} />
          </Route>
        </Route>
        <Route element={<PrivateRoute permission="finanzas" />}>
          <Route element={<Layout />}>
            <Route path="control-financiero" element={<Navigate to="/control-financiero/resumen" replace />} />
            <Route path="control-financiero/resumen" element={<ResumenFinanciero />} />
            <Route path="control-financiero/planilla" element={<PlanillaPagos section="planilla" />} />
            <Route path="control-financiero/movimientos-caja" element={<MovimientosCaja />} />
            <Route path="control-financiero/arqueos" element={<Arqueos />} />
            <Route path="control-financiero/planilla-pagos" element={<PlanillaPagos section="planilla" />} />
            <Route path="control-financiero/deudores" element={<Navigate to="/control-financiero/planilla" replace />} />
            <Route path="control-financiero/recibos" element={<Navigate to="/control-financiero/planilla" replace />} />
            <Route path="control-financiero/comprobantes" element={<Navigate to="/control-financiero/planilla" replace />} />
            {['pagos', 'deudas', 'deudores', 'recibos', 'comprobantes'].map((path) => (
              <Route key={path} path={path} element={<Navigate to="/control-financiero/planilla" replace />} />
            ))}
          </Route>
        </Route>
        <Route element={<PrivateRoute permission="blogAdministracion" />}>
          <Route element={<Layout />}>
            <Route path="blog" element={<BlogPosts />} />
            <Route path="blog/nuevo" element={<BlogPostForm />} />
            <Route path="blog/editar/:id" element={<BlogPostForm />} />
            <Route path="blog/vista-previa/:id" element={<BlogPreview />} />
          </Route>
        </Route>
        <Route element={<PrivateRoute permission="galeria" />}>
          <Route element={<Layout />}><Route path="galeria" element={<Galeria />} /></Route>
        </Route>
        <Route element={<PrivateRoute adminOnly />}>
          <Route element={<Layout />}>
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="roles-permisos" element={<RolesPermisos />} />
            <Route path="blog/categorias" element={<BlogCategories />} />
            <Route path="personal/planilla" element={<PlanillaPersonal />} />
            <Route path="whatsapp/monitoring" element={<WhatsappMonitoring />} />
            <Route path="integraciones" element={<Integraciones />} />
            {['sueldos', 'roles', 'auditoria'].map((path) => (
              <Route key={path} path={path} element={<Navigate to="/" replace />} />
            ))}
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
