import { ArrowLeft, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { SarkariFooter } from "@/components/sarkari/SarkariFooter";
import { SarkariHeader } from "@/components/sarkari/SarkariHeader";

export default function SarkariNotFound() {
  const { pathname } = useLocation();

  return (
    <div className="sarkari-site">
      <SEO
        title="Page not found | Sarkari DekhoCampus"
        description="This Sarkari DekhoCampus page could not be found. Search the latest government jobs, results and admit cards."
        canonical={pathname}
        noIndex
      />
      <a className="sarkari-skip-link" href="#content">Skip to main content</a>
      <SarkariHeader />
      <main className="sarkari-not-found" id="content">
        <div>
          <span>404</span>
          <h1>This update is not available</h1>
          <p>The link may be old or the page may have moved. Start from the latest verified updates instead.</p>
          <nav aria-label="Page not found actions">
            <Link to="/"><ArrowLeft aria-hidden="true" /> Back to latest updates</Link>
            <Link to="/?q=government+jobs"><Search aria-hidden="true" /> Search government jobs</Link>
          </nav>
        </div>
      </main>
      <SarkariFooter />
    </div>
  );
}
