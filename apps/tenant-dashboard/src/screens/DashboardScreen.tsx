import { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { 
  LayoutDashboard, 
  Clock, 
  Users, 
  LogOut,
  Landmark
} from 'lucide-react';
import HomeView from './views/HomeView';
import AttendanceView from './views/AttendanceView';
import StaffView from './views/StaffView';

export default function DashboardScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    authApi.me().then(res => {
      setUser(res.data.result.data.user);
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/attendance', label: 'My Attendance', icon: Clock },
    { path: '/staff', label: 'Staff Directory', icon: Users },
  ];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="flex-start mb-4" style={{ padding: '0.5rem' }}>
          <Landmark size={32} color="var(--primary)" />
          <div>
            <h3 style={{ fontSize: '1.25rem', lineHeight: 1 }}>LGU Node</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tenant Server</span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--panel-border)', paddingTop: '1rem' }}>
          <div className="flex-start mb-4">
            <div style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <p style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>{user?.email || 'Loading...'}</p>
              <p style={{ fontSize: '0.75rem' }}>{user?.role || 'Staff'}</p>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={handleLogout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomeView user={user} />} />
          <Route path="/attendance" element={<AttendanceView />} />
          <Route path="/staff" element={<StaffView />} />
        </Routes>
      </main>
    </div>
  );
}
