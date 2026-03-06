import { motion } from "framer-motion";
import { Shield, Zap, Search, Server, Cpu, Activity, AlertTriangle, ArrowRight } from "lucide-react";

export const VaptFlowchart = () => {
    const nodes = [
        { id: 1, label: "Reconnaissance", icon: Search, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
        { id: 2, label: "Scanning (ZAP)", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
        { id: 3, label: "AI Analysis", icon: Cpu, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30" },
        { id: 4, label: "Auto-Mitigation", icon: Shield, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" }
    ];

    return (
        <div className="rounded-2xl bg-card/40 border border-white/[0.07] p-4 backdrop-blur-sm relative overflow-hidden h-full flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

            <div>
                <h2 className="font-bold text-foreground flex items-center gap-2 mb-1 text-sm">
                    <Activity className="w-4 h-4 text-primary" />
                    VAPT Execution Flow
                </h2>
                <p className="text-[10px] text-muted-foreground mb-4">Real-time pipeline analysis from reconnaissance to mitigation.</p>
            </div>

            <div className="relative flex-1 flex flex-col md:flex-row items-center justify-between w-full p-2 mb-2">
                {/* Animated Connecting Line */}
                <div className="absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-emerald-500/20 hidden md:block">
                    <motion.div
                        className="absolute top-0 left-0 h-full w-24 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 shadow-[0_0_10px_#0ea5e9]"
                        animate={{ left: ["0%", "100%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                </div>

                {nodes.map((node, index) => (
                    <div key={node.id} className="relative z-10 flex flex-col items-center flex-1 h-full min-h-[90px] justify-end group">
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.2, type: "spring", stiffness: 200, damping: 20 }}
                            className={`w-12 h-12 rounded-xl ${node.bg} border ${node.border} flex items-center justify-center mb-2 relative shadow-lg group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-300`}
                        >
                            <node.icon className={`w-5 h-5 ${node.color}`} />

                            {/* Spinning border effect on hover */}
                            <div className="absolute -inset-1 border border-white/0 rounded-xl group-hover:border-primary/50 group-hover:animate-spin-slow transition-all duration-500 pointer-events-none" style={{ animationDuration: '4s' }} />

                            {/* Step Number */}
                            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center text-[10px] font-bold text-slate-300">
                                {node.id}
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (index * 0.2) + 0.3 }}
                            className="text-center"
                        >
                            <h3 className={`font-bold text-sm ${node.color} tracking-tight`}>{node.label}</h3>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                                {['Initialization', 'Deep Scan', 'Processing', 'Secured'][index]}
                            </p>
                        </motion.div>

                        {/* Mobile Arrow (Down) */}
                        {index < nodes.length - 1 && (
                            <div className="md:hidden mt-4 text-white/20">
                                <ArrowRight className="w-5 h-5 rotate-90" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="pt-2 mt-auto border-t border-white/[0.05] grid grid-cols-3 gap-4 text-center">
                <div>
                    <div className="text-lg font-black text-white">4.2s</div>
                    <div className="text-[9px] text-muted-foreground uppercase">Avg Latency</div>
                </div>
                <div>
                    <div className="text-lg font-black text-emerald-400">99.9%</div>
                    <div className="text-[9px] text-muted-foreground uppercase">Uptime Score</div>
                </div>
                <div>
                    <div className="text-lg font-black text-indigo-400">2.1TB</div>
                    <div className="text-[9px] text-muted-foreground uppercase">Data Analyzed</div>
                </div>
            </div>
        </div>
    );
};
