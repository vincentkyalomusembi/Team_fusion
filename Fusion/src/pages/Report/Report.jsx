import './Report.css';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Printer, Sparkles } from 'lucide-react';
import TopNav from '../../components/TopNav/TopNav';
import { api } from '../../api';
import { kes } from '../../utils';

export default function Report() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.results(id).then((result) => { if (active) setData(result); })
      .catch((cause) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [id]);

  const generate = async () => {
    setBusy(true); setError('');
    try { setReport(await api.generateReport(id, data?.name)); }
    catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };

  const back = <Link to={`/results/${id}`} className="back no-print"><ArrowLeft size={16} />Back to results</Link>;
  if (!data && !error) return <div className="page center"><Loader2 className="spin" size={28} /><p>Loading report data…</p></div>;
  if (error && !data) return <div className="page"><TopNav />{back}<p className="error banner">{error}</p></div>;

  return <div className="page reportwrap"><TopNav />{back}
    <div className="toolbar no-print">
      <button className="btn red" onClick={generate} disabled={busy}>{busy ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />}{report ? 'Regenerate report' : 'Generate report and actions'}</button>
      <button className="btn ghost" onClick={() => window.print()}><Printer size={15} />Print or save as PDF</button>
    </div>
    {error && <p className="error banner no-print">{error}</p>}
    <article className="report">
      <header><h1>{data.name || 'Portfolio report'}</h1><p className="sub">Flood risk report · {new Date(data.computed_at).toLocaleDateString('en-KE', { dateStyle: 'long' })}</p></header>
      <div className="stats">
        <div><small>Expected annual loss</small><b className="red-text">{kes(data.eal_total_kes)}</b></div>
        <div><small>Total insured value</small><b>{kes(data.total_tiv_kes)}</b></div>
        <div><small>Properties</small><b>{Number(data.total_rows).toLocaleString()}</b></div>
        <div><small>Computed</small><b className="report-date">{new Date(data.computed_at).toLocaleDateString('en-KE')}</b></div>
      </div>
      <h2>Risk narrative</h2>
      {report ? <p className="explain">{report.report}</p> : <p className="empty">Generate a narrative using this portfolio’s computed results.</p>}
      <h2>Recommended actions</h2>
      {report?.actions?.length ? <ol className="report-actions">{report.actions.map((item, index) => <li key={`${item.action}-${index}`}>
        <span className={`priority ${String(item.priority).toLowerCase()}`}>{item.priority}</span>
        <div><b>{item.action}</b><p>{item.rationale}</p></div>
      </li>)}</ol> : <p className="empty">Recommendations appear with the generated report.</p>}
      <h2>Loss by return period</h2>
      <table className="rtable"><thead><tr><th>Return period</th><th>Annual exceedance probability</th><th>Loss estimate</th></tr></thead>
        <tbody>{(data.exceedance_curve || []).map((point) => <tr key={point.return_period_years}>
          <td>1-in-{point.return_period_years} years</td><td>{(point.annual_exceedance_probability * 100).toFixed(2)}%</td><td>{kes(point.loss_kes)}</td>
        </tr>)}</tbody></table>
      <p className="cap">Figures reflect the current portfolio model and configured assumptions.</p>
    </article>
  </div>;
}
