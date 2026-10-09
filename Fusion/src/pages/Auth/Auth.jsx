import './Auth.css';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail,
  MapPinned, ShieldCheck, Waves,
} from 'lucide-react';
import { api } from '../../api';

export default function Auth({ mode }) {
  const signup = mode === 'signup';
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (signup && password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const credentials = { email: email.trim().toLowerCase(), password };
      await (signup ? api.signup(credentials) : api.signin(credentials));
      navigate(params.get('next') || '/dashboard', { replace: true });
    } catch (cause) {
      setError(cause.message || 'We could not sign you in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-layout">
        <aside className="auth-story">
          <Link to="/dashboard" className="auth-brand"><span className="brand-mark"><Waves size={19} /></span><span className="brand-name"><b>Nairobi</b> flood risk</span></Link>
          <div className="story-content">
            <span className="story-label"><MapPinned size={14} /> FLOOD EXPOSURE WORKSPACE</span>
            <h1>See risk clearly.<br /><em>Act with confidence.</em></h1>
            <p>Bring property data, hazard predictions, and portfolio decisions together in one place.</p>
            <div className="story-steps">
              <div><span>01</span><div><b>Organize exposure</b><small>Keep each portfolio separate and reviewable.</small></div></div>
              <div><span>02</span><div><b>Understand hazard</b><small>Explore model scores by location and severity.</small></div></div>
              <div><span>03</span><div><b>Make informed decisions</b><small>Turn portfolio insights into next steps.</small></div></div>
            </div>
          </div>
          <div className="story-foot"><ShieldCheck size={15} /> Your portfolio workspace is protected with secure sign-in.</div>
          <div className="story-orb orb-one" /><div className="story-orb orb-two" />
        </aside>

        <section className="auth-panel">
          <div className="auth-panel-top"><span>{signup ? 'START YOUR WORKSPACE' : 'YOUR WORKSPACE'}</span><Link to="/dashboard">Back to map <ArrowRight size={14} /></Link></div>
          <div className="auth-form-wrap">
            <div className="auth-mobile-brand"><span className="brand-mark"><Waves size={18} /></span><span className="brand-name"><b>Nairobi</b> flood risk</span></div>
            <div className="auth-heading">
              <span className="auth-icon">{signup ? <ShieldCheck size={20} /> : <LockKeyhole size={20} />}</span>
              <p className="auth-kicker">{signup ? 'GET STARTED' : 'WELCOME BACK'}</p>
              <h2>{signup ? 'Create your account' : 'Sign in to your workspace'}</h2>
              <p>{signup ? 'Create a secure account to save and revisit your portfolios.' : 'Enter your details to continue to your portfolios.'}</p>
            </div>

            <form className="auth-form" onSubmit={submit}>
              <label htmlFor="auth-email">Email address</label>
              <div className="auth-input-wrap"><Mail size={17} /><input id="auth-email" type="email" autoComplete="email" placeholder="you@company.com" required maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} /></div>

              <div className="auth-label-row"><label htmlFor="auth-password">Password</label>{!signup && <span>At least 8 characters</span>}</div>
              <div className="auth-input-wrap"><LockKeyhole size={17} /><input id="auth-password" type={visible ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} placeholder={signup ? 'Create a password' : 'Enter your password'} required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /><button className="password-toggle" type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>

              {signup && <><label htmlFor="auth-confirm">Confirm password</label><div className="auth-input-wrap"><LockKeyhole size={17} /><input id="auth-confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" placeholder="Enter your password again" required minLength={8} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div><p className="password-hint">Use at least 8 characters. You can change it later.</p></>}

              {error && <div className="auth-error" role="alert">{error}</div>}
              <button className="auth-submit" type="submit" disabled={busy}>
                {busy ? <><Loader2 className="spin" size={17} />{signup ? 'Creating account…' : 'Signing in…'}</> : <>{signup ? 'Create account' : 'Sign in'}<ArrowRight size={17} /></>}
              </button>
            </form>

            <p className="auth-switch">{signup ? 'Already have an account?' : 'New to Fusion?'}{' '}
              <Link to={signup ? '/signin' : '/signup'}>{signup ? 'Sign in' : 'Create an account'}</Link>
            </p>
            <p className="auth-terms">Your sign-in tokens stay in this browser session.</p>
          </div>
        </section>
      </section>
    </main>
  );
}
