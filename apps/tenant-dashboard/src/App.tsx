import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SetupScreen from './screens/SetupScreen';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import { authApi } from './services/api';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsAuthenticated(false);
      return;
    }
    
    // Verify token
    authApi.me()
      .then(() => setIsAuthenticated(true))
      .catch(() => {
        localStorage.removeItem('access_token');
        setIsAuthenticated(false);
      });
  }, []);

  if (isAuthenticated === null) return <div className="app-container"><div className="main-content flex-center">Loading...</div></div>;
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/setup" element={<SetupScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <DashboardScreen />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
