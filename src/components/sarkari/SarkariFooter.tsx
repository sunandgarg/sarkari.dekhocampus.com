import { Link } from "react-router-dom";
import { SARKARI_NAV } from "./SarkariHeader";
import { SITE_CONFIG } from "@/lib/constant";
import { openCookieSettings } from "@/lib/promptSequence";

declare const __APP_BUILD_YEAR__: number;

export function SarkariFooter() {
  return (
    <footer className="sarkari-footer">
      <div className="sarkari-footer-grid">
        <div>
          <h2 className="sarkari-footer-brand">
            <img src={SITE_CONFIG.footerWordmarkPath} alt="DekhoCampus" width="308" height="102" loading="lazy" decoding="async" />
            <span>Sarkari updates</span>
          </h2>
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
      <div className="sarkari-footer-bottom">
        <span>Copyright © {__APP_BUILD_YEAR__} sarkari.dekhocampus.com · Information for reference only</span>
        <button type="button" onClick={openCookieSettings}>Cookie settings</button>
      </div>
    </footer>
  );
}
