import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { section: 'Capstone', items: [
    { to: '/end-to-end', label: 'End-to-End Simulation', icon: '▶', flagship: true },
  ]},
  { section: 'Core Modules', items: [
    { to: '/policy-simulator', label: 'Policy Simulator', icon: '◈' },
    { to: '/incident-simulator', label: 'Incident Simulator', icon: '◉' },
    { to: '/label-lab', label: 'Label Lab', icon: '◎' },
    { to: '/sit-builder', label: 'SIT Builder', icon: '◆' },
  ]},
  { section: 'Advanced', items: [
    { to: '/false-positive-lab', label: 'False Positive Lab', icon: '◇' },
    { to: '/insider-risk', label: 'Insider Risk', icon: '◬' },
    { to: '/compliance-lab', label: 'Compliance Lab', icon: '◫' },
  ]},
];

export default function Layout() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>
            <span style={{ fontSize: 20 }}>◊</span>
            DLP Training Platform
          </h1>
          <p>Microsoft Purview DLP Simulation</p>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section" style={{ padding: '4px 12px' }}>
            <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end>
              <span className="icon">◌</span> Dashboard
            </NavLink>
          </div>
          {navItems.map((section) => (
            <div key={section.section} className="nav-section">
              <div className="nav-section-label">{section.section}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `nav-link${isActive ? ' active' : ''}${item.flagship ? ' flagship' : ''}`
                  }
                >
                  <span className="icon">{item.icon}</span> {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
          v2.0 — End-to-End Edition
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
