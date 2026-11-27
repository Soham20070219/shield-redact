import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { FileText, Sparkles, Trash2, Upload } from 'lucide-react';

interface InputWorkspaceProps {
  rawText: string;
  fileName: string | null;
  onTextChange: (nextText: string) => void;
  onFileLoaded: (content: string, name: string) => void;
  onLoadSample: () => void;
  onClear: () => void;
  onError: (message: string) => void;
}

const ACCEPTED_EXTENSIONS = ['.txt', '.csv'];

export function InputWorkspace({
  rawText,
  fileName,
  onTextChange,
  onFileLoaded,
  onLoadSample,
  onClear,
  onError,
}: InputWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const readFile = (file: File) => {
    const lowerName = file.name.toLowerCase();
    const isSupported = ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

    if (!isSupported) {
      onError('Unsupported file type. Please upload a .txt or .csv file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      onFileLoaded(content, file.name);
    };
    reader.onerror = () => {
      onError('Failed to read the selected file in browser memory.');
    };
    reader.readAsText(file);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      readFile(file);
    }
    event.target.value = '';
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const lineCount = rawText ? rawText.split(/\r\n|\r|\n/).length : 0;

  return (
    <section
      aria-label="Raw input workspace"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-xl border transition-all ${
        isDragging
          ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_24px_-6px_rgba(34,211,238,0.4)]'
          : 'border-slate-800/90 bg-slate-900/60'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-sm font-semibold text-slate-100">Source Data Input</h2>
          {fileName && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-300">
              <FileText className="h-3.5 w-3.5" />
              {fileName}
            </span>
          )}
          <span className="font-mono text-xs text-slate-500">
            {rawText.length.toLocaleString()} chars · {lineCount} lines
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
          >
            <Upload className="h-3.5 w-3.5 text-cyan-400" />
            Upload .txt / .csv
          </button>

          <button
            type="button"
            onClick={onLoadSample}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            Load Sample Noisy Data
          </button>

          {rawText.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:border-rose-500/40 hover:text-rose-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="p-3">
        <textarea
          value={rawText}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Paste raw support tickets, clinical notes, CSV rows, or server logs here — or drag & drop a .txt / .csv file. Everything stays strictly inside your browser."
          rows={6}
          spellCheck={false}
          className="custom-scrollbar w-full resize-y rounded-lg border border-slate-800 bg-slate-950/90 p-3 font-mono text-xs leading-relaxed text-slate-200 placeholder-slate-500 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
        />
      </div>

      {isDragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/85 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-cyan-400/70 bg-cyan-500/10 px-8 py-6 text-cyan-200">
            <Upload className="h-7 w-7 text-cyan-300" />
            <p className="text-sm font-semibold">Drop .txt or .csv file to sanitize locally</p>
          </div>
        </div>
      )}
    </section>
  );
}
