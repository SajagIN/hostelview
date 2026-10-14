import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Account from './pages/Account.jsx';
import AdminColleges from './pages/admin/AdminColleges.jsx';
import AdminHostels from './pages/admin/AdminHostels.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminModeration from './pages/admin/AdminModeration.jsx';
import AdminOverview from './pages/admin/AdminOverview.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import Colleges from './pages/Colleges.jsx';
import Compare from './pages/Compare.jsx';
import DevMailbox from './pages/DevMailbox.jsx';
import Explore from './pages/Explore.jsx';
import Home from './pages/Home.jsx';
import HostelDetail from './pages/HostelDetail.jsx';
import HostelForm from './pages/HostelForm.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import Register from './pages/Register.jsx';
import Verify from './pages/Verify.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="hostels" element={<Explore />} />
        <Route
          path="hostels/new"
          element={
            <RequireAuth contributor>
              <HostelForm />
            </RequireAuth>
          }
        />
        <Route path="hostels/:id" element={<HostelDetail />} />
        <Route
          path="hostels/:id/edit"
          element={
            <RequireAuth>
              <HostelForm />
            </RequireAuth>
          }
        />
        <Route path="compare" element={<Compare />} />
        <Route path="colleges" element={<Colleges />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route
          path="verify"
          element={
            <RequireAuth>
              <Verify />
            </RequireAuth>
          }
        />
        <Route
          path="account"
          element={
            <RequireAuth>
              <Account />
            </RequireAuth>
          }
        />
        <Route path="dev/mailbox" element={<DevMailbox />} />
        <Route
          path="admin"
          element={
            <RequireAuth role="admin">
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="moderation" element={<AdminModeration />} />
          <Route path="hostels" element={<AdminHostels />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="colleges" element={<AdminColleges />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
