import { Save, Download, FileSpreadsheet, Menu, Loader2, Undo, Redo } from 'lucide-react';
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
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-1.5 rounded-lg">
              <FileSpreadsheet className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Keste
              </h1>
              <p className="text-xs text-muted-foreground -mt-0.5">Spreadsheets</p>
            </div>
          </div>

          {/* Undo/Redo buttons */}
          {onUndo && onRedo && (
            <>
              <div className="h-6 w-px bg-border mx-2" />
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onUndo}
                  disabled={!canUndo}
                  title="Undo (Ctrl+Z)"
                  className="h-8 w-8"
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRedo}
                  disabled={!canRedo}
                  title="Redo (Ctrl+Y)"
                  className="h-8 w-8"
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Center Section - Progress */}
        {exporting && progress > 0 && (
          <div className="flex items-center gap-3 px-6">
            <Progress value={progress} className="w-48" />
            <span className="text-sm text-muted-foreground font-medium">{progress}%</span>
          </div>
        )}

        {/* Right Section */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onExportSqlite}
            disabled={exporting}
            variant="outline"
            size="sm"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save .kst
          </Button>

          <Button
            onClick={onExportSql}
            disabled={exporting}
            variant="outline"
            size="sm"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export Excel
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ExportBar;
