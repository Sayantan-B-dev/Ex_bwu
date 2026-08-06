import { getWeeks } from "@/lib/weeks";
import PrintPlan from "@/components/PrintPlan";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function PythonModulePage() {
  const weeks = await getWeeks();
  return (
    <div className="wrap module-page">
      <PrintPlan weeks={weeks} />
      <Footer />
    </div>
  );
}
