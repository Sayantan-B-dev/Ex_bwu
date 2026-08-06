import Link from "next/link";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="wrap">
      <header>
        <div className="kicker">BTech 3rd Semester · Lab Projects</div>
        <h1>Modules</h1>
        <p>Weekly reports, print plans and lab work for this semester. Each module below is self-contained.</p>
      </header>

      <main className="grid">
        <div className="module-card">
          <div className="module-top">
            <span className="module-title">Python Lab</span>
            <span className="module-badge">Ready</span>
          </div>
          <p className="module-desc">Weekly Reports - Print Plan. Page-by-page print/handwrite breakdown for the final report.</p>
          <div className="module-stats">
            <span className="stat-chip">4 Weekly Reports</span>
            <span className="stat-chip">30 Pages</span>
            <span className="stat-chip">Print · Handwrite</span>
          </div>
          <ul className="module-features">
            <li>Page chips - open any page PDF in a new tab</li>
            <li>Open Full PDF link per report</li>
            <li>Merge print pages into a single PDF download</li>
            <li>Access all files as DOCX</li>
          </ul>
          <Link className="enter-btn" href="/modules/python">See Contents</Link>
        </div>

        <div className="module-card coming">
          <div className="module-top">
            <span className="module-title">DBMS</span>
            <span className="module-badge">Soon</span>
          </div>
          <p className="module-desc">Coming soon.</p>
          <span className="enter-btn disabled">See Contents</span>
        </div>

        <div className="module-card coming">
          <div className="module-top">
            <span className="module-title">COA</span>
            <span className="module-badge">Soon</span>
          </div>
          <p className="module-desc">Coming soon.</p>
          <span className="enter-btn disabled">See Contents</span>
        </div>
      </main>

      <Footer />
    </div>
  );
}
