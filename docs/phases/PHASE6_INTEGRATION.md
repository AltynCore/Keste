# Phase 6 Integration Guide

## Интеграция в WorkbookViewer

Чтобы активировать функции Phase 6, необходимо интегрировать их в `WorkbookViewer.tsx`:

### 1. Импорты

```typescript
import { FindReplaceDialog } from './FindReplaceDialog';
import { DataValidationDialog } from './DataValidationDialog';
import { ConditionalFormattingDialog } from './ConditionalFormattingDialog';
import { useDataManagement } from '../hooks/useDataManagement';
```

### 2. State для диалогов

```typescript
const [findReplaceOpen, setFindReplaceOpen] = useState(false);
const [dataValidationOpen, setDataValidationOpen] = useState(false);
const [conditionalFormattingOpen, setConditionalFormattingOpen] = useState(false);
```

### 3. Инициализация хука

```typescript
const dataManagement = useDataManagement(currentSheet?.id || '');
```

### 4. Handlers для диалогов

```typescript
// Find & Replace
const handleFind = (options: FindReplaceOptions) => {
  if (!currentSheet) return [];
  return dataManagement.find(currentSheet, options);
};

const handleReplace = (findResult: FindResult, options: FindReplaceOptions) => {
  const cellKey = `${findResult.row}-${findResult.col}`;
  const cell = currentSheet?.cells.get(cellKey);
  if (!cell) return;

  const newValue = dataManagement.replace(cell, options);
  setCellValue({ row: findResult.row, col: findResult.col, sheetId: currentSheet.id }, newValue);
};

const handleReplaceAll = (options: FindReplaceOptions) => {
  if (!currentSheet) return;
  const results = dataManagement.find(currentSheet, options);

  results.forEach(result => {
    const cellKey = `${result.row}-${result.col}`;
    const cell = currentSheet.cells.get(cellKey);
    if (cell) {
      const newValue = dataManagement.replace(cell, options);
      setCellValue({ row: result.row, col: result.col, sheetId: currentSheet.id }, newValue);
    }
  });
};

const handleNavigateToResult = (result: FindResult) => {
  setSelectedCell({
    row: result.row,
    col: result.col,
    sheetId: result.sheetId
  });
};

// Data Validation
const handleApplyValidation = (validation: CellValidation | null) => {
  if (validation) {
    dataManagement.setValidation(validation);
  } else if (selectedCell) {
    dataManagement.removeValidation(selectedCell.row, selectedCell.col);
  }
};

// Conditional Formatting
const handleApplyConditionalFormat = (rule: ConditionalFormattingRuleEntry) => {
  dataManagement.addConditionalFormat(rule);
};

// Keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+F for Find
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      setFindReplaceOpen(true);
    }
    // Ctrl+H for Replace
    if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
      e.preventDefault();
      setFindReplaceOpen(true);
    }
    // ...existing keyboard shortcuts
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### 5. Обновление ExportBar

```typescript
<ExportBar
  // ...existing props
  onFindReplace={() => setFindReplaceOpen(true)}
  onDataValidation={() => setDataValidationOpen(true)}
  onConditionalFormatting={() => setConditionalFormattingOpen(true)}
/>
```

### 6. Добавление диалогов

```typescript
{/* Find & Replace Dialog */}
<FindReplaceDialog
  open={findReplaceOpen}
  onOpenChange={setFindReplaceOpen}
  onFind={handleFind}
  onReplace={handleReplace}
  onReplaceAll={handleReplaceAll}
  onNavigateToResult={handleNavigateToResult}
/>

{/* Data Validation Dialog */}
{selectedCell && (
  <DataValidationDialog
    open={dataValidationOpen}
    onOpenChange={setDataValidationOpen}
    row={selectedCell.row}
    col={selectedCell.col}
    currentValidation={dataManagement.getValidation(selectedCell.row, selectedCell.col)}
    onApply={handleApplyValidation}
  />
)}

{/* Conditional Formatting Dialog */}
<ConditionalFormattingDialog
  open={conditionalFormattingOpen}
  onOpenChange={setConditionalFormattingOpen}
  onApply={handleApplyConditionalFormat}
/>
```

### 7. Интеграция Column Headers в EditableGridView

Обновите `EditableGridView.tsx`, чтобы использовать `ColumnHeader` вместо обычных заголовков:

```typescript
import { ColumnHeader } from './ColumnHeader';
import { FilterDialog } from './FilterDialog';

// В компоненте
const [filterDialogOpen, setFilterDialogOpen] = useState(false);
const [filterColumn, setFilterColumn] = useState<number | null>(null);

// В Cell компоненте для заголовков колонок (rowIndex === 0 && columnIndex > 0)
if (rowIndex === 0 && columnIndex > 0) {
  return (
    <ColumnHeader
      column={columnIndex}
      label={colNumToLetter(columnIndex)}
      sortOrder={sorts.find(s => s.col === columnIndex)?.order || null}
      hasFilter={filters.some(f => f.col === columnIndex)}
      onSort={(order, multiColumn) => {
        if (multiColumn) {
          addMultiColumnSort(columnIndex, order);
        } else {
          setSortForColumn(columnIndex, order);
        }
      }}
      onFilter={() => {
        setFilterColumn(columnIndex);
        setFilterDialogOpen(true);
      }}
      onClearFilter={() => setFilterForColumn(columnIndex, null)}
    />
  );
}
```

### 8. Применение сортировки и фильтрации

```typescript
// В EditableGridView или WorkbookViewer
const displayedCells = useMemo(() => {
  let cells = currentSheet.cells;

  // Apply filtering
  cells = dataManagement.applyFiltering(cells);

  // Apply sorting
  cells = dataManagement.applySorting(cells);

  return cells;
}, [currentSheet.cells, dataManagement]);
```

### 9. Применение условного форматирования

В рендере ячейки:

```typescript
const conditionalFormat = dataManagement.getConditionalFormat(
  position.row,
  position.col,
  getCellDisplayValue(position)
);

const customStyle: React.CSSProperties = {
  ...style,
  ...cellStyle,
  ...conditionalFormat, // Apply conditional formatting
};
```

---

## Проверка установки зависимостей

Убедитесь, что установлены все необходимые пакеты:

```bash
npm install @radix-ui/react-dropdown-menu @radix-ui/react-select
```

---

## Тестирование

### 1. Сортировка
- Кликните на заголовок колонки
- Выберите "Sort A → Z" или "Sort Z → A"
- Shift+Click на другую колонку для мульти-сортировки

### 2. Фильтрация
- Кликните на стрелку в заголовке колонки
- Выберите "Filter..."
- Настройте фильтр по значениям или условию

### 3. Find & Replace
- Нажмите Ctrl+F
- Введите текст для поиска
- Используйте Ctrl+H для замены

### 4. Data Validation
- Выберите ячейку
- Нажмите кнопку Shield в ExportBar
- Настройте правила валидации

### 5. Conditional Formatting
- Нажмите кнопку Palette в ExportBar
- Настройте правило форматирования
- Примените к диапазону

---

## Troubleshooting

### Проблема: Диалоги не открываются

**Решение:** Проверьте импорты и state переменные

```typescript
const [findReplaceOpen, setFindReplaceOpen] = useState(false);
```

### Проблема: Сортировка не работает

**Решение:** Убедитесь, что `applySorting` вызывается в нужном месте

```typescript
const sortedCells = dataManagement.applySorting(sheet.cells);
```

### Проблема: Conditional formatting не отображается

**Решение:** Проверьте, что формат применяется к стилю ячейки

```typescript
const format = dataManagement.getConditionalFormat(row, col, value);
const cellStyle = { ...baseStyle, ...format };
```

---

## Полный пример WorkbookViewer

См. файл `WorkbookViewer.example.tsx` для полной реализации с Phase 6.

---

**Version:** 1.0
**Date:** 2025-01-04
**Author:** Keste Development Team
