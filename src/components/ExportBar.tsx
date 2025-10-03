import { Save, Download, FileSpreadsheet, Home, Loader2, Undo, Redo, Type, Bold, Italic, Underline, AlignLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

interface ExportBarProps {
  onExportSqlite: () => void;
  onExportSql: () => void;
  onClose: () => void;
  exporting: boolean;
  progress: number;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

function ExportBar({
  onExportSqlite,
  onExportSql,
  onClose,
  exporting,
  progress,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: ExportBarProps) {
  return (
    <div className="border-b bg-card shadow-sm">
      {/* Excel-like Ribbon Header */}
      <div className="px-3 py-1 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-2">
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-1 rounded">
              <FileSpreadsheet className="h-3.5 w-3.5 text-white" />
            </div>
            <h1 className="text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Keste
            </h1>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Button variant="ghost" size="sm" className="h-7 px-3 text-xs" onClick={onClose}>
              <Home className="h-3 w-3 mr-1" />
              Home
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onExportSqlite}
            disabled={exporting}
            variant="ghost"
            size="sm"
            className="h-7 px-3 text-xs"
          >
            {exporting ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Save className="h-3 w-3 mr-1" />
            )}
            Save
          </Button>
          <Button
            onClick={onExportSql}
            disabled={exporting}
            variant="ghost"
            size="sm"
            className="h-7 px-3 text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Excel-like Ribbon Toolbar */}
      <div className="px-3 py-2 flex items-center gap-4">
        {/* Clipboard Group */}
        <div className="flex items-center gap-1">
          {onUndo && onRedo && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className="h-7 w-7"
              >
                <Undo className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Y)"
                className="h-7 w-7"
              >
                <Redo className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Font Group */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
            <Underline className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Alignment Group */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
            <AlignLeft className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Progress */}
        {exporting && progress > 0 && (
          <>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Progress value={progress} className="w-32 h-2" />
              <span className="text-xs text-muted-foreground font-medium">{progress}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ExportBar;
