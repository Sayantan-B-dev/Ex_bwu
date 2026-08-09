import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import PrintPlan from "@/components/PrintPlan";
import { getModule, getModuleWeeks } from "@/lib/weeks";

export const dynamic = "force-dynamic";

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module: id } = await params;
  const mod = await getModule(id);
  if (!mod) notFound();

  const weeks = await getModuleWeeks(id);

  return (
    <div className="wrap module-page">
      {mod.status === "soon" ? (
        <header>
          <div className="kicker">BTech 3rd Semester · {mod.name}</div>
          <h1>Coming Soon</h1>
          <p>Weekly reports for this module will appear here once uploaded.</p>
        </header>
      ) : (
        <PrintPlan weeks={weeks} moduleName={mod.name} />
      )}
      <Footer />
    </div>
  );
}