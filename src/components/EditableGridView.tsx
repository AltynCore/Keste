import { useMemo, useState, useEffect, useCallback } from 'react';
import { FixedSizeGrid as Grid, GridChildComponentProps } from 'react-window';
import { Table } from 'lucide-react';
import type { SheetModel } from '../core-ts/types';
import type { CellPosition, EditingState, NavigationDirection } from '../core-ts/editor-types';
import { cn } from '@/lib/utils';

interface EditableGridViewProps {
  sheet: SheetModel;
  editingState: EditingState;
  selectedCell: CellPosition | null;
  onCellClick: (position: CellPosition) => void;
  onCellDoubleClick: (position: CellPosition) => void;
  onEditingValueChange: (value: string) => void;
  onStopEditing: (save: boolean) => void;
  onNavigate: (direction: NavigationDirection) => void;
  getCellValue: (position: CellPosition) => string;
  getCellDisplayValue: (position: CellPosition) => string | number;
  // ⚡ Context menu handlers removed for performance - use keyboard shortcuts
}

export function EditableGridView({
  sheet,
  editingState,
  selectedCell,
  onCellClick,
  onCellDoubleClick,
  onEditingValueChange,
  onStopEditing,
  onNavigate,
  getCellValue,
  getCellDisplayValue,
}: EditableGridViewProps) {
  const [dimensions, setDimensions] = useState({ width: 1000, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById('grid-container');
      if (container) {
        setDimensions({
          width: container.offsetWidth,
          height: container.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if editing
      if (editingState.isEditing) return;

      // Arrow keys navigation
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onNavigate('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onNavigate('down');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onNavigate('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNavigate('right');
      } else if (e.key === 'Enter') {
        // Start editing on Enter
        if (selectedCell) {
          onCellDoubleClick(selectedCell);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingState.isEditing, selectedCell, onNavigate, onCellDoubleClick]);

  const { maxRow, maxCol } = useMemo(() => {
    let maxRow = 0;
    let maxCol = 0;

    for (const [, cell] of sheet.cells) {
      maxRow = Math.max(maxRow, cell.row);
      maxCol = Math.max(maxCol, cell.col);
    }

    maxRow = Math.max(maxRow, 100);
    maxCol = Math.max(maxCol, 26);

    return { maxRow, maxCol };
  }, [sheet]);

  const colNumToLetter = (num: number): string => {
    let result = '';
    let n = num;
    while (n > 0) {
      const rem = (n - 1) % 26;
      result = String.fromCharCode(65 + rem) + result;
      n = Math.floor((n - 1) / 26);
    }
    return result;
  };

  // ⚡ ULTRA-OPTIMIZED Cell renderer - NO ContextMenu, minimal deps
  const Cell = useCallback(({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
    // Header cells
    if (rowIndex === 0 && columnIndex === 0) {
      return (
        <div
          style={style}
          className="border-r border-b bg-muted/50 flex items-center justify-center sticky top-0 left-0 z-20"
        >
          <Table className="h-3 w-3 text-muted-foreground" />
        </div>
      );
    }

    if (rowIndex === 0) {
      return (
        <div
          style={style}
          className="border-r border-b bg-muted/50 flex items-center justify-center font-semibold text-xs text-muted-foreground sticky top-0 z-10"
        >
          {colNumToLetter(columnIndex)}
        </div>
      );
    }

    if (columnIndex === 0) {
      return (
        <div
          style={style}
          className="border-r border-b bg-muted/50 flex items-center justify-center font-semibold text-xs text-muted-foreground sticky left-0 z-10"
        >
          {rowIndex}
        </div>
      );
    }

    // Data cells
    const position: CellPosition = {
      row: rowIndex,
      col: columnIndex,
      sheetId: sheet.id,
    };

    const isSelected =
      selectedCell?.row === rowIndex &&
      selectedCell?.col === columnIndex &&
      selectedCell?.sheetId === sheet.id;

    const isEditing =
      editingState.isEditing &&
      editingState.position?.row === rowIndex &&
      editingState.position?.col === columnIndex &&
      editingState.position?.sheetId === sheet.id;

    const rawValue = getCellValue(position);
    const displayValue = isEditing ? editingState.value : getCellDisplayValue(position);
    const hasFormula = rawValue.startsWith('=');

    // Get cell data for styling
    const cellKey = `${position.row}-${position.col}`;
    const cellData = sheet.cells.get(cellKey);
    const cellStyle = cellData?.style || {};

    // Build custom style object
    const customStyle: React.CSSProperties = {
      ...style,
      fontFamily: cellStyle.fontName,
      fontSize: cellStyle.fontSize ? `${cellStyle.fontSize}px` : undefined,
      fontWeight: cellStyle.fontBold ? 'bold' : undefined,
      fontStyle: cellStyle.fontItalic ? 'italic' : undefined,
      textDecoration: cellStyle.fontUnderline ? 'underline' : undefined,
      color: cellStyle.fontColor,
      backgroundColor: cellStyle.backgroundColor,
      textAlign: cellStyle.horizontalAlign,
      display: cellStyle.verticalAlign ? 'flex' : undefined,
      alignItems: cellStyle.verticalAlign === 'top' ? 'flex-start'
        : cellStyle.verticalAlign === 'bottom' ? 'flex-end'
        : cellStyle.verticalAlign === 'middle' ? 'center'
        : undefined,
    };

    if (isEditing) {
      return (
        <div
          style={customStyle}
          className="border-2 border-primary bg-background z-30 relative"
        >
          <input
            autoFocus
            type="text"
            value={displayValue}
            onChange={(e) => onEditingValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onStopEditing(true);
                onNavigate('down');
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onStopEditing(false);
              } else if (e.key === 'Tab') {
                e.preventDefault();
                onStopEditing(true);
                onNavigate(e.shiftKey ? 'left' : 'right');
              }
            }}
            onBlur={() => onStopEditing(true)}
            className="w-full h-full px-2 py-1 text-sm outline-none bg-transparent"
          />
        </div>
      );
    }

    // ⚡ NO ContextMenu - use global keyboard shortcuts instead!
    return (
      <div
        style={customStyle}
        onClick={(e) => {
          if (e.detail !== 2) onCellClick(position);
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCellDoubleClick(position);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onCellClick(position); // Select on right-click
          // Context menu can be added globally if needed
        }}
        className={cn(
          // ⚡ INSTANT response - no transitions, no context menu overhead
          "border-r border-b px-2 py-1 text-sm overflow-hidden text-ellipsis whitespace-nowrap cursor-cell select-none",
          isSelected
            ? "bg-primary/10 border-2 border-primary -m-[1px] z-20 ring-2 ring-primary/20"
            : "hover:bg-accent/30",
          hasFormula && "text-primary font-mono text-xs"
        )}
        title={String(displayValue)}
      >
        {displayValue}
      </div>
    );
  }, [sheet.id, selectedCell, editingState, getCellValue, getCellDisplayValue, onCellClick, onCellDoubleClick, onEditingValueChange, onStopEditing, onNavigate]);

  return (
    <div id="grid-container" className="h-full bg-background">
      <Grid
        columnCount={maxCol + 1}
        columnWidth={120}
        height={dimensions.height}
        rowCount={maxRow + 1}
        rowHeight={32}
        width={dimensions.width}
        className="font-sans focus:outline-none"
      >
        {Cell}
      </Grid>
    </div>
  );
}

export default EditableGridView;
