import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layout Providers
// AuthLayout handles the shell for non-authenticated pages (Login/Signup)
import AuthLayout from './layouts/AuthLayout';
// DashboardLayout handles the shell and navigation sidebar for authenticated pages
import DashboardLayout from './layouts/DashboardLayout';

// Page Components
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import FindCare from './pages/FindCare';
import Journey from './pages/Journey';
import AICheck from './pages/AICheck';
import LandingPage from './pages/LandingPage';

// Theme Context Provider
// Manages light/dark mode state across the application
import { ThemeProvider } from './components/theme-provider';

/**
 * App Component
 * ----------------
 * Root component of the application. Responsible for:
 * 1. Initializing top-level providers (ThemeProvider)
 * 2. Setting up the application routing schema using react-router-dom
 * 3. Grouping standard, unauthenticated, and authenticated routes
 */
function App() {
  return (
    // Provide the theme context down the React tree, defaulting to 'light' mode
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Routes>
          {/* 
            Public Marketing/Landing Route 
            Accessible to anyone without authentication 
          */}
          <Route path="/" element={<LandingPage />} />

          {/* 
            Authentication Routes Wrapper 
            Applies the AuthLayout styling and logic to child routes 
          */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>

          {/* 
            Protected Dashboard Routes Wrapper 
            Applies the generic dashboard sidebar and layout to internal app pages 
          */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/find-care" element={<FindCare />} />
            <Route path="/journey" element={<Journey />} />
            <Route path="/ai-check" element={<AICheck />} />
          </Route>
          
          {/* Catch-all fallback could be added here later (e.g., 404 page) */}
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
