import { useMemo, useState, useEffect, useCallback } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { Table } from 'lucide-react';
import type { SheetModel } from '../core-ts/types';
import type { CellPosition, EditingState, NavigationDirection } from '../core-ts/editor-types';
import { Card } from './ui/card';
import { FormulaBar } from './FormulaBar';
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

  const getCellRef = (row: number, col: number) => {
    return `${colNumToLetter(col)}${row}`;
  };

  const Cell = useCallback(({ columnIndex, rowIndex, style }: any) => {
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

    const value = getCellValue(position);
    const displayValue = isEditing ? editingState.value : value;
    const hasFormula = displayValue.startsWith('=');

    const handleClick = () => {
      onCellClick(position);
    };

    const handleDoubleClick = () => {
      onCellDoubleClick(position);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onEditingValueChange(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
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
    };

    if (isEditing) {
      return (
        <div
          style={style}
          className="border-2 border-primary bg-background z-30 relative"
        >
          <input
            autoFocus
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={() => onStopEditing(true)}
            className="w-full h-full px-2 py-1 text-sm outline-none bg-transparent"
          />
        </div>
      );
    }

    return (
      <div
        style={style}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={cn(
          "border-r border-b px-2 py-1 text-sm overflow-hidden text-ellipsis whitespace-nowrap transition-colors cursor-cell",
          isSelected
            ? "bg-primary/10 border-2 border-primary -m-[1px] z-20"
            : "bg-background hover:bg-accent/30",
          hasFormula && "text-primary font-mono text-xs"
        )}
        title={value}
      >
        {value}
      </div>
    );
  }, [sheet.id, selectedCell, editingState, getCellValue, onCellClick, onCellDoubleClick, onEditingValueChange, onStopEditing, onNavigate]);

  const currentCellRef = selectedCell ? getCellRef(selectedCell.row, selectedCell.col) : 'A1';
  const currentCellValue = selectedCell ? getCellValue(selectedCell) : '';

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Formula Bar */}
      <FormulaBar
        cellReference={currentCellRef}
        value={editingState.isEditing ? editingState.value : currentCellValue}
        isEditing={editingState.isEditing}
        onChange={onEditingValueChange}
        onFocus={() => {
          if (selectedCell) {
            onCellDoubleClick(selectedCell);
          }
        }}
      />

      {/* Sheet Info */}
      <div className="px-4 py-2 border-b bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base">{sheet.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {sheet.cells.size.toLocaleString()} cells · {maxRow.toLocaleString()} rows × {maxCol} columns
            </p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div id="grid-container" className="flex-1 p-4">
        <Card className="h-full overflow-hidden shadow-sm">
          <Grid
            columnCount={maxCol + 1}
            columnWidth={120}
            height={dimensions.height - 200}
            rowCount={maxRow + 1}
            rowHeight={32}
            width={dimensions.width - 32}
            className="font-sans focus:outline-none"
          >
            {Cell}
          </Grid>
        </Card>
      </div>
    </div>
  );
}

export default EditableGridView;
