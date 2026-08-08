import { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { 
  LayoutDashboard, 
  Settings, 
  Database,
  Shield,
  Users,
  Activity,
  Cloud,
  LogOut
} from 'lucide-react';
import HomeView from './views/HomeView';
import ServerSettingsView from './views/ServerSettingsView';
import DatabaseManagerView from './views/DatabaseManagerView';
import LicenseManagerView from './views/LicenseManagerView';
import AccountsView from './views/AccountsView';
import AuditLogsView from './views/AuditLogsView';
import NetworkSyncView from './views/NetworkSyncView';
import sentroLogo from '../assets/sentro.svg';

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

  const mainNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/accounts', label: 'Accounts & Roles', icon: Users },
  ];

  const technicalNavItems = [
    { path: '/settings', label: 'Server Settings', icon: Settings },
    { path: '/database', label: 'Manage Databases', icon: Database },
    { path: '/license', label: 'Manage Licensing', icon: Shield },
    { path: '/audit-logs', label: 'Audit Logs', icon: Activity },
    { path: '/network', label: 'Network & Sync', icon: Cloud },
  ];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="flex-start mb-4" style={{ padding: '0.5rem' }}>
          <img src={sentroLogo} alt="Sentro Logo" style={{ width: 32, height: 32, backgroundColor: '#1e293b', borderRadius: '50%', padding: '2px' }} />
          <div>
            <h3 style={{ fontSize: '1.25rem', lineHeight: 1, letterSpacing: '0.05em' }}>SENTRO</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MISO Control Panel</span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
          <div className="nav-section-title">Core Management</div>
          {mainNavItems.map((item) => {
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

          <div className="nav-divider" />
          <div className="nav-section-title">Technical & System</div>

          {technicalNavItems.map((item) => {
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
              <p style={{ fontSize: '0.75rem' }}>{user?.role || 'System Admin'}</p>
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
          <Route path="/settings" element={<ServerSettingsView />} />
          <Route path="/database" element={<DatabaseManagerView />} />
          <Route path="/license" element={<LicenseManagerView />} />
          <Route path="/accounts" element={<AccountsView />} />
          <Route path="/audit-logs" element={<AuditLogsView />} />
          <Route path="/network" element={<NetworkSyncView />} />
        </Routes>
      </main>
    </div>
  );
}
