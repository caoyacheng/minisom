import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { api } from './api/client';
import HubSearch from './components/HubSearch';
import { Sidebar } from './components/Sidebar';
import { StatusBadge } from './components/ui';
import { useAppContext } from './context/AppContext';
import { pageTitle } from './navigation/routes';
import Datasets from './pages/Datasets';
import Deploy from './pages/Deploy';
import Evaluate from './pages/Evaluate';
import ModelDetail from './pages/ModelDetail';
import Models from './pages/Models';
import Monitor from './pages/Monitor';
import Overview from './pages/Overview';
import Pipeline from './pages/Pipeline';
import Train from './pages/Train';

export default function App() {
  const location = useLocation();
  const { trainTraining, trainJob, testModels } = useAppContext();
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
    api.health()
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  const title = pageTitle(location.pathname);
  const isPipeline = location.pathname === '/pipeline';
  const showHubSearch = !location.pathname.startsWith('/models/') && !isPipeline;

  const badges = useMemo(() => {
    const items: { label: string; tone: 'muted' | 'ok' | 'warn' | 'err' }[] = [];

    if (backendOk === true) {
      items.push({ label: '服务在线', tone: 'ok' });
    } else if (backendOk === false) {
      items.push({ label: '服务离线', tone: 'err' });
    }

    if (trainTraining) {
      items.push({ label: '训练中', tone: 'warn' });
    } else if (trainJob?.status === 'completed') {
      items.push({ label: '训练完成', tone: 'ok' });
    }

    if (testModels.length > 0) {
      items.push({ label: `${testModels.length} 个模型`, tone: 'muted' });
    }

    return items;
  }, [backendOk, trainTraining, trainJob, testModels.length]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        {!isPipeline && (
          <header className="topbar">
            <h1>{title}</h1>
            <div className="topbar-right">
              {showHubSearch && (
                <div className="topbar-search">
                  <HubSearch compact />
                </div>
              )}
              <div className="badge-row">
                {badges.map((b) => (
                  <StatusBadge key={b.label} label={b.label} tone={b.tone} />
                ))}
              </div>
            </div>
          </header>
        )}
        <div className={`content-scroll${isPipeline ? ' content-scroll--canvas' : ''}`}>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/models" element={<Models />} />
            <Route path="/models/:id" element={<ModelDetail />} />
            <Route path="/datasets" element={<Datasets />} />
            <Route path="/train" element={<Train />} />
            <Route path="/evaluate" element={<Evaluate />} />
            <Route path="/deploy" element={<Deploy />} />
            <Route path="/monitor" element={<Monitor />} />
            <Route path="/test" element={<Navigate to="/evaluate" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
