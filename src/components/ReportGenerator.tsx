import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Download, Shield, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Config } from "@/config";

interface ReportGeneratorProps {
    projectId: string;
    projectTitle: string;
    currentVersion?: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function ReportGenerator({ projectId, projectTitle, currentVersion = 0, open, onOpenChange, onSuccess }: ReportGeneratorProps) {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [generatedFilename, setGeneratedFilename] = useState<string | null>(null);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

    const nextVersion = currentVersion + 1;
    const versionLabel = `v${nextVersion}.0`;

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGeneratedFilename(null);
        setDownloadUrl(null);
        try {
            const token = localStorage.getItem('vmt_token');
            const res = await fetch(`${Config.API_URL}/api/reports/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ projectId })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to generate report");
            }

            const data = await res.json();
            setGeneratedFilename(data.filename);
            setDownloadUrl(data.downloadUrl);

            toast({
                title: `✅ Report Ready — ${versionLabel}`,
                description: `VAPT report for "${projectTitle}" generated successfully.`
            });
            onSuccess();

        } catch (e: any) {
            toast({
                variant: "destructive",
                title: "Generation Failed",
                description: e.message || "Could not generate report. Try again."
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!generatedFilename) return;
        setIsDownloading(true);
        setTimeout(() => setIsDownloading(false), 2000); // UI reset
    };

    const handleClose = () => {
        setGeneratedFilename(null);
        setDownloadUrl(null);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[440px] border-indigo-500/20 bg-black/95 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-indigo-100">
                        <FileText className="w-5 h-5 text-indigo-400" />
                        Generate VAPT Report
                        <span className="ml-auto text-xs font-mono bg-indigo-600/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">{versionLabel}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="py-6 flex flex-col items-center gap-5">
                    {!generatedFilename ? (
                        <>
                            <div className="w-16 h-16 rounded-full bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center">
                                <FileText className="w-8 h-8 text-indigo-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-slate-200">{projectTitle}</p>
                                <p className="text-xs text-slate-500 mt-1">Click below to compile and generate a premium PDF security report.</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 rounded-full bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-emerald-200">Report Ready!</p>
                                <p className="text-xs font-mono text-slate-500 mt-1 bg-black/40 px-3 py-1 rounded border border-white/5">{generatedFilename}</p>
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter className="gap-2 border-t border-white/5 pt-4">
                    <Button variant="ghost" onClick={handleClose} className="text-slate-400 hover:text-white">
                        Close
                    </Button>

                    {!generatedFilename ? (
                        <Button
                            disabled={isGenerating}
                            onClick={handleGenerate}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 flex-1"
                        >
                            {isGenerating
                                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Compiling PDF...</>
                                : <><FileText className="w-4 h-4 mr-2" /> Generate Report</>
                            }
                        </Button>
                    ) : (
                        <a
                            href={`${Config.API_URL}/api/projects/${projectId}/reports/${encodeURIComponent(generatedFilename)}`}
                            download={generatedFilename}
                            className="flex-1 w-full"
                            onClick={handleDownload}
                        >
                            <Button
                                disabled={isDownloading}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                            >
                                {isDownloading
                                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Downloading...</>
                                    : <><Download className="w-4 h-4 mr-2" /> Download PDF</>
                                }
                            </Button>
                        </a>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
