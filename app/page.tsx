import Link from "next/link";
import Footer from "@/components/Footer";
import { getModules } from "@/lib/weeks";

export const dynamic = "force-dynamic";

export default async function Home() {
  const modules = await getModules();

  return (
    <div className="wrap">
      <header>
        <div className="kicker">BTech 3rd Semester · Lab Projects</div>
        <h1>Modules</h1>
        <p>Weekly reports, print plans and lab work for this semester. Each module below is self-contained.</p>
      </header>

      <main className="grid">
        {modules.map((m) => {
          const ready = m.status === "ready";
          return (
            <div key={m.id} className={ready ? "module-card" : "module-card coming"}>
              <div className="module-top">
                <span className="module-title">{m.name}</span>
                <span className="module-badge">{ready ? "Ready" : "Soon"}</span>
              </div>
              <p className="module-desc">{m.tagline || "Coming soon."}</p>
              {m.meta.stats.length > 0 && (
                <div className="module-stats">
                  {m.meta.stats.map((s) => (
                    <span key={s} className="stat-chip">{s}</span>
                  ))}
                </div>
              )}
              {m.meta.features.length > 0 && (
                <ul className="module-features">
                  {m.meta.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
              {ready ? (
                <Link className="enter-btn" href={`/modules/${m.id}`}>See Contents</Link>
              ) : (
                <span className="enter-btn disabled">See Contents</span>
              )}
            </div>
          );
        })}
      </main>

      <Footer />
    </div>
  );
}