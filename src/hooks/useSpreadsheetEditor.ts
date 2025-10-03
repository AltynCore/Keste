import { useState, useCallback, useRef } from 'react';
import type { WorkbookModel, SheetModel, CellData } from '../core-ts/types';
import type { CellPosition, EditingState, CellEdit, UndoRedoState, Selection, NavigationDirection } from '../core-ts/editor-types';
import { evaluateFormula } from '../core-ts/formula-parser';

export function useSpreadsheetEditor(initialWorkbook: WorkbookModel) {
  const [workbook, setWorkbook] = useState<WorkbookModel>(initialWorkbook);
  const [editingState, setEditingState] = useState<EditingState>({
    isEditing: false,
    position: null,
    value: '',
    originalValue: '',
  });
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  const undoRedoRef = useRef<UndoRedoState>({
    undoStack: [],
    redoStack: [],
    maxSize: 100,
  });

  // Get raw cell value (for editing)
  const getCellValue = useCallback((position: CellPosition): string => {
    const sheet = workbook.sheets.find(s => s.id === position.sheetId);
    if (!sheet) return '';

    const cellKey = `${position.row}-${position.col}`;
    const cell = sheet.cells.get(cellKey);

    if (!cell) return '';
    if (cell.formula) return `=${cell.formula}`;
    return cell.value?.toString() || '';
  }, [workbook]);

  // Get evaluated cell value (for display and formula calculations)
  const getCellDisplayValue = useCallback((position: CellPosition): string | number => {
    const sheet = workbook.sheets.find(s => s.id === position.sheetId);
    if (!sheet) return '';

    const cellKey = `${position.row}-${position.col}`;
    const cell = sheet.cells.get(cellKey);

    if (!cell) return '';

    // If it's a formula, evaluate it
    if (cell.formula) {
      // Create a cell getter for formula evaluation
      const getCellForFormula = (row: number, col: number): string | number | boolean | null => {
        const cellPos: CellPosition = { row, col, sheetId: position.sheetId };
        const cellKey = `${row}-${col}`;
        const targetCell = sheet.cells.get(cellKey);

        if (!targetCell) return null;

        // Prevent circular references by returning raw value for now
        if (targetCell.formula) {
          return targetCell.value?.toString() || '';
        }

        return targetCell.value ?? null;
      };

      const result = evaluateFormula(`=${cell.formula}`, getCellForFormula);

      if (result === '#ERROR!') return '#ERROR!';
      if (result === null) return '';

      return result;
    }

    return cell.value?.toString() || '';
  }, [workbook]);

  // Set cell value
  const setCellValue = useCallback((position: CellPosition, value: string) => {
    setWorkbook(prev => {
      const newWorkbook = { ...prev };
      const sheetIndex = newWorkbook.sheets.findIndex(s => s.id === position.sheetId);

      if (sheetIndex === -1) return prev;

      const sheet = { ...newWorkbook.sheets[sheetIndex] };
      const cellKey = `${position.row}-${position.col}`;
      const cells = new Map(sheet.cells);

      const oldValue = getCellValue(position);

      // Parse formula or value
      if (value.startsWith('=')) {
        // Formula
        const formula = value.substring(1);
        const cellData: CellData = {
          row: position.row,
          col: position.col,
          type: 'str',
          value: value, // For now, store formula as value
          formula: formula,
        };
        cells.set(cellKey, cellData);
      } else if (value === '') {
        // Delete cell
        cells.delete(cellKey);
      } else {
        // Regular value
        const cellData: CellData = {
          row: position.row,
          col: position.col,
          type: isNaN(Number(value)) ? 's' : 'n',
          value: isNaN(Number(value)) ? value : Number(value),
        };
        cells.set(cellKey, cellData);
      }

      sheet.cells = cells;
      newWorkbook.sheets = [...newWorkbook.sheets];
      newWorkbook.sheets[sheetIndex] = sheet;

      // Add to undo stack
      const edit: CellEdit = {
        position,
        oldValue,
        newValue: value,
        timestamp: Date.now(),
      };

      undoRedoRef.current.undoStack.push(edit);
      if (undoRedoRef.current.undoStack.length > undoRedoRef.current.maxSize) {
        undoRedoRef.current.undoStack.shift();
      }
      undoRedoRef.current.redoStack = []; // Clear redo stack

      return newWorkbook;
    });
  }, [getCellValue]);

  // Start editing
  const startEditing = useCallback((position: CellPosition) => {
    const value = getCellValue(position);
    setEditingState({
      isEditing: true,
      position,
      value,
      originalValue: value,
    });
    setSelectedCell(position);
  }, [getCellValue]);

  // Stop editing
  const stopEditing = useCallback((save: boolean = true) => {
    if (!editingState.position) return;

    if (save && editingState.value !== editingState.originalValue) {
      setCellValue(editingState.position, editingState.value);
    }

    setEditingState({
      isEditing: false,
      position: null,
      value: '',
      originalValue: '',
    });
  }, [editingState, setCellValue]);

  // Update editing value
  const updateEditingValue = useCallback((value: string) => {
    setEditingState(prev => ({ ...prev, value }));
  }, []);

  // Navigate cells
  const navigateCell = useCallback((direction: NavigationDirection) => {
    if (!selectedCell) return;

    let newRow = selectedCell.row;
    let newCol = selectedCell.col;

    switch (direction) {
      case 'up':
        newRow = Math.max(1, newRow - 1);
        break;
      case 'down':
        newRow = newRow + 1;
        break;
      case 'left':
        newCol = Math.max(1, newCol - 1);
        break;
      case 'right':
        newCol = newCol + 1;
        break;
    }

    const newPosition: CellPosition = {
      row: newRow,
      col: newCol,
      sheetId: selectedCell.sheetId,
    };

    setSelectedCell(newPosition);

    if (editingState.isEditing) {
      stopEditing(true);
    }
  }, [selectedCell, editingState.isEditing, stopEditing]);

  // Undo
  const undo = useCallback(() => {
    const edit = undoRedoRef.current.undoStack.pop();
    if (!edit) return;

    setCellValue(edit.position, edit.oldValue);
    undoRedoRef.current.redoStack.push(edit);
  }, [setCellValue]);

  // Redo
  const redo = useCallback(() => {
    const edit = undoRedoRef.current.redoStack.pop();
    if (!edit) return;

    setCellValue(edit.position, edit.newValue);
    undoRedoRef.current.undoStack.push(edit);
  }, [setCellValue]);

  // Copy
  const copy = useCallback(() => {
    if (!selectedCell) return null;

    const value = getCellValue(selectedCell);
    return value;
  }, [selectedCell, getCellValue]);

  // Cut
  const cut = useCallback(() => {
    if (!selectedCell) return null;

    const value = getCellValue(selectedCell);
    setCellValue(selectedCell, '');
    return value;
  }, [selectedCell, getCellValue, setCellValue]);

  // Paste
  const paste = useCallback((value: string) => {
    if (!selectedCell) return;

    setCellValue(selectedCell, value);
  }, [selectedCell, setCellValue]);

  return {
    workbook,
    setWorkbook,
    editingState,
    selectedCell,
    setSelectedCell,
    selection,
    setSelection,
    getCellValue,
    getCellDisplayValue,
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
    canUndo: undoRedoRef.current.undoStack.length > 0,
    canRedo: undoRedoRef.current.redoStack.length > 0,
  };
}
