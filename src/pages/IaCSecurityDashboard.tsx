import React, { useState, useEffect } from 'react';
import { Play, ShieldAlert, AlertTriangle, Info, Shield, CheckCircle, XCircle, Terminal, RefreshCw, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SEVERITY_COLORS: Record<string, string> = {
    CRITICAL: 'bg-red-500 border-red-500/50 text-red-400',
    HIGH: 'bg-orange-500 border-orange-500/50 text-orange-400',
    MEDIUM: 'bg-yellow-500 border-yellow-500/50 text-yellow-400',
    LOW: 'bg-green-500 border-green-500/50 text-green-400',
    INFO: 'bg-blue-500 border-blue-500/50 text-blue-400'
};

const TOOL_COLORS: Record<string, string> = {
    checkov: 'bg-[#f59e0b]',
    terrascan: 'bg-[#6366f1]',
    tfsec: 'bg-[#10b981]',
    trivy: 'bg-[#3b82f6]',
    kics: 'bg-[#ec4899]'
};

export default function IaCSecurityDashboard() {
    const [url, setUrl] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [report, setReport] = useState<any>(null);
    const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
    const [filterTool, setFilterTool] = useState<string | null>(null);
    const [dependencies, setDependencies] = useState<Record<string, boolean>>({});
    const [isCheckingDeps, setIsCheckingDeps] = useState(false);

    useEffect(() => {
        checkDependencies();
    }, []);

    const checkDependencies = async () => {
        setIsCheckingDeps(true);
        try {
            const res = await fetch('/api/tools/iac-check-deps', { method: 'POST' });
            const data = await res.json();
            setDependencies(data);
        } catch (e) {
            console.error('Failed to check dependencies', e);
        } finally {
            setIsCheckingDeps(false);
        }
    };

    const command = url
        ? `python arsenal-core/main.py --phases 5 --url ${url}`
        : `python arsenal-core/main.py --phases 5 --local .`;

    const runScan = async () => {
        if (isScanning) return;

        setIsScanning(true);
        setReport(null);
        setFilterSeverity(null);
        setFilterTool(null);
        setLogs(['> Connecting to VAPT Arsenal Cloud...', `> Target: ${url || 'Local Workspace'}`, `> Command: ${command}`]);

        try {
            const response = await fetch('/api/tools/iac-pipeline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            if (!response.body) throw new Error('No response body');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const msg = JSON.parse(line);
                        if (msg.type === 'log') {
                            setLogs(prev => [...prev.slice(-100), `> ${msg.data}`]);
                        } else if (msg.type === 'done') {
                            if (msg.report) {
                                setReport(msg.report);
                            }
                            setIsScanning(false);
                            if (msg.code !== 0 && !msg.report) {
                                setLogs(prev => [...prev, `❌ Process exited with code ${msg.code}`]);
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing NDJSON line:', e);
                    }
                }
            }
        } catch (error: any) {
            setLogs(prev => [...prev, `❌ Connection Error: ${error.message}`]);
            setIsScanning(false);
        }
    };

    const getFilteredIssues = () => {
        if (!report || !report.issues) return [];
        return report.issues.filter((issue: any) => {
            if (filterSeverity && issue.severity !== filterSeverity) return false;
            if (filterTool && issue.tool !== filterTool) return false;
            return true;
        });
    };

    const missingTools = Object.entries(dependencies).filter(([_, installed]) => !installed).map(([name]) => name);
    const hasTools = Object.values(dependencies).some(v => v);

    return (
        <div className="bg-[#080c14]/50 border border-white/5 rounded-xl text-slate-300 font-mono p-4">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center space-x-3"
                    >
                        <ShieldAlert className="w-8 h-8 text-indigo-400" />
                        <h1 className="text-2xl font-bold text-white tracking-wider">IaC Security <span className="text-indigo-500">Pipeline</span></h1>
                    </motion.div>

                    <button
                        onClick={checkDependencies}
                        disabled={isCheckingDeps}
                        className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-colors"
                    >
                        <RefreshCw className={`w-3 h-3 ${isCheckingDeps ? 'animate-spin' : ''}`} />
                        <span>Check Dependencies</span>
                    </button>
                </div>

                {/* Dependency Warning */}
                {!isCheckingDeps && !hasTools && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start space-x-3"
                    >
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                        <div>
                            <div className="text-red-400 font-bold text-sm">ENVIRONMENT NOT CONFIGURED</div>
                            <div className="text-red-400/70 text-xs mt-1 leading-relaxed">
                                No security scanners were detected on this system. You need to install Checkov, Trivy, or other tools to perform real scans. Click "Check Dependencies" to refresh.
                            </div>
                            <div className="flex space-x-3 mt-3">
                                <a href="https://www.checkov.io/1.Welcome/Quick%20Start.html" target="_blank" className="text-[10px] font-black uppercase tracking-widest bg-red-500/20 hover:bg-red-500/30 text-red-400 py-1 px-3 rounded border border-red-500/30 transition-all">Install Checkov</a>
                                <a href="https://aquasecurity.github.io/trivy/latest/getting-started/installation/" target="_blank" className="text-[10px] font-black uppercase tracking-widest bg-red-500/20 hover:bg-red-500/30 text-red-400 py-1 px-3 rounded border border-red-500/30 transition-all">Install Trivy</a>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Action Bar */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#101827] border border-slate-800 rounded-lg p-6 shadow-2xl space-y-4"
                >
                    <div className="flex space-x-4">
                        <input
                            type="text"
                            placeholder="https://github.com/org/repo (leave empty for local scan)"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="flex-1 bg-[#080c14] border border-slate-700 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-200"
                        />
                        <button
                            onClick={runScan}
                            disabled={isScanning || (!url && !hasTools)}
                            className={`flex items-center space-x-2 px-6 py-3 rounded-md font-semibold transition-all ${isScanning || (!url && !hasTools) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'}`}
                        >
                            {isScanning ? <Terminal className="w-5 h-5 animate-pulse" /> : <Play className="w-5 h-5" />}
                            <span>{isScanning ? 'Scanning...' : 'Scan'}</span>
                        </button>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="text-xs text-slate-500 font-medium font-mono">
                            <span className="text-indigo-400"># Command:</span> {command}
                        </div>
                        <div className="flex space-x-4">
                            {Object.entries(dependencies).map(([tool, installed]) => (
                                <div key={tool} className={`flex items-center space-x-1.5 text-[9px] font-bold uppercase tracking-tighter ${installed ? 'text-green-500' : 'text-slate-600'}`}>
                                    <div className={`w-1 h-1 rounded-full ${installed ? 'bg-green-500' : 'bg-slate-700'}`}></div>
                                    <span>{tool}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Terminal Window */}
                <AnimatePresence>
                    {isScanning && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-[#0f141f] border border-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed max-h-64 overflow-y-auto shadow-2xl overflow-hidden"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-slate-500 text-[10px] uppercase tracking-widest">Active Scan Process</span>
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                                    <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                                    <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                                </div>
                            </div>
                            {logs.map((log, i) => (
                                <div key={i} className={`${log.includes('Found') ? 'text-orange-400' : log.includes('❌') ? 'text-red-400' : 'text-slate-400'}`}>
                                    {log}
                                </div>
                            ))}
                            <div className="animate-pulse inline-block w-2 h-4 bg-indigo-500 mt-2"></div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Results Dashboard */}
                {report && !isScanning && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {/* Status Banner */}
                        <div className={`flex items-center justify-between p-4 rounded-lg border ${report.status === 'failed' ? 'bg-yellow-900/10 border-yellow-900/40 text-yellow-500' : report.severity_summary.CRITICAL > 0 || report.severity_summary.HIGH > 0 ? 'bg-red-900/10 border-red-900/40 text-red-500' : 'bg-green-900/10 border-green-900/40 text-green-500'}`}>
                            <div className="flex items-center space-x-3">
                                {report.status === 'failed' ? <AlertTriangle className="w-6 h-6" /> : report.severity_summary.CRITICAL > 0 || report.severity_summary.HIGH > 0 ? <XCircle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                                <span className="font-semibold text-lg tracking-tight">
                                    {report.status === 'failed' ? 'PIPELINE FAILED — NO SCANNERS AVAILABLE' : report.severity_summary.CRITICAL > 0 || report.severity_summary.HIGH > 0 ? `PIPELINE FAILED — ${report.severity_summary.CRITICAL + report.severity_summary.HIGH} HIGH SEVERITY VULNERABILITIES` : `PIPELINE PASSED`}
                                </span>
                            </div>
                            <div className="text-xs uppercase tracking-widest opacity-60">Verified {new Date().toLocaleTimeString()}</div>
                        </div>

                        {/* Severity Cards */}
                        <div className="grid grid-cols-5 gap-4">
                            {Object.entries(report.severity_summary).map(([severity, count]: [string, any]) => (
                                <div
                                    key={severity}
                                    onClick={() => setFilterSeverity(filterSeverity === severity ? null : severity)}
                                    className={`p-4 rounded-lg border bg-[#101827] cursor-pointer transition-all hover:-translate-y-1 ${filterSeverity === severity ? `ring-2 ring-indigo-500 border-indigo-500/50` : 'border-slate-800'}`}
                                >
                                    <div className={`text-[10px] font-bold mb-2 uppercase tracking-widest flex items-center space-x-2 ${SEVERITY_COLORS[severity]?.split(' ')[2]}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${SEVERITY_COLORS[severity]?.split(' ')[0]}`}></div>
                                        <span>{severity}</span>
                                    </div>
                                    <div className="text-3xl font-black text-white">{count}</div>
                                </div>
                            ))}
                        </div>

                        {/* Tool Filter Pills */}
                        <div className="flex flex-wrap gap-2">
                            {(report.tools_run || []).map((tool: string) => {
                                const toolIssues = report.issues.filter((i: any) => i.tool === tool).length;
                                return (
                                    <button
                                        key={tool}
                                        onClick={() => setFilterTool(filterTool === tool ? null : tool)}
                                        className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold border transition-all ${filterTool === tool ? `${TOOL_COLORS[tool]} bg-opacity-20 text-white border-transparent ring-1 ring-offset-2 ring-offset-[#080c14] ring-indigo-500` : 'border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'}`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${TOOL_COLORS[tool]}`}></div>
                                        <span className="capitalize">{tool}</span>
                                        <span className="bg-slate-800/50 px-2 py-0.5 rounded text-[10px] ml-1">{toolIssues}</span>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Findings Table */}
                        <div className="bg-[#101827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-slate-500 bg-[#172133] border-b border-slate-800 uppercase tracking-[0.2em]">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">Severity</th>
                                        <th className="px-6 py-4 font-bold">Finding</th>
                                        <th className="px-6 py-4 font-bold">Scanner / Rule</th>
                                        <th className="px-6 py-4 font-bold">Location</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {getFilteredIssues().map((issue: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-[#1a2333]/50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-[9px] uppercase font-black tracking-[0.15em] rounded-sm border ${SEVERITY_COLORS[issue.severity]?.split(' ').slice(1).join(' ')} bg-opacity-5`}>
                                                    {issue.severity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-200 font-bold group-hover:text-indigo-400 transition-colors">{issue.title}</div>
                                                <div className="text-[10px] text-slate-500 mt-1 flex items-center opacity-70">
                                                    <Shield className="w-3 h-3 mr-1 text-slate-600" /> Resource: {issue.resource}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center space-x-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${TOOL_COLORS[issue.tool]}`}></span>
                                                    <span className="capitalize text-slate-400 text-xs font-bold">{issue.tool}</span>
                                                </div>
                                                <div className="text-[9px] text-indigo-500/70 mt-1 font-mono">{issue.rule_id}</div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-[11px]">
                                                <span className="text-slate-400 hover:text-indigo-400 cursor-pointer">{issue.file}</span>
                                                <span className="text-indigo-500 font-bold ml-1">:{issue.line}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {getFilteredIssues().length === 0 && (
                                <div className="px-6 py-16 text-center text-slate-600 italic">
                                    {report.status === 'failed' ? 'Scan skipped or aborted due to missing dependencies.' : 'No issues found matching the current visibility filters.'}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-[#101827] border border-slate-800 rounded-lg p-6 space-y-3">
                                <h3 className="text-white font-bold text-xs uppercase tracking-widest flex items-center">
                                    <Info className="w-4 h-4 mr-2 text-indigo-500" /> Scanner Statistics
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs py-1 border-b border-slate-800/50">
                                        <span className="text-slate-500">Tools Executed</span>
                                        <span className={`font-bold ${report.tools_run?.length > 0 ? 'text-green-400' : 'text-red-400'}`}>{report.tools_run?.length || 0} / 5</span>
                                    </div>
                                    <div className="flex justify-between text-xs py-1 border-b border-slate-800/50">
                                        <span className="text-slate-500">Tools Skipped</span>
                                        <span className="text-slate-300 font-bold">{report.tools_skipped?.length || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-xs py-1">
                                        <span className="text-slate-500">Pipeline Performance</span>
                                        <span className="text-green-500 font-bold">READY</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-lg p-6 flex flex-col justify-center">
                                <h3 className="text-indigo-400 font-bold text-xs uppercase tracking-widest mb-3">Professional Integration</h3>
                                <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest py-3 px-4 rounded transition-all">
                                    Export Security Compliance Report
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
