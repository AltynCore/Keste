import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { motion } from 'framer-motion';
import SheetNav from './SheetNav';
import EditableGridView from './EditableGridView';
import ExportBar from './ExportBar';
import { generateSqlDump } from '../core-ts/sql_dump';
import { useToast } from './ui/use-toast';
import { useSpreadsheetEditor } from '../hooks/useSpreadsheetEditor';
import type { WorkbookModel } from '../core-ts/types';
import type { CellPosition, NavigationDirection } from '../core-ts/editor-types';

interface WorkbookViewerProps {
  workbook: WorkbookModel;
  onClose: () => void;
}

function WorkbookViewer({ workbook: initialWorkbook, onClose }: WorkbookViewerProps) {
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  // Use spreadsheet editor hook
  const {
    workbook,
    editingState,
    selectedCell,
    setSelectedCell,
    getCellValue,
    setCellValue,
    startEditing,
    stopEditing,
    updateEditingValue,
    navigateCell,
    undo,
    redo,
    copy,
    paste,
    canUndo,
    canRedo,
  } = useSpreadsheetEditor(initialWorkbook);

  const currentSheet = workbook.sheets[selectedSheetIndex];

  const handleCellClick = (position: CellPosition) => {
    setSelectedCell(position);
    if (editingState.isEditing) {
      stopEditing(true);
    }
  };

  const handleCellDoubleClick = (position: CellPosition) => {
    startEditing(position);
  };

  const handleNavigate = (direction: NavigationDirection) => {
    navigateCell(direction);
  };

  // Copy/Paste handlers
  const handleCopy = async () => {
    const value = copy();
    if (value !== null) {
      try {
        await navigator.clipboard.writeText(value);
        toast({
          title: "Copied",
          description: "Cell value copied to clipboard",
        });
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      paste(text);
      toast({
        title: "Pasted",
        description: "Value pasted from clipboard",
      });
    } catch (err) {
      console.error('Failed to paste:', err);
    }
  };

  // Undo/Redo handlers
  const handleUndo = () => {
    if (canUndo) {
      undo();
      toast({
        title: "Undone",
        description: "Last change undone",
      });
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      redo();
      toast({
        title: "Redone",
        description: "Last change redone",
      });
    }
  };

  // Keyboard shortcuts
  useState(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for redo
      else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault();
        handleRedo();
      }
      // Ctrl/Cmd + C for copy
      else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (!editingState.isEditing) {
          e.preventDefault();
          handleCopy();
        }
      }
      // Ctrl/Cmd + V for paste
      else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (!editingState.isEditing) {
          e.preventDefault();
          handlePaste();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleSaveKst = async () => {
    setExporting(true);
    setProgress(10);

    try {
      // Generate SQL dump
      let sqlDump = '';
      setProgress(30);

      for await (const chunk of generateSqlDump(workbook)) {
        sqlDump += chunk;
      }

      setProgress(50);

      // Choose save location
      const outPath = await invoke<string>('choose_save_file', {
        defaultName: 'spreadsheet.kst',
      });

      setProgress(70);

      // Save .kst file (SQLite format)
      const result = await invoke<{ bytes_written: number }>('save_sqlite', {
        request: {
          sql_dump: sqlDump,
          out_path: outPath,
        },
      });

      setProgress(100);

      toast({
        title: "Saved successfully!",
        description: `Keste file saved: ${(result.bytes_written / 1024).toFixed(2)} KB`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: String(err),
      });
    } finally {
      setExporting(false);
      setProgress(0);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    setProgress(10);

    try {
      // For now, export as SQL dump
      // TODO: Implement proper XLSX export
      let sqlDump = '';
      setProgress(30);

      for await (const chunk of generateSqlDump(workbook)) {
        sqlDump += chunk;
      }

      setProgress(70);

      // Choose save location
      const outPath = await invoke<string>('choose_save_file', {
        defaultName: 'export.xlsx',
      });

      // Write as text file (temporary solution)
      const blob = new Blob([sqlDump], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outPath.split(/[/\\]/).pop() || 'export.xlsx';
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);

      toast({
        title: "Export successful!",
        description: "Excel file exported (Note: Full XLSX support coming soon)",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: String(err),
      });
    } finally {
      setExporting(false);
      setProgress(0);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <ExportBar
        onExportSqlite={handleSaveKst}
        onExportSql={handleExportExcel}
        onClose={onClose}
        exporting={exporting}
        progress={progress}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <div className="flex flex-1 overflow-hidden">
        <SheetNav
          sheets={workbook.sheets}
          selectedIndex={selectedSheetIndex}
          onSelectSheet={setSelectedSheetIndex}
        />
        <motion.div
          key={selectedSheetIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-hidden"
        >
          {currentSheet && (
            <EditableGridView
              sheet={currentSheet}
              editingState={editingState}
              selectedCell={selectedCell}
              onCellClick={handleCellClick}
              onCellDoubleClick={handleCellDoubleClick}
              onEditingValueChange={updateEditingValue}
              onStopEditing={stopEditing}
              onNavigate={handleNavigate}
              getCellValue={getCellValue}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default WorkbookViewer;
