import { FlightPlanTable } from "@/components/FlightPlanTable";
import { SovereigntyChart } from "@/components/SovereigntyChart";
import { Stage1Checklist } from "@/components/Stage1Checklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ShieldCheck, Target, TrendingUp } from "lucide-react";
import generatedTexture from "@assets/generated_images/subtle_dark_technical_grid_pattern_texture.png";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans selection:bg-amber-500/30">
      {/* Background Texture Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0 mix-blend-overlay"
        style={{ backgroundImage: `url(${generatedTexture})`, backgroundSize: 'cover' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto p-6 md:p-8 lg:p-12 space-y-8">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-8">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-mono font-bold tracking-tighter text-foreground">
              LANTERN
            </h1>
            <p className="text-muted-foreground font-mono uppercase tracking-widest text-sm">
              Sovereignty Navigation System v1.0
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-xs font-mono text-muted-foreground uppercase">Current Phase</div>
            <div className="text-xl font-bold text-amber-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              COLD BUILD (Y1)
            </div>
          </div>
        </header>

        {/* Top Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            label="MVSR Target" 
            value="$184,000" 
            subValue="Min. Viable Sovereignty Revenue"
            icon={<Target className="w-4 h-4 text-muted-foreground" />}
          />
          <MetricCard 
            label="Current Revenue" 
            value="$30,000" 
            subValue="Year 1 Projection"
            icon={<TrendingUp className="w-4 h-4 text-amber-500" />}
          />
          <MetricCard 
            label="Safety Net" 
            value="$15,000" 
            subValue="Post-Tax Liquid"
            icon={<ShieldCheck className="w-4 h-4 text-emerald-500" />}
          />
          <MetricCard 
            label="Home Goal" 
            value="Year 5" 
            subValue="$200k Down Payment"
            icon={<ArrowUpRight className="w-4 h-4 text-muted-foreground" />}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[500px]">
          <div className="lg:col-span-2 h-full">
            <SovereigntyChart />
          </div>
          <div className="lg:col-span-1 h-full">
            <Stage1Checklist />
          </div>
        </div>

        {/* Data Table */}
        <div className="w-full">
          <FlightPlanTable />
        </div>

        {/* Footer / Manifesto Quote */}
        <footer className="pt-12 pb-6 text-center border-t border-border mt-12">
          <p className="font-mono text-xs text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            "By anchoring to the home, we have turned a five-year window into a series of achievable, math-driven waypoints."
          </p>
        </footer>
      </div>
    </div>
  );
}

function MetricCard({ label, value, subValue, icon }: { label: string, value: string, subValue: string, icon: React.ReactNode }) {
  return (
    <Card className="bg-card/50 border-border backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono tracking-tight">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
      </CardContent>
    </Card>
  );
}
