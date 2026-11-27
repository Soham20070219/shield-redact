import { Check, Copy, Download, FileJson } from 'lucide-react';
import type { PIICategory, RedactionMode, SanitizationResult } from '../utils/piiEngine';

interface ExportControlsProps {
  result: SanitizationResult;
  mode: RedactionMode;
  enabledCategories: Record<PIICategory, boolean>;
  uploadedFileName: string | null;
  copied: boolean;
  onCopy: () => void;
}

function triggerClientDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function ExportControls({
  result,
  mode,
  enabledCategories,
  uploadedFileName,
  copied,
  onCopy,
}: ExportControlsProps) {
  const hasContent = result.originalText.length > 0;

  const handleDownloadSanitized = () => {
    if (!hasContent) return;

    const outputFileName = uploadedFileName
      ? `sanitized_${uploadedFileName}`
      : 'sanitized_output.txt';
    const isCsv = outputFileName.toLowerCase().endsWith('.csv');
    const mimeType = isCsv ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';

    triggerClientDownload(result.sanitizedText, outputFileName, mimeType);
  };

  const handleDownloadAuditJson = () => {
    if (!hasContent) return;

    // Strictly omit raw PII values or original text so the audit report never leaks secrets
    const auditPayload = {
      tool: 'ShieldRedact',
      executionEnvironment: '100% Client-Side Browser Engine',
      generatedAt: new Date().toISOString(),
      sourceFileName: uploadedFileName ?? 'pasted_input.txt',
      redactionMode: mode,
      enabledDetectors: Object.entries(enabledCategories)
        .filter(([, enabled]) => enabled)
        .map(([category]) => category),
      processingTimeMs: result.durationMs,
      inputMetrics: {
        originalCharacterCount: result.originalText.length,
        sanitizedCharacterCount: result.sanitizedText.length,
        lineCount: result.originalText.split(/\r\n|\r|\n/).length,
      },
      summary: {
        totalDetections: result.totalDetections,
        countsByCategory: result.countsByCategory,
      },
      pseudonymTokensIssued:
        mode === 'pseudonym'
          ? result.pseudonymMap.map((entry) => ({
              token: entry.token,
              category: entry.type,
              occurrences: entry.occurrences,
            }))
          : undefined,
    };

    const jsonName = uploadedFileName
      ? `audit_report_${uploadedFileName.replace(/\.(txt|csv)$/i, '')}.json`
      : 'shieldredact_audit_report.json';

    triggerClientDownload(
      JSON.stringify(auditPayload, null, 2),
      jsonName,
      'application/json;charset=utf-8'
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        disabled={!hasContent}
        onClick={onCopy}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-100 transition hover:border-slate-600 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-emerald-300">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5 text-slate-300" />
            <span>Copy Sanitized Text</span>
          </>
        )}
      </button>

      <button
        type="button"
        disabled={!hasContent}
        onClick={handleDownloadSanitized}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-3.5 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Download className="h-3.5 w-3.5 text-cyan-300" />
        <span>
          Download {uploadedFileName ? `sanitized_${uploadedFileName}` : 'Sanitized File'}
        </span>
      </button>

      <button
        type="button"
        disabled={!hasContent}
        onClick={handleDownloadAuditJson}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700/90 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FileJson className="h-3.5 w-3.5 text-purple-400" />
        <span>Download Audit Report (.json)</span>
      </button>
    </div>
  );
}
