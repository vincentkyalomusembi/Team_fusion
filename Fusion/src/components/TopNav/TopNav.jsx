import './TopNav.css';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderUp, LogIn, LogOut, UserPlus } from 'lucide-react';
import { api, isSignedIn } from '../../api';

export default function TopNav() {
  const nav = useNavigate();
  const signedIn = isSignedIn();
  const signout = async () => { try { await api.signout(); } finally { nav('/signin', { replace: true }); window.location.reload(); } };
  return <nav className="topnav">
    <div className="topnav-brand"><span>Nairobi</span> flood risk</div>
    <div className="topnav-links">
      <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}><LayoutDashboard size={15} />Dashboard</NavLink>
      <button className="topnav-btn" onClick={() => nav('/portfolios')}><FolderUp size={15} />Portfolios</button>
      {signedIn ? <button className="topnav-btn" onClick={signout}><LogOut size={15} />Sign out</button> : <>
        <NavLink to="/signin"><LogIn size={15} />Sign in</NavLink>
        <NavLink to="/signup"><UserPlus size={15} />Sign up</NavLink>
      </>}
    </div>
  </nav>;
}
