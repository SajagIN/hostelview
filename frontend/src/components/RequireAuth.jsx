import { Link, Navigate, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, PageLoader } from './ui.jsx';

export default function RequireAuth({ children, role, contributor }) {
  const { user, loading, canContribute } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (role && user.role !== role) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={Lock} title="You don't have access to this page" action={<Link to="/" className="btn btn-primary">Go home</Link>}>
          This area is only available to {role}s.
        </EmptyState>
      </div>
    );
  }
  if (contributor && !canContribute) return <Navigate to="/verify" replace state={{ from: location, reason: 'contribute' }} />;
  return children;
}
