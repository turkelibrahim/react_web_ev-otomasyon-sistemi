import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="app-layout">
      <Sidebar menuOpen={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <div className="app-content">
        <Navbar menuOpen={menuOpen} onToggle={() => setMenuOpen(open => !open)} />
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  );
}