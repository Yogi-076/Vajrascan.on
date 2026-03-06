import { ShieldAlert } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

const data = [
    { subject: 'Injection (SQLi, XSS)', A: 85, fullMark: 100 },
    { subject: 'Broken Auth', A: 45, fullMark: 100 },
    { subject: 'Misconfig', A: 90, fullMark: 100 },
    { subject: 'Insecure Deserialization', A: 30, fullMark: 100 },
    { subject: 'Known Vulns', A: 70, fullMark: 100 },
    { subject: 'Insufficient Logging', A: 60, fullMark: 100 },
];

export const ThreatTopologyChart = () => {
    return (
        <div className="rounded-2xl bg-card/40 border border-white/[0.07] p-4 backdrop-blur-sm relative overflow-hidden h-full flex flex-col">
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

            <div className="mb-2">
                <h2 className="font-bold text-foreground flex items-center gap-2 mb-1 text-sm">
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    Threat Topology Matrix
                </h2>
                <p className="text-[10px] text-muted-foreground">Aggregated vulnerability risk distribution across all scanned assets.</p>
            </div>

            <div className="flex-1 min-h-[160px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                            name="Risk Exposure"
                            dataKey="A"
                            stroke="#ef4444"
                            strokeWidth={2}
                            fill="#ef4444"
                            fillOpacity={0.3}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                            itemStyle={{ color: '#ef4444' }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-2 pt-2 border-t border-white/[0.05] grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-1.5 rounded-lg text-center font-medium">Critical: Misconfig</div>
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-1.5 rounded-lg text-center font-medium">Top Vector: Injection</div>
            </div>
        </div>
    );
};
