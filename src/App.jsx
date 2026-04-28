import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from './lib/store.js';
import { connectSocket } from './lib/socket.js';
import { api } from './lib/api.js';
import Backdrop from './components/Backdrop.jsx';
import Toasts from './components/Toasts.jsx';
import LoginScreen from './screens/LoginScreen.jsx';
import GuestHome from './screens/guest/GuestHome.jsx';
import GuestModule from './screens/guest/GuestModule.jsx';
import EmployeeHome from './screens/employee/EmployeeHome.jsx';
import EmployeeFire from './screens/employee/EmployeeFire.jsx';
import EmployeeMedical from './screens/employee/EmployeeMedical.jsx';
import EmployeeSecurity from './screens/employee/EmployeeSecurity.jsx';
import EmployeeHazard from './screens/employee/EmployeeHazard.jsx';
import EmployeeDispatch from './screens/employee/EmployeeDispatch.jsx';

function ProtectedGuest({ children }) {
  const session = useStore(s => s.session);
  if (!session) return <Navigate to="/" replace />;
  if (session.kind !== 'guest') return <Navigate to="/employee" replace />;
  return children;
}

function ProtectedEmployee({ children }) {
  const session = useStore(s => s.session);
  if (!session) return <Navigate to="/" replace />;
  if (session.kind !== 'employee') return <Navigate to="/guest" replace />;
  return children;
}

export default function App() {
  const session = useStore(s => s.session);
  const hydrate = useStore(s => s.hydrate);
  const setZones = useStore(s => s.setZones);
  const setDensities = useStore(s => s.setDensities);
  const setResponders = useStore(s => s.setResponders);
  const setFamilies = useStore(s => s.setFamilies);
  const setIncidents = useStore(s => s.setIncidents);

  // Hydrate session and connect socket on mount
  useEffect(() => {
    hydrate();
    connectSocket();
    // Initial REST fetches
    api.zones().then(d => {
      setZones(d.zones || [], d.exits || []);
      if (d.densities) setDensities(d.densities);
    }).catch(console.error);
    api.responders().then(setResponders).catch(console.error);
    api.families().then(setFamilies).catch(console.error);
    api.incidents().then(setIncidents).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen w-full text-white" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      <Backdrop />
      <Toasts />

      <Routes>
        <Route path="/" element={
          session ? <Navigate to={session.kind === 'guest' ? '/guest' : '/employee'} replace /> : <LoginScreen />
        } />

        {/* Guest routes */}
        <Route path="/guest" element={<ProtectedGuest><GuestHome /></ProtectedGuest>} />
        <Route path="/guest/:type" element={<ProtectedGuest><GuestModule /></ProtectedGuest>} />

        {/* Employee routes */}
        <Route path="/employee" element={<ProtectedEmployee><EmployeeHome /></ProtectedEmployee>} />
        <Route path="/employee/fire" element={<ProtectedEmployee><EmployeeFire /></ProtectedEmployee>} />
        <Route path="/employee/medical" element={<ProtectedEmployee><EmployeeMedical /></ProtectedEmployee>} />
        <Route path="/employee/security" element={<ProtectedEmployee><EmployeeSecurity /></ProtectedEmployee>} />
        <Route path="/employee/hazard" element={<ProtectedEmployee><EmployeeHazard /></ProtectedEmployee>} />
        <Route path="/employee/dispatch" element={<ProtectedEmployee><EmployeeDispatch /></ProtectedEmployee>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
