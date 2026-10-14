import { Link } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import { EmptyState } from '../components/ui.jsx';
import { useDocumentTitle } from '../lib/useApi.js';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="container-page py-20">
      <EmptyState
        icon={MapPinOff}
        title="This page doesn't exist"
        action={
          <div className="flex gap-2">
            <Link to="/" className="btn btn-secondary">
              Home
            </Link>
            <Link to="/hostels" className="btn btn-primary">
              Explore hostels
            </Link>
          </div>
        }
      >
        The link may be broken, or the page may have moved.
      </EmptyState>
    </div>
  );
}
