import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

// 21 Required Pages
import Login from './pages/Login';
import Register from './pages/Register';
import RoleSelection from './pages/RoleSelection';
import StudentDashboard from './pages/StudentDashboard';
import ExpertDashboard from './pages/ExpertDashboard';
import SponsorDashboard from './pages/SponsorDashboard';
import ExploreProjects from './pages/ExploreProjects';
import ProjectDetails from './pages/ProjectDetails';
import CreateProject from './pages/CreateProject';
import TaskManagement from './pages/TaskManagement';
import TaskDetails from './pages/TaskDetails';
import MyWorkspace from './pages/MyWorkspace';
import SubmitWork from './pages/SubmitWork';
import SubmissionHistory from './pages/SubmissionHistory';
import SubmissionDetails from './pages/SubmissionDetails';
import ContributionLedger from './pages/ContributionLedger';
import UserProfile from './pages/UserProfile';
import NotificationsPage from './pages/NotificationsPage';
import ProjectAccessManagement from './pages/ProjectAccessManagement';
import SponsorReports from './pages/SponsorReports';
import AccountSettings from './pages/AccountSettings';

export default function App() {
  const { user, loading, activeRole } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/login');

  // Listen to browser popstate (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Programmatic navigation helper
  const navigate = (path) => {
    if (path !== currentPath) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo(0, 0);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            ResearchProof Ecosystem
          </div>
          <div>Restoring verified researcher session...</div>
        </div>
      </div>
    );
  }

  // Unauthenticated user routing
  if (!user) {
    if (currentPath === '/register') {
      return (
        <div className="app-container">
          <Register navigate={navigate} />
        </div>
      );
    }
    return (
      <div className="app-container">
        <Login navigate={navigate} />
      </div>
    );
  }

  // Handle default landing if at root / or /login when authenticated
  if (currentPath === '/' || currentPath === '/login') {
    const defaultDash =
      activeRole === 'expert' ? '/dashboard/expert' :
      activeRole === 'sponsor' ? '/dashboard/sponsor' : '/dashboard/student';
    window.history.replaceState({}, '', defaultDash);
    return (
      <div className="app-container">
        <Navbar currentPath={defaultDash} navigate={navigate} />
        <main className="main-content">
          {activeRole === 'expert' && <ExpertDashboard navigate={navigate} />}
          {activeRole === 'sponsor' && <SponsorDashboard navigate={navigate} />}
          {activeRole === 'student' && <StudentDashboard navigate={navigate} />}
        </main>
      </div>
    );
  }

  // Router matching logic
  const renderPage = () => {
    // 1. Dashboards
    if (currentPath === '/dashboard/student') return <StudentDashboard navigate={navigate} />;
    if (currentPath === '/dashboard/expert') return <ExpertDashboard navigate={navigate} />;
    if (currentPath === '/dashboard/sponsor') return <SponsorDashboard navigate={navigate} />;

    // 2. Role Selection
    if (currentPath === '/role-selection') return <RoleSelection navigate={navigate} />;

    // 3. Projects
    if (currentPath === '/projects') return <ExploreProjects navigate={navigate} />;
    if (currentPath === '/projects/new') return <CreateProject navigate={navigate} />;

    // Project subroutes: /projects/:id/tasks, /projects/:id/access, /projects/:id
    const projTasksMatch = currentPath.match(/^\/projects\/([^/]+)\/tasks$/);
    if (projTasksMatch) return <TaskManagement projectId={projTasksMatch[1]} navigate={navigate} />;

    const projAccessMatch = currentPath.match(/^\/projects\/([^/]+)\/access$/);
    if (projAccessMatch) return <ProjectAccessManagement projectId={projAccessMatch[1]} navigate={navigate} />;

    const projMatch = currentPath.match(/^\/projects\/([^/]+)$/);
    if (projMatch) return <ProjectDetails projectId={projMatch[1]} navigate={navigate} />;

    // 4. Tasks
    const taskMatch = currentPath.match(/^\/tasks\/([^/]+)$/);
    if (taskMatch) return <TaskDetails taskId={taskMatch[1]} navigate={navigate} />;

    // 5. Workspace & Submissions
    if (currentPath === '/workspace') return <MyWorkspace navigate={navigate} />;

    const submitMatch = currentPath.match(/^\/submit\/([^/]+)$/);
    if (submitMatch) return <SubmitWork taskId={submitMatch[1]} navigate={navigate} />;

    if (currentPath === '/submissions/history') return <SubmissionHistory navigate={navigate} />;

    const subDetailMatch = currentPath.match(/^\/submissions\/([^/]+)$/);
    if (subDetailMatch) return <SubmissionDetails submissionId={subDetailMatch[1]} navigate={navigate} />;

    // 6. Ledger & Reports
    if (currentPath === '/ledger') return <ContributionLedger navigate={navigate} />;
    if (currentPath === '/sponsor/reports') return <SponsorReports navigate={navigate} />;

    // 7. Profile, Notifications & Settings
    if (currentPath === '/profile') return <UserProfile navigate={navigate} />;
    if (currentPath === '/notifications') return <NotificationsPage navigate={navigate} />;
    if (currentPath === '/settings') return <AccountSettings navigate={navigate} />;

    // Fallback 404
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
        <h2>Page Not Found</h2>
        <p style={{ color: 'var(--text-muted)', margin: '0.75rem 0 1.5rem' }}>
          The requested page <code>{currentPath}</code> does not exist.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/projects')}>
          Return to Explore Projects
        </button>
      </div>
    );
  };

  return (
    <div className="app-container">
      <Navbar currentPath={currentPath} navigate={navigate} />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}
