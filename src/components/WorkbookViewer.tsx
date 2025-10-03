import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { motion } from 'framer-motion';
import EditableGridView from './EditableGridView';
import ExportBar from './ExportBar';
import SheetTabs from './SheetTabs';
import { FormulaBar } from './FormulaBar';
import { generateSqlDump } from '../core-ts/sql_dump';
import { createXlsxBlob } from '../core-ts/write_xlsx';
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
    getCellDisplayValue,
    getCellStyle,
    setCellValue,
    startEditing,
    stopEditing,
    updateEditingValue,
    navigateCell,
    undo,
    redo,
    copy,
    cut,
    paste,
    toggleBold,
    toggleItalic,
    toggleUnderline,
    setAlignment,
    setFontColor,
    setBackgroundColor,
    canUndo,
    canRedo,
  } = useSpreadsheetEditor(initialWorkbook);

  const currentSheet = workbook.sheets[selectedSheetIndex];

  const handleCellClick = (position: CellPosition) => {
    // If clicking on the same cell that is already selected, don't stop editing
    if (editingState.isEditing && 
        editingState.position?.row === position.row && 
        editingState.position?.col === position.col && 
        editingState.position?.sheetId === position.sheetId) {
      return;
    }
    
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

  const handleCut = async () => {
    const value = cut();
    if (value !== null) {
      try {
        await navigator.clipboard.writeText(value);
        toast({
          title: "Cut",
          description: "Cell value cut to clipboard",
        });
      } catch (err) {
        console.error('Failed to cut:', err);
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
      // Ctrl/Cmd + X for cut
      else if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        if (!editingState.isEditing) {
          e.preventDefault();
          handleCut();
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
      // Generate XLSX blob
      setProgress(30);
      const blob = await createXlsxBlob(workbook);
      setProgress(70);

      // Choose save location
      const outPath = await invoke<string>('choose_save_file', {
        defaultName: 'workbook.xlsx',
      });

      if (!outPath) {
        setExporting(false);
        setProgress(0);
        return;
      }

      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outPath.split(/[/\\]/).pop() || 'export.xlsx';
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);

      toast({
        title: "Export successful!",
        description: `Excel file exported: ${(blob.size / 1024).toFixed(2)} KB`,
      });
    } catch (err) {
      console.error('Export error:', err);
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

  // Helper to get cell reference (A1, B2, etc.)
  const getCellRef = (row: number, col: number) => {
    const colLetter = String.fromCharCode(65 + ((col - 1) % 26));
    return `${colLetter}${row}`;
  };

  const currentCellRef = selectedCell ? getCellRef(selectedCell.row, selectedCell.col) : '';
  const currentCellValue = selectedCell ? getCellValue(selectedCell) : '';
  const currentCellStyle = getCellStyle();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Excel-like Ribbon */}
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
        onBold={toggleBold}
        onItalic={toggleItalic}
        onUnderline={toggleUnderline}
        onAlignLeft={() => setAlignment('left')}
        onAlignCenter={() => setAlignment('center')}
        onAlignRight={() => setAlignment('right')}
        onFontColor={setFontColor}
        onBackgroundColor={setBackgroundColor}
        isBold={currentCellStyle.fontBold}
        isItalic={currentCellStyle.fontItalic}
        isUnderline={currentCellStyle.fontUnderline}
        currentAlign={currentCellStyle.horizontalAlign || 'left'}
      />

      {/* Formula Bar - Excel position */}
      <FormulaBar
        cellReference={currentCellRef}
        value={editingState.isEditing ? editingState.value : currentCellValue}
        isEditing={editingState.isEditing}
        onChange={updateEditingValue}
        onFocus={() => {
          if (selectedCell) {
            startEditing(selectedCell);
          }
        }}
      />

      {/* Main Grid Area */}
      <div className="flex-1 overflow-hidden">
        <motion.div
          key={selectedSheetIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="h-full"
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
              getCellDisplayValue={getCellDisplayValue}
              onCopy={handleCopy}
              onCut={handleCut}
              onPaste={handlePaste}
              onDelete={() => {
                if (selectedCell) {
                  setCellValue(selectedCell, '');
                  toast({
                    title: "Deleted",
                    description: "Cell content cleared",
                  });
                }
              }}
            />
          )}
        </motion.div>
      </div>

      {/* Sheet Tabs - Excel position at bottom */}
      <SheetTabs
        sheets={workbook.sheets}
        selectedIndex={selectedSheetIndex}
        onSelectSheet={setSelectedSheetIndex}
      />
    </div>
  );
}

export default WorkbookViewer;
