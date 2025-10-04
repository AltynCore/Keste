import { Save, Download, FileSpreadsheet, Home, Loader2, Undo, Redo, Type, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Palette, Search, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import KeyboardShortcutsDialog from './KeyboardShortcutsDialog';

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
  onBold?: () => void;
  onItalic?: () => void;
  onUnderline?: () => void;
  onAlignLeft?: () => void;
  onAlignCenter?: () => void;
  onAlignRight?: () => void;
  onBackgroundColor?: (color: string) => void;
  onFontColor?: (color: string) => void;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  currentAlign?: 'left' | 'center' | 'right';
  onFindReplace?: () => void;
  onDataValidation?: () => void;
  onConditionalFormatting?: () => void;
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
  onBold,
  onItalic,
  onUnderline,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onBackgroundColor,
  onFontColor,
  isBold = false,
  isItalic = false,
  isUnderline = false,
  currentAlign = 'left',
  onFindReplace,
  onDataValidation,
  onConditionalFormatting,
}: ExportBarProps) {
  return (
    <TooltipProvider delayDuration={300}>
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
            <KeyboardShortcutsDialog />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent>Save as .kst file (Ctrl+S)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent>Export to Excel .xlsx</TooltipContent>
          </Tooltip>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isBold ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={onBold}
                disabled={!onBold}
              >
                <Bold className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <div className="font-semibold">Bold</div>
                <div className="text-xs opacity-70">Ctrl+B</div>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isItalic ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={onItalic}
                disabled={!onItalic}
              >
                <Italic className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <div className="font-semibold">Italic</div>
                <div className="text-xs opacity-70">Ctrl+I</div>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isUnderline ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={onUnderline}
                disabled={!onUnderline}
              >
                <Underline className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <div className="font-semibold">Underline</div>
                <div className="text-xs opacity-70">Ctrl+U</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Color Group */}
        <div className="flex items-center gap-1">
          <div className="relative">
            <input
              type="color"
              className="absolute opacity-0 w-7 h-7 cursor-pointer"
              onChange={(e) => onFontColor?.(e.target.value)}
              disabled={!onFontColor}
              title="Font Color"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!onFontColor}>
              <Type className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="relative">
            <input
              type="color"
              className="absolute opacity-0 w-7 h-7 cursor-pointer"
              onChange={(e) => onBackgroundColor?.(e.target.value)}
              disabled={!onBackgroundColor}
              title="Background Color"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!onBackgroundColor}>
              <Palette className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Alignment Group */}
        <div className="flex items-center gap-1">
          <Button
            variant={currentAlign === 'left' ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={onAlignLeft}
            disabled={!onAlignLeft}
            title="Align Left"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={currentAlign === 'center' ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={onAlignCenter}
            disabled={!onAlignCenter}
            title="Align Center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={currentAlign === 'right' ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={onAlignRight}
            disabled={!onAlignRight}
            title="Align Right"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Data Tools Group */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onFindReplace}
                disabled={!onFindReplace}
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <div className="font-semibold">Find & Replace</div>
                <div className="text-xs opacity-70">Ctrl+F</div>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onDataValidation}
                disabled={!onDataValidation}
              >
                <Shield className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <div className="font-semibold">Data Validation</div>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onConditionalFormatting}
                disabled={!onConditionalFormatting}
              >
                <Palette className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <div className="font-semibold">Conditional Formatting</div>
              </div>
            </TooltipContent>
          </Tooltip>
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
    </TooltipProvider>
  );
}

export default ExportBar;
