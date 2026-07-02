import { useEffect, useState } from 'react';
import ConsultantSignup from './pages/ConsultantSignup';
import ConsultantLogin from './pages/ConsultantLogin';
import ConsultantDashboard from './pages/ConsultantDashboard';
import VideoCall from './components/VideoCall';

function getRoute() {
  const h = window.location.hash.replace('#', '');
  if (h.startsWith('/signup')) return '/signup';
  if (h.startsWith('/login')) return '/login';
  if (h.startsWith('/dashboard')) return '/dashboard';
  if (h.startsWith('/video-call')) return '/video-call';
  return '/login';
}

export default function App() {
  const [route, setRoute] = useState(getRoute());

  useEffect(() => {
    const onChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  let page = null;
  switch (route) {
    case '/signup':
      page = <ConsultantSignup />; break;
    case '/login':
      page = <ConsultantLogin />; break;
    case '/dashboard':
      page = <ConsultantDashboard />; break;
    case '/video-call': {
      const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      const roomId = urlParams.get('roomId') || '';
      const callerName = urlParams.get('name') || 'Farmer';
      const callRole = (urlParams.get('role') || 'farmer') as 'consultant' | 'farmer';
      page = (
        <div style={{ width: '100vw', height: '100vh', background: '#0f0c29' }}>
          <VideoCall roomId={roomId} role={callRole} callerName={callerName} />
        </div>
      );
      break;
    }
    default:
      page = <ConsultantLogin />; break;
  }

  return (
    <>
      {page}
    </>
  );
}
