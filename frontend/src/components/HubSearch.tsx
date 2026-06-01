import { Search } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

interface Props {
  defaultPath?: string;
  placeholder?: string;
  initialQuery?: string;
  compact?: boolean;
}

export default function HubSearch({
  defaultPath = '/models',
  placeholder = '搜索模型…',
  initialQuery = '',
  compact = false,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const onModelsHub = location.pathname === '/models';

  const qFromUrl = onModelsHub ? (searchParams.get('q') ?? '') : initialQuery;
  const [q, setQ] = useState(qFromUrl);

  useEffect(() => {
    setQ(qFromUrl);
  }, [qFromUrl]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (onModelsHub) {
      const next = new URLSearchParams(searchParams);
      if (trimmed) next.set('q', trimmed);
      else next.delete('q');
      setSearchParams(next, { replace: true });
      return;
    }
    navigate(trimmed ? `${defaultPath}?q=${encodeURIComponent(trimmed)}` : defaultPath);
  };

  return (
    <form
      className={`hub-search ${compact ? 'compact' : ''}`}
      role="search"
      onSubmit={submit}
    >
      <Search size={16} className="hub-search-icon" aria-hidden />
      <input
        className="hub-search-input"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label="搜索模型"
      />
      {!compact && (
        <button type="submit" className="btn btn-primary btn-sm hub-search-btn">
          搜索
        </button>
      )}
      {compact && (
        <button type="submit" className="hub-search-submit-icon" aria-label="搜索">
          <Search size={14} />
        </button>
      )}
    </form>
  );
}
