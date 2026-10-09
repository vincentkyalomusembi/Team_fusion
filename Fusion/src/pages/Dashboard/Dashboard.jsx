import './Dashboard.css';
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, FileText, MapPin } from 'lucide-react';
import NairobiMap from '../../components/NairobiMap/NairobiMap';
import Legend from '../../components/Legend/Legend';
import Portfolios from '../../components/PortfolioUpload/PortfolioUpload';
import TopNav from '../../components/TopNav/TopNav';
import { api } from '../../api';
import { SEVERITY } from '../../utils';

const latOf = (h) => Number(h.lat ?? h.latitude);
const lonOf = (h) => Number(h.lon ?? h.longitude);

export default function Dashboard() {
    const nav = useNavigate();
    const { pathname } = useLocation();
    const open = pathname === '/portfolios';
    const [hotspots, setHotspots] = useState([]);
    const [history, setHistory] = useState([]);
    const [mapError, setMapError] = useState('');

    // Portfolio history requires a signed-in user; anonymous uploads remain available.
    const loadHistory = () =>
        api.portfolios()
            .then(setHistory)
            .catch(() => setHistory([]));

    useEffect(() => {
        api.hotspots()
            .then((rows) =>
                setHotspots(
                    rows
                        .filter((h) => Number.isFinite(latOf(h)) && Number.isFinite(lonOf(h)))
                        .map((h) => ({ ...h, severity: 'red' }))
                )
            )
            .catch((e) => setMapError(e.message));
        loadHistory();
    }, []);

    return (
        <div className="shell">
            <aside className="side">
                <div className="brand"><span>Nairobi</span> flood risk</div>
                <button className="btn red wide" onClick={() => nav('/portfolios')}>
                    <Plus size={16} />Create portfolio
                </button>

                <h3>Hotspots ({hotspots.length})</h3>
                <ul className="history">
                    {hotspots.length === 0 && <li className="empty">Loading hotspots…</li>}
                    {hotspots.map((h) => (
                        <li key={h.id}>
                            <button type="button" title={`${latOf(h)}, ${lonOf(h)}`}>
                                <MapPin size={15} style={{ color: SEVERITY.red }} />
                                <span>
                  <b>{h.name}</b>
                  <small>{latOf(h).toFixed(5)}, {lonOf(h).toFixed(5)}</small>
                </span>
                            </button>
                        </li>
                    ))}
                </ul>

                <h3>Portfolio history</h3>
                <ul className="history">
                    {history.length === 0 && (
                        <li className="empty">Nothing here yet. Create your first portfolio to start.</li>
                    )}
                    {history.map((p) => (
                        <li key={p.id}>
                            <button
                                onClick={() =>
                                    nav(p.status === 'confirmed'
                                        ? `/analysis/${p.id}`
                                        : '/portfolios')
                                }
                            >
                                <FileText size={15} />
                                <span>
                  <b>{p.name}</b>
                  <small>
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('en-KE') : ''}
                      {' · '}{p.status}
                  </small>
                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </aside>

            <main className="main">
                <Portfolios open={open} onClose={() => nav('/dashboard')} onChanged={loadHistory} />
                <TopNav />
                <header className="top">
                    <div>
                        <h1>Flood hotspots across Nairobi</h1>
                        <p>Each red circle is a hotspot area returned by the backend.</p>
                    </div>
                    <div className="counts">
                        <span><i style={{ background: SEVERITY.red }} />{hotspots.length} hotspots</span>
                    </div>
                </header>
                {mapError && <p className="error banner">{mapError}</p>}
                <div className="mapbox">
                    <NairobiMap hotspots={hotspots} />
                    <Legend />
                </div>
            </main>
        </div>
    );
}
