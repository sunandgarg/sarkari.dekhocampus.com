import { Link } from "react-router-dom";
import { SARKARI_NAV } from "./SarkariHeader";

export function SarkariFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="sarkari-footer">
      <div className="sarkari-footer-grid">
        <div>
          <h2>Sarkari DekhoCampus</h2>
          <p>Fast, simple updates for government jobs, results, admit cards, answer keys, admissions and scholarships across India.</p>
        </div>
        <div>
          <h3>Important sections</h3>
          <div className="sarkari-footer-links">
            {SARKARI_NAV.slice(1).map((item) => <Link key={item.label} to={item.href}>{item.label}</Link>)}
          </div>
        </div>
        <div>
          <h3>Important notice</h3>
          <p>This is an independent information portal and is not affiliated with any government organisation. Always verify information on the official authority website.</p>
        </div>
      </div>
      <div className="sarkari-footer-bottom">Copyright © {year} sarkari.dekhocampus.com · Information for reference only</div>
    </footer>
  );
}
