import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Heart, Zap, History } from "lucide-react"

export function DashboardMockup() {
  return (
    <div className="relative group perspective-1000">
      <Card className="w-full h-full bg-white/40 backdrop-blur-md border-white/40 shadow-2xl overflow-hidden rounded-3xl transform transition-all duration-700 group-hover:rotate-y-2 group-hover:scale-[1.02]">
        {/* Header Mockup */}
        <div className="p-6 border-b border-white/20 bg-white/50">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-800">Hello, Sayak!</h3>
              <p className="text-xs text-slate-500">Your family's health overview.</p>
            </div>
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20" />
              <div className="w-8 h-8 rounded-full bg-slate-100" />
            </div>
          </div>
        </div>

        {/* Content Mockup */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/60 p-4 rounded-2xl border border-white/40 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Heart Rate</span>
                </div>
                <div className="text-2xl font-bold text-slate-700">72 BPM</div>
            </div>
            <div className="bg-white/60 p-4 rounded-2xl border border-white/40 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Steps</span>
                </div>
                <div className="text-2xl font-bold text-slate-700">8,542</div>
            </div>
          </div>

          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold text-primary">AI Diagnostic Analysis</span>
              </div>
              <Badge variant="outline" className="bg-white text-[10px] py-0">High Confidence</Badge>
            </div>
            <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[83%] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            </div>
            <p className="text-[11px] text-slate-600 mt-3 italic">
              "Symptoms suggest potential hypertension. Please monitor BP closely."
            </p>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <div className="flex-1 h-[1px] bg-slate-100" />
            <Zap className="w-3 h-3" />
            <div className="flex-1 h-[1px] bg-slate-100" />
          </div>

          <div className="space-y-3">
             <div className="flex items-center justify-between opacity-60">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                        <History className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-[11px] font-medium text-slate-500">Chest Pain History</div>
                 </div>
                 <div className="text-[10px] text-slate-400 font-mono">2 DAYS AGO</div>
             </div>
             <div className="flex items-center justify-between opacity-40">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                        <History className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-[11px] font-medium text-slate-500">Fatigue Report</div>
                 </div>
                 <div className="text-[10px] text-slate-400 font-mono">5 DAYS AGO</div>
             </div>
          </div>
        </div>
      </Card>

      {/* Decorative Floating Elements */}
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
    </div>
  )
}
