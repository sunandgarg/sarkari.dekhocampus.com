import { Menu, Search, X } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { lazyRetry } from "@/lib/lazyRetry";

const SarkariSearchDialog = lazyRetry(
  () => import("@/components/sarkari/SarkariSearchDialog").then((module) => ({ default: module.SarkariSearchDialog })),
  "SarkariSearchDialog",
);

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
  const location = useLocation();

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable = target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName || "");
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((current) => !current);
      } else if (event.key === "/" && !isEditable && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  const isCurrent = (href: string) => {
    if (href === "/") return location.pathname === "/" && !location.search;
    return `${location.pathname}${location.search}` === href;
  };

  return (
    <>
      <header className="sarkari-header">
        <div className="sarkari-header-inner">
          <Link to="/" className="sarkari-brand" aria-label="Sarkari DekhoCampus home">
            <span className="sarkari-emblem" aria-hidden="true">SD</span>
            <span className="sarkari-wordmark"><strong>Sarkari<span>DekhoCampus</span></strong><small>UPDATES &amp; ALERTS</small></span>
          </Link>
          <div className="sarkari-nav-bar">
            <nav id="sarkari-primary-nav" className={menuOpen ? "is-open" : ""} aria-label="Primary navigation">
              {SARKARI_NAV.map((item) => <Link key={item.label} to={item.href} className={isCurrent(item.href) ? "is-active" : undefined} aria-current={isCurrent(item.href) ? "page" : undefined} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}
            </nav>
            <button type="button" className="sarkari-search-button" onClick={() => { setSearchOpen(true); setMenuOpen(false); }} aria-label="Search updates (Command K)" aria-expanded={searchOpen} aria-haspopup="dialog"><Search aria-hidden="true" /></button>
            <button type="button" className="sarkari-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle menu" aria-expanded={menuOpen} aria-controls="sarkari-primary-nav">
              {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>
      {searchOpen && <Suspense fallback={null}><SarkariSearchDialog open onOpenChange={setSearchOpen} /></Suspense>}
    </>
  );
}
