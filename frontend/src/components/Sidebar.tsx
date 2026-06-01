import { Factory, Moon, Sun } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { SIDEBAR_GROUPS } from '../navigation/sidebar';
import { useTheme } from '../context/ThemeContext';

export function Sidebar() {
  const { theme, setTheme } = useTheme();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-mark" aria-hidden>
          <Factory size={18} strokeWidth={2.2} />
        </div>
        <div className="brand-text">
          <div className="brand-title">
            <span className="brand-title-line">工业模型</span>
            <span className="brand-title-line brand-title-sub">工作台</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="主导航">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.id} className="nav-group">
            <div className="nav-group-label">{group.label}</div>
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} aria-hidden />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="theme-switcher" role="group" aria-label="主题">
          {(['dark', 'light', 'system'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`theme-switcher-btn ${theme === t ? 'active' : ''}`}
              onClick={() => setTheme(t)}
              title={t === 'dark' ? '深色' : t === 'light' ? '浅色' : '跟随系统'}
            >
              {t === 'dark' ? <Moon size={14} /> : t === 'light' ? <Sun size={14} /> : 'Auto'}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
