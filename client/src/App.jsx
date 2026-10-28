import { Navigate, Route, Routes, Link } from 'react-router-dom';
import { useAuth } from './auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientDetail from './pages/PatientDetail';

function Guard({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user, logout } = useAuth();
  return (
    <>
      {user && (
        <header className="nav">
          <Link to="/" className="brand">💊 PillGuard</Link>
          <span className="grow" />
          <span className="muted">{user.name} · <b>{user.role}</b></span>
          <button className="btn ghost" onClick={logout}>Logout</button>
        </header>
      )}
      <main className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Guard><Dashboard /></Guard>} />
          <Route path="/patients/:id" element={<Guard><PatientDetail /></Guard>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </>
  );
}
