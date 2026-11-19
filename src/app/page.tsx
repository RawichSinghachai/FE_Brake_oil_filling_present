import { TopBar } from '@/components/layout/TopBar';
import { KpiRow } from '@/components/layout/KpiRow';
import { MachineCard } from '@/components/machine/MachineCard';
import { ReconstructionPanel } from '@/components/reconstruction/ReconstructionPanel';
import { NgByPgnumCard } from '@/components/charts/NgByPgnumChart';
import { HistoryTable } from '@/components/history/HistoryTable';

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-[1320px] px-5 pb-[60px] pt-[18px]">
      <TopBar />
      <KpiRow />

      <div className="mb-4 grid gap-4 max-[980px]:grid-cols-1 min-[981px]:grid-cols-2">
        <MachineCard side="LH" />
        <MachineCard side="RH" />
      </div>

      <ReconstructionPanel />

      <NgByPgnumCard />

      <HistoryTable />
    </main>
  );
}
