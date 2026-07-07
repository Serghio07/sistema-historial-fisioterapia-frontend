import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';
import SuccessToast from './components/common/SuccessToast';

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <SuccessToast />
    </AuthProvider>
  );
}

export default App;
