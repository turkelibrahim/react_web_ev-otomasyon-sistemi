import { NavLink } from 'react-router-dom';

const links = [
  ['/', 'Dashboard'], ['/devices', 'Devices'], ['/automations', 'Automations'],
  ['/notifications', 'Notifications'], ['/admin', 'Admin'],
];

export default function Sidebar({ menuOpen, onNavigate }) {
  return (
    <aside id="main-navigation" className={`sidebar${menuOpen ? ' is-open' : ''}`}>
      <p className="sidebar-title">Home Automation</p>
      <nav aria-label="Main navigation">
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate}>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}