import './Results.css';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import NairobiMap from '../../components/NairobiMap/NairobiMap';
import Legend from '../../components/Legend/Legend';
import Chat from '../../components/Chat/Chat';
import TopNav from '../../components/TopNav/TopNav';
import PipelineSteps from '../../components/PipelineSteps/PipelineSteps';
import { api } from '../../api';
import { kes } from '../../utils';

const TIERS = [
  ['Common', 'eal_common_kes'], ['Occasional', 'eal_occasional_kes'],
  ['Moderate', 'eal_moderate_kes'], ['Severe', 'eal_severe_kes'], ['Extreme', 'eal_extreme_kes'],
];

export default function Results() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.results(id).then((result) => { if (active) setData(result); })
      .catch((cause) => { if (active) setError(cause.message); });
    api.hotspots().then((rows) => { if (active) setHotspots(rows.map((h) => ({ ...h, severity: 'red' }))); }).catch(() => {});
    return () => { active = false; };
  }, [id]);

  const explain = async () => {
    setBusy(true); setError('');
    try { setSummary((await api.explain(id)).explanation); }
    catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };

  const back = <Link to="/dashboard" className="back"><ArrowLeft size={16} />Back to dashboard</Link>;
  if (!data && !error) return <div className="page center"><Loader2 className="spin" size={28} /><p>Loading portfolio results…</p></div>;
  if (error && !data) return <div className="page"><TopNav />{back}<p className="error banner">{error}</p></div>;

  const locations = data.top_locations || [];
  const ratio = data.total_tiv_kes ? ((data.eal_total_kes / data.total_tiv_kes) * 100).toFixed(2) : '—';
  const steps = [
    { step: 'Exposure data reviewed', detail: `${data.total_rows.toLocaleString()} accepted properties from ${data.name}.` },
    { step: 'Random Forest prediction', detail: 'Five hazard tiers and a severity score are generated per property.' },
    { step: 'Portfolio loss estimate', detail: 'Hazard tier scores and insured values are combined using the configured annual rate assumptions.' },
  ];

  return (
    <div className="page">
      <TopNav />{back}
      {error && <p className="error banner">{error}</p>}
      <div className="results-head"><div><p className="eyebrow">Portfolio analysis</p><h1>{data.name || 'Portfolio results'}</h1></div>
        <Link to={`/results/${id}/report`} className="btn red"><FileText size={15} />Open report</Link></div>

      <div className="stats">
        <div><small>Expected annual loss</small><b className="red-text">{kes(data.eal_total_kes)}</b></div>
        <div><small>Total insured value</small><b>{kes(data.total_tiv_kes)}</b></div>
        <div><small>EAL as share of TIV</small><b>{ratio}%</b></div>
        <div><small>Properties</small><b>{Number(data.total_rows).toLocaleString()}</b></div>
      </div>

      <PipelineSteps steps={steps} />
      <div className="mapbox tall"><NairobiMap hotspots={hotspots} buildings={locations} /><Legend showSize /></div>

      <div className="grid2">
        <section className="panel"><h3>Loss by return period</h3>
          <div style={{ height: 280 }}><ResponsiveContainer>
            <LineChart data={data.exceedance_curve || []} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid stroke="#DCEBF5" strokeDasharray="3 3" />
              <XAxis dataKey="return_period_years" tickFormatter={(v) => `1-in-${v}`} fontSize={12} />
              <YAxis tickFormatter={(v) => kes(v)} fontSize={12} width={80} />
              <Tooltip formatter={(v) => kes(v, false)} labelFormatter={(v) => `Return period: 1-in-${v} years`} />
              <Line type="monotone" dataKey="loss_kes" stroke="#D7263D" strokeWidth={2.5} dot={{ r: 4, fill: '#D7263D' }} />
            </LineChart>
          </ResponsiveContainer></div>
        </section>
        <section className="panel"><h3>Expected annual loss by tier</h3><dl className="assume">
          {TIERS.map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{kes(data[key])}</dd></div>)}
        </dl></section>
      </div>

      <section className="panel"><h3>Highest hazard severity locations</h3>
        <div className="tablewrap tallrows"><table><thead><tr><th>Location ID</th><th>Lat</th><th>Lon</th><th>TIV</th><th>Hazard severity</th></tr></thead>
          <tbody>{locations.map((location) => <tr key={location.loc_id}><td><b>{location.loc_id}</b></td>
            <td>{Number(location.lat).toFixed(5)}</td><td>{Number(location.lon).toFixed(5)}</td>
            <td>{kes(location.tiv_kes, false)}</td><td>{Number(location.hazard_severity).toFixed(3)}</td></tr>)}</tbody>
        </table></div>
      </section>

      <section className="panel ai"><div className="ai-head"><h3>AI risk summary</h3>
        <button className="btn red" onClick={explain} disabled={busy}>{busy ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />}{summary ? 'Refresh summary' : 'Generate summary'}</button>
      </div>{summary ? <p className="explain">{summary}</p> : <p className="empty">Generate a plain-language explanation of these portfolio results.</p>}</section>
      <Chat id={id} />
      <p className="hint">Loss estimates use the model's hazard scores and configured tier-rate assumptions. Review the assumptions before making financial decisions.</p>
    </div>
  );
}
