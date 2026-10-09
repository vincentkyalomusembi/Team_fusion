import './PortfolioUpload.css';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Upload, Loader2, Pencil, Save, BrainCircuit, Database, Download, CheckCircle2, ChartNoAxesCombined, Mail, FlaskConical } from 'lucide-react';
import { api } from '../../api';

const PAGE_SIZE = 500;
const EXPOSURE_COLUMNS = [
  ['loc_id', 'Location ID'], ['lat', 'Latitude'], ['lon', 'Longitude'],
  ['housing_class', 'Housing class'], ['floor_area_m2', 'Floor area (m²)'],
  ['cost_per_m2_kes', 'Cost / m² (KSh)'], ['tiv_kes', 'TIV (KSh)'],
  ['synthetic', 'Synthetic'], ['source', 'Source'],
];
const PREDICTION_COLUMNS = [
  ['hazard_score_common', 'Common'], ['hazard_score_occasional', 'Occasional'],
  ['hazard_score_moderate', 'Moderate'], ['hazard_score_severe', 'Severe'],
  ['hazard_score_extreme', 'Extreme'], ['hazard_severity', 'Severity'],
];
const TERMINAL_STATUSES = new Set([
  'completed', 'completed_with_warnings', 'predicted', 'prediction_failed',
  'confirmed', 'confirmation_failed', 'failed',
]);
const STATUS_LABELS = {
  draft: 'Waiting to upload', queued: 'Queued', processing: 'Extracting and cleaning',
  completed: 'Ready to review', completed_with_warnings: 'Review with warnings',
  predicting: 'Generating hazard scores', predicted: 'Predictions ready',
  publishing: 'Saving approved portfolio', confirmed: 'Approved and saved',
  failed: 'Extraction failed', prediction_failed: 'Prediction failed',
  confirmation_failed: 'Save failed',
};
const tokenKey = (id) => `fusion.portfolio.token.${id}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('en-KE', { maximumFractionDigits: 4 }) : value;
}

function displayValue(key, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'synthetic') return value ? 'Yes' : 'No';
  if (key === 'tiv_kes' || key === 'cost_per_m2_kes') return `KSh ${formatNumber(value)}`;
  return ['lat', 'lon', 'floor_area_m2', ...PREDICTION_COLUMNS.map(([field]) => field)].includes(key)
    ? formatNumber(value) : String(value);
}

export default function PortfolioUpload({ open, onClose, onChanged }) {
  const [files, setFiles] = useState([]);
  const pick = (list) => setFiles((current) => [
    ...current,
    ...[...list].map((file) => ({ key: crypto.randomUUID(), file })),
  ]);

  return (
    <section className={`sheet ${open ? 'open' : ''}`} aria-hidden={!open}>
      <header>
        <div>
          <h2>Upload a portfolio</h2>
          <p>Extract exposure data, review it, generate hazard scores, then approve it into its own database table.</p>
        </div>
        <button className="icon" onClick={onClose} aria-label="Close upload panel"><X size={18} /></button>
      </header>
      <div className="sheet-body">
        <label className="drop" onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); pick(event.dataTransfer.files); }}>
          <Upload size={22} />
          <b>Drop files here or choose from your computer</b>
          <span>CSV is parsed directly. Text PDFs and DOCX use the configured OpenAI extraction service.</span>
          <span>Accepted: CSV, DOCX, text-based PDF · Scanned PDFs need OCR first.</span>
          <input type="file" multiple accept=".pdf,.docx,.csv"
            onChange={(event) => { pick(event.target.files); event.target.value = ''; }} />
        </label>
        {!files.length && <p className="empty">Each upload becomes a separate portfolio. Review and approve it before the final table is created.</p>}
        {files.map(({ key, file }) => <PortfolioCard key={key} file={file} onApproved={onChanged} />)}
      </div>
    </section>
  );
}

function PortfolioCard({ file, onApproved }) {
  const navigate = useNavigate();
  const [name, setName] = useState(file.name.replace(/\.[^.]+$/, ''));
  const [portfolio, setPortfolio] = useState(null);
  const [token, setToken] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [dropped, setDropped] = useState(0);
  const [edits, setEdits] = useState({});
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const timer = useRef(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; clearTimeout(timer.current); };
  }, []);

  const acceptPreview = (page, append) => {
    setTotal(page.total);
    setDropped(page.dropped_rows);
    setRows((current) => append ? [...current, ...page.records] : page.records);
  };

  const loadPreview = async (id, accessToken, append = false) => {
    const offset = append ? rows.length : 0;
    const page = await api.preview(id, accessToken, { limit: PAGE_SIZE, offset });
    if (alive.current) acceptPreview(page, append);
  };

  const refreshLoadedRows = async (id, accessToken) => {
    const count = Math.max(PAGE_SIZE, rows.length);
    const loaded = [];
    for (let offset = 0; offset < count; offset += PAGE_SIZE) {
      const page = await api.preview(id, accessToken, { limit: PAGE_SIZE, offset });
      loaded.push(...page.records);
      setTotal(page.total);
      setDropped(page.dropped_rows);
      if (page.records.length < PAGE_SIZE) break;
    }
    if (alive.current) setRows(loaded);
  };

  const poll = async (id, accessToken) => {
    try {
      const latest = await api.portfolioStatus(id, accessToken);
      if (!alive.current) return;
      setPortfolio(latest);
      setName(latest.name);
      if (['completed', 'completed_with_warnings', 'predicted', 'confirmed'].includes(latest.status)) {
        await loadPreview(id, accessToken);
        if (latest.status === 'confirmed') onApproved?.();
      }
      if (TERMINAL_STATUSES.has(latest.status)) {
        if (latest.error) setError(latest.error);
        return;
      }
      timer.current = setTimeout(() => poll(id, accessToken), 1800);
    } catch (cause) {
      if (alive.current) setError(cause.message);
    }
  };

  const upload = async () => {
    setError(''); setNotice(''); setBusy(true);
    try {
      const created = await api.upload(file, name);
      sessionStorage.setItem(tokenKey(created.id), created.access_token);
      setToken(created.access_token);
      setPortfolio(created);
      timer.current = setTimeout(() => poll(created.id, created.access_token), 500);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  };

  const runBusy = async (operation) => {
    setBusy(true); setError(''); setNotice('');
    try { await operation(); }
    catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };

  const updateCell = (locId, field, value) => {
    setRows((current) => current.map((row) => row.loc_id === locId ? { ...row, [field]: value } : row));
    setEdits((current) => ({ ...current, [locId]: { ...current[locId], [field]: value } }));
  };

  const saveChanges = () => runBusy(async () => {
    const records = Object.entries(edits).map(([loc_id, values]) => ({ loc_id, ...values }));
    const required = ['lat', 'lon', 'housing_class', 'floor_area_m2', 'cost_per_m2_kes', 'tiv_kes'];
    const invalid = records.find((record) => required.some((field) => record[field] === '' || record[field] === null));
    if (invalid) throw new Error(`Complete all required fields for ${invalid.loc_id} before saving.`);
    for (let start = 0; start < records.length; start += 1000) {
      await api.saveRows(portfolio.id, token, records.slice(start, start + 1000));
    }
    setEdits({}); setEditing(false);
    setPortfolio((current) => current.status === 'predicted' ? { ...current, status: 'completed' } : current);
    await refreshLoadedRows(portfolio.id, token);
    setNotice('Your edits are saved. Run predictions again to update hazard scores.');
  });

  const predict = () => runBusy(async () => {
    const result = await api.predict(portfolio.id, token);
    setPortfolio((current) => ({ ...current, status: result.status }));
    await refreshLoadedRows(portfolio.id, token);
    setNotice(`Hazard scores generated for ${result.predicted.toLocaleString()} records.`);
  });

  const confirm = () => runBusy(async () => {
    const pending = await api.confirm(portfolio.id, token);
    setPortfolio(pending);
    timer.current = setTimeout(() => poll(portfolio.id, token), 300);
    setNotice('Approval received. The dedicated portfolio table is being created.');
  });

  const sendEmail = () => runBusy(async () => {
    const result = await api.emailCSV(portfolio.id, email);
    setNotice(result.sent ? `CSV sent to ${email}.` : 'Brevo did not confirm delivery.');
  });

  const runAnalysis = () => runBusy(async () => {
    await api.analyse(portfolio.id);
    setNotice('Analysis complete. Opening portfolio analysis…');
    navigate(`/analysis/${portfolio.id}`);
  });

  const sendAnalysisEmail = () => runBusy(async () => {
    const result = await api.analyseEmail(portfolio.id, email, true);
    setNotice(result.sent ? `Analysis report sent to ${email}.` : 'Brevo did not confirm delivery.');
  });

  const download = () => runBusy(async () => {
    const blob = await api.downloadCSV(portfolio.id, token);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${portfolio.table_name || 'portfolio'}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  });

  const canEdit = ['completed', 'completed_with_warnings', 'predicted', 'prediction_failed'].includes(portfolio?.status);
  const canPredict = ['completed', 'completed_with_warnings', 'prediction_failed'].includes(portfolio?.status);
  const isPredicted = ['predicted', 'publishing', 'confirmed', 'confirmation_failed'].includes(portfolio?.status);
  const hasMore = rows.length < total;

  return (
    <article className="pcard etl-card">
      <div className="pcard-head">
        <input className="name" value={name} onChange={(event) => setName(event.target.value)}
          disabled={Boolean(portfolio) || busy} aria-label="Portfolio name" />
        <span className={`tag ${portfolio?.status || 'draft'}`}>
          {STATUS_LABELS[portfolio?.status || 'draft'] || portfolio?.status}
        </span>
      </div>
      <p className="file">{file.name}{portfolio?.table_name ? ` · final table: ${portfolio.table_name}` : ''}</p>

      {!portfolio && <button className="btn red" onClick={upload} disabled={busy || !name.trim()}>
        {busy ? <Loader2 className="spin" size={15} /> : <Upload size={15} />}
        Upload and extract
      </button>}

      {portfolio && <>
        <div className="etl-progress" aria-label="Portfolio processing steps">
          <span className={['completed', 'completed_with_warnings', 'predicted', 'publishing', 'confirmed', 'prediction_failed'].includes(portfolio.status) ? 'done' : 'current'}>1. Extract & clean</span>
          <span className={isPredicted ? 'done' : canPredict ? 'current' : ''}>2. Review & predict</span>
          <span className={portfolio.status === 'confirmed' ? 'done' : ['predicted', 'publishing'].includes(portfolio.status) ? 'current' : ''}>3. Approve & save</span>
        </div>
        <div className="etl-summary">
          <span><b>{Number(portfolio.total_rows || 0).toLocaleString()}</b> accepted rows</span>
          <span><b>{Number(dropped).toLocaleString()}</b> dropped rows</span>
          {portfolio.status === 'confirmed' && <span><Database size={14} /> Separate database table created</span>}
        </div>

        {['queued', 'processing', 'predicting', 'publishing'].includes(portfolio.status) &&
          <div className="loading"><Loader2 className="spin" size={17} />{STATUS_LABELS[portfolio.status]}…</div>}

        {rows.length > 0 && <>
          <div className="preview-heading">
            <div><h3>Extracted exposure preview</h3><p>Showing {rows.length.toLocaleString()} of {total.toLocaleString()} accepted records.</p></div>
            {canEdit && <button className="btn ghost" onClick={() => setEditing((value) => !value)} disabled={busy}>
              <Pencil size={14} />{editing ? 'Stop editing' : 'Edit rows'}
            </button>}
          </div>
          <div className="tablewrap etl-table">
            <table>
              <thead><tr>{EXPOSURE_COLUMNS.map(([, label]) => <th key={label}>{label}</th>)}
                {isPredicted && PREDICTION_COLUMNS.map(([, label]) => <th key={label}>Hazard · {label}</th>)}
              </tr></thead>
              <tbody>{rows.map((row) => <tr key={row.loc_id}>
                {EXPOSURE_COLUMNS.map(([field]) => <td key={field}>
                  {editing && field !== 'loc_id' ? field === 'synthetic'
                    ? <select value={String(Boolean(row[field]))} onChange={(event) => updateCell(row.loc_id, field, event.target.value === 'true')}>
                      <option value="true">Yes</option><option value="false">No</option>
                    </select>
                    : <input type={['lat', 'lon', 'floor_area_m2', 'cost_per_m2_kes', 'tiv_kes'].includes(field) ? 'number' : 'text'}
                      step="any" value={row[field] ?? ''} onChange={(event) => updateCell(row.loc_id, field,
                        ['lat', 'lon', 'floor_area_m2', 'cost_per_m2_kes', 'tiv_kes'].includes(field)
                          ? (event.target.value === '' ? '' : Number(event.target.value)) : event.target.value)} />
                    : displayValue(field, row[field])}
                </td>)}
                {isPredicted && PREDICTION_COLUMNS.map(([field]) => <td className="score-cell" key={field}>{displayValue(field, row[field])}</td>)}
              </tr>)}</tbody>
            </table>
          </div>
          {hasMore && <button className="btn ghost" onClick={() => loadPreview(portfolio.id, token, true)} disabled={busy}>
            Load next {Math.min(PAGE_SIZE, total - rows.length).toLocaleString()} rows
          </button>}

          <div className="actions">
            {canEdit && <button className="btn blue" onClick={saveChanges} disabled={busy || !Object.keys(edits).length}>
              {busy ? <Loader2 className="spin" size={14} /> : <Save size={14} />}Save edits ({Object.keys(edits).length})
            </button>}
            {canPredict && <button className="btn red" onClick={predict} disabled={busy || Boolean(Object.keys(edits).length)}>
              {busy ? <Loader2 className="spin" size={14} /> : <BrainCircuit size={14} />}Generate hazard scores
            </button>}
            {portfolio.status === 'predicted' && <button className="btn red" onClick={confirm} disabled={busy}>
              <CheckCircle2 size={14} />Approve and save portfolio
            </button>}
            {portfolio.status === 'confirmation_failed' && <button className="btn red" onClick={confirm} disabled={busy}>
              <CheckCircle2 size={14} />Retry approval
            </button>}
            {portfolio.status === 'confirmed' && <button className="btn ghost" onClick={download} disabled={busy}>
              {busy ? <Loader2 className="spin" size={14} /> : <Download size={14} />}Download approved CSV
            </button>}
            {portfolio.status === 'confirmed' && <button className="btn red" onClick={runAnalysis} disabled={busy}>
              {busy ? <Loader2 className="spin" size={14} /> : <FlaskConical size={14} />}Run analysis
            </button>}
            {portfolio.status === 'confirmed' && <button className="btn blue" onClick={() => navigate(`/analysis/${portfolio.id}`)}>
              <ChartNoAxesCombined size={14} />View results
            </button>}
            {portfolio.status === 'confirmed' && <form className="email-export" onSubmit={(event) => { event.preventDefault(); sendAnalysisEmail(); }}>
              <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Send analysis report to email" aria-label="Recipient email" />
              <button className="btn ghost" disabled={busy}><Mail size={14} />Email report</button>
            </form>}
          </div>
        </>}

        {portfolio.status === 'completed' && !total && <p className="hint">No valid exposure rows were found in this file.</p>}
      </>}
      {portfolio?.error && <p className="error banner">{portfolio.error}</p>}
      {error && <p className="error banner">{error}</p>}
      {notice && <p className="success banner">{notice}</p>}
    </article>
  );
}
