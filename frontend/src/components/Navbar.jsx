import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import RoleSwitcherModal from './RoleSwitcherModal';
import {
  Compass,
  Briefcase,
  Layers,
  BookOpen,
  PlusCircle,
  FileText,
  BarChart3,
  Bell,
  User,
  LogOut,
  ChevronDown
} from 'lucide-react';

export default function Navbar({ currentPath, navigate }) {
  const { user, activeRole, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  const getDashboardPath = () => {
    if (activeRole === 'expert') return '/dashboard/expert';
    if (activeRole === 'sponsor') return '/dashboard/sponsor';
    return '/dashboard/student';
  };

  const roleBadgeClass =
    activeRole === 'expert' ? 'role-badge-expert' :
    activeRole === 'sponsor' ? 'role-badge-sponsor' : 'role-badge-student';

  return (
    <>
      <div className="demo-ribbon">
        DEMONSTRATION PROTOTYPE &bull; Relational SQLite &bull; SHA-256 Ledger &bull; Server-Side Role Enforcement
      </div>
      <header className="navbar">
        <div className="navbar-inner">
          <div className="nav-brand" onClick={() => navigate(getDashboardPath())}>
            <Compass className="brand-icon" />
            <span>ResearchProof</span>
          </div>

          <nav className="nav-links">
            <span
              className={`nav-link ${currentPath.startsWith('/dashboard') ? 'active' : ''}`}
              onClick={() => navigate(getDashboardPath())}
            >
              Dashboard
            </span>

            <span
              className={`nav-link ${currentPath === '/projects' ? 'active' : ''}`}
              onClick={() => navigate('/projects')}
            >
              Explore Projects
            </span>

            {activeRole === 'expert' && (
              <span
                className={`nav-link ${currentPath === '/projects/new' ? 'active' : ''}`}
                onClick={() => navigate('/projects/new')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <PlusCircle size={15} /> New Project
              </span>
            )}

            {activeRole !== 'sponsor' && (
              <span
                className={`nav-link ${currentPath === '/workspace' ? 'active' : ''}`}
                onClick={() => navigate('/workspace')}
              >
                My Workspace
              </span>
            )}

            {activeRole === 'student' && (
              <span
                className={`nav-link ${currentPath === '/submissions/history' ? 'active' : ''}`}
                onClick={() => navigate('/submissions/history')}
              >
                Submissions
              </span>
            )}

            {activeRole === 'sponsor' && (
              <span
                className={`nav-link ${currentPath === '/sponsor/reports' ? 'active' : ''}`}
                onClick={() => navigate('/sponsor/reports')}
              >
                Sponsor Reports
              </span>
            )}

            <span
              className={`nav-link ${currentPath === '/ledger' ? 'active' : ''}`}
              onClick={() => navigate('/ledger')}
            >
              Ledger
            </span>
          </nav>

          <div className="nav-actions">
            {/* Role Switcher button */}
            <button
              className={`role-badge-btn ${roleBadgeClass}`}
              onClick={() => setRoleModalOpen(true)}
              title="Click to switch your active role"
            >
              <span>{activeRole}</span>
              <ChevronDown size={14} />
            </button>

            {/* Notification bell */}
            <button
              onClick={() => navigate('/notifications')}
              style={{
                position: 'relative',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-full)',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: currentPath === '/notifications' ? 'var(--primary)' : 'var(--text-muted)'
              }}
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  background: 'var(--danger)',
                  color: 'white',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  width: 17,
                  height: 17,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User profile button */}
            <button
              onClick={() => navigate('/profile')}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-full)',
                padding: '0.35rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                cursor: 'pointer',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
              title="View Profile and Settings"
            >
              <User size={16} />
              <span style={{ maxWidth: 110, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.fullName?.split(' ')[0] || 'User'}
              </span>
            </button>

            {/* Logout button */}
            <button
              onClick={logout}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '0.4rem',
                borderRadius: 'var(--radius-sm)'
              }}
              title="Log Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <RoleSwitcherModal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
      />
    </>
  );
}
