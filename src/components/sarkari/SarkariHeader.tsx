import { Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export const SARKARI_NAV = [
  { label: "Home", href: "/" },
  { label: "Govt Jobs", href: "/?category=Latest%20Jobs" },
  { label: "Results", href: "/?category=Results" },
  { label: "Answer Keys", href: "/?category=Answer%20Key" },
  { label: "Admit Cards", href: "/?category=Admit%20Card" },
  { label: "Walk-in", href: "/?q=walk-in" },
  { label: "Admissions", href: "/?category=Admissions" },
];

export function SarkariHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const isCurrent = (href: string) => {
    if (href === "/") return location.pathname === "/" && !location.search;
    return `${location.pathname}${location.search}` === href;
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/?q=${encodeURIComponent(value)}` : "/");
    setMenuOpen(false);
  };

  return (
    <header className="sarkari-header">
      <div className="sarkari-header-inner">
        <Link to="/" className="sarkari-brand" aria-label="Sarkari DekhoCampus home">
          <span className="sarkari-emblem" aria-hidden="true">SD</span>
          <span className="sarkari-wordmark"><strong>Sarkari<span>DekhoCampus</span></strong><small>UPDATES &amp; ALERTS</small></span>
        </Link>
        <div className="sarkari-nav-bar">
          <nav className={menuOpen ? "is-open" : ""} aria-label="Primary navigation">
            {SARKARI_NAV.map((item) => <Link key={item.label} to={item.href} className={isCurrent(item.href) ? "is-active" : undefined} aria-current={isCurrent(item.href) ? "page" : undefined} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}
          </nav>
          <button type="button" className="sarkari-search-button" onClick={() => { setSearchOpen((value) => !value); setMenuOpen(false); }} aria-label="Search updates" aria-expanded={searchOpen} aria-controls="sarkari-header-search"><Search /></button>
          <button type="button" className="sarkari-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle menu" aria-expanded={menuOpen}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <form className="sarkari-header-search" id="sarkari-header-search" onSubmit={submit}>
          <Search aria-hidden="true" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search jobs, results, admit cards..." aria-label="Search updates" />
          <button type="submit">Find update</button>
        </form>
      )}
    </header>
  );
}
