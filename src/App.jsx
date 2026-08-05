import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';
import SuccessToast from './components/common/SuccessToast';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
        <SuccessToast />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
