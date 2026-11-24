import { Link } from 'react-router-dom';

export default function Navbar({ menuOpen, onToggle }) {
  return (
    <header className="navbar">
      <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="main-navigation" onClick={onToggle}>
        {menuOpen ? 'Close menu' : 'Open menu'}
      </button>
      <span className="navbar-title">Home Automation</span>
      <nav className="account-links" aria-label="Account navigation">
        <Link to="/login">Login</Link><Link to="/register">Register</Link>
      </nav>
    </header>
  );
}