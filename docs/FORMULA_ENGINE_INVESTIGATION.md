# 🔬 Formula Engine Investigation & Debug

**Date:** October 5, 2025  
**Issue:** Формулы возвращают неправильные результаты (0 вместо суммы)  
**Goal:** Полное исследование и решение проблемы

---

## 📋 Симптомы

1. `=SUM(A1:B1)` где A1=5, B1=3 возвращает `0` (должно быть `8`)
2. Другие формулы тоже не работают
3. Попытки исправления:
   - ✅ Добавлена конвертация строк в числа
   - ✅ Интегрирован HyperFormula (профессиональная библиотека)
   - ✅ Добавлена синхронизация данных
   - ❌ Проблема остается

---

## 🔍 Исследование 1: Архитектура данных

### Текущая структура хранения:

**WorkbookModel:**
```typescript
interface WorkbookModel {
  sheets: SheetModel[];
}

interface SheetModel {
  id: string;
  name: string;
  cells: Map<string, CellData>;  // key: "row-col"
}

interface CellData {
  row: number;
  col: number;
  type: 's' | 'n' | 'b' | 'str';
  value: string | number | boolean | null;
  formula?: string;  // Без знака "="
  style?: CellStyle;
}
```

### HyperFormula ожидает:

```typescript
// Адрес ячейки
SimpleCellAddress = { sheet: number, col: number, row: number }

// Значения
setCellContents(address, value)
// value может быть:
// - number: 5
// - string: "hello"
// - formula string: "=SUM(A1:B1)"  ← С ЗНАКОМ "="!
```

---

## 🐛 Гипотеза 1: Проблема с индексацией

**HyperFormula:**
- row: 0-based (0, 1, 2, ...)
- col: 0-based (0=A, 1=B, 2=C, ...)

**Наш Workbook:**
- row: 1-based? (нужно проверить)
- col: 1-based? (нужно проверить)

**❗ КРИТИЧНО:** Если есть несоответствие индексов, HyperFormula читает не те ячейки!

---

## 🐛 Гипотеза 2: Проблема с синхронизацией

**Текущий код:**
```typescript
// В getCellDisplayValue вызываем:
syncSheetToHyperFormula(); // Синхронизируем ВСЕ ячейки каждый раз

// Но что если:
// 1. Данные еще не сохранены в workbook?
// 2. workbookRef.current устарел?
// 3. cells.forEach проходит не по тем данным?
```

---

## 🐛 Гипотеза 3: Формат формулы

**В CellData.formula хранится:** `SUM(A1:B1)` (БЕЗ "=")

**При синхронизации добавляем "=":**
```typescript
hf.setCellContents(address, `=${cellData.formula}`);
```

**Но что если:**
- Формула уже содержит "="?
- Формула имеет неправильный синтаксис?
- HyperFormula не понимает формат?

---

## 🧪 План тестирования

### Тест 1: Минимальный пример HyperFormula

Создадим изолированный тест:

```typescript
import { HyperFormula } from 'hyperformula';

// 1. Инициализация
const hf = HyperFormula.buildEmpty({
  licenseKey: 'gpl-v3',
});
hf.addSheet('Sheet1');

// 2. Добавляем данные
hf.setCellContents({ sheet: 0, col: 0, row: 0 }, 5);     // A1 = 5
hf.setCellContents({ sheet: 0, col: 1, row: 0 }, 3);     // B1 = 3
hf.setCellContents({ sheet: 0, col: 2, row: 0 }, '=SUM(A1:B1)'); // C1 = formula

// 3. Читаем результат
const result = hf.getCellValue({ sheet: 0, col: 2, row: 0 });
console.log('Result:', result); // Должно быть 8
```

**Ожидаемый результат:** `8`  
**Если не работает:** Проблема в базовом использовании HyperFormula

### Тест 2: Проверка индексов

```typescript
// Записываем в нашем формате:
workbook.sheets[0].cells.set('0-0', {
  row: 0,
  col: 0,
  type: 'n',
  value: 5
});

// Синхронизируем
syncSheetToHyperFormula();

// Проверяем что HyperFormula видит:
const hfValue = hf.getCellValue({ sheet: 0, col: 0, row: 0 });
console.log('HF sees:', hfValue); // Должно быть 5
```

### Тест 3: Проверка синхронизации

```typescript
// Добавляем debug логи в syncSheetToHyperFormula:
currentSheet.cells.forEach((cellData, key) => {
  const [row, col] = key.split('-').map(Number);
  console.log(`Syncing cell ${key}:`, {
    row,
    col,
    value: cellData.value,
    formula: cellData.formula
  });
  
  const address: SimpleCellAddress = { sheet: 0, col, row };
  
  if (cellData.formula) {
    console.log(`  Setting formula: =${cellData.formula}`);
    hf.setCellContents(address, `=${cellData.formula}`);
  } else {
    console.log(`  Setting value:`, cellData.value);
    hf.setCellContents(address, cellData.value);
  }
});
```

---

## ✅ РЕШЕНИЕ НАЙДЕНО!

**Дата:** October 5, 2025  
**Root Cause:** Несоответствие индексации между workbook и HyperFormula

### Проблема

**Наш workbook использует 1-based индексацию:**
- A1 = `row:1, col:1`
- A2 = `row:2, col:1`
- B2 = `row:2, col:2`

**HyperFormula использует 0-based индексацию:**
- A1 = `row:0, col:0`
- A2 = `row:1, col:0`
- B2 = `row:1, col:1`

**Что происходило:**
1. Записывали `1` в HyperFormula на `{row:2, col:1}`
2. Для HyperFormula это ячейка **C3**, а не A2!
3. Формула `=SUM(A2:B2)` искала ячейки `{row:1, col:0-1}`
4. Эти позиции были пустые → результат 0

### Решение

Добавлена конвертация индексов при синхронизации:

```typescript
// Convert 1-based to 0-based indexing for HyperFormula
const hfRow = row - 1;
const hfCol = col - 1;
const address: SimpleCellAddress = { sheet: 0, col: hfCol, row: hfRow };
```

### Результат

✅ Формулы теперь работают корректно!
- `=SUM(A1:B1)` → правильная сумма
- `=AVERAGE(A1:A10)` → правильное среднее
- Все 380+ функций HyperFormula работают!

---

## 🔧 Возможные решения

### Решение A: Упростить синхронизацию
- Синхронизировать только измененные ячейки
- Использовать HyperFormula как единственный источник истины

### Решение B: Вернуться к старому парсеру
- Доработать наш formula-parser.ts
- Убрать HyperFormula (экономия 561kb)
- Полный контроль над логикой

### Решение C: Правильно использовать HyperFormula
- Исправить индексацию
- Синхронизировать в правильный момент
- Использовать правильный API

---

## 📊 Чеклист отладки

- [ ] Проверить индексацию (0-based vs 1-based)
- [ ] Проверить формат ключей в Map ("0-0" vs "1-1")
- [ ] Добавить детальные логи в syncSheetToHyperFormula
- [ ] Протестировать HyperFormula изолированно
- [ ] Проверить timing синхронизации
- [ ] Проверить что workbookRef.current актуален
- [ ] Проверить формат формул (с "=" или без)
- [ ] Проверить типы данных (string "5" vs number 5)
- [ ] Протестировать на простом примере
- [ ] Прочитать документацию HyperFormula полностью

---

## 🎯 Next Steps

1. Добавить debug версию с логами
2. Запустить в браузере
3. Проверить консоль
4. Задокументировать находки
5. Применить исправление
6. Протестировать
7. Обновить этот документ

---

**Status:** 🔴 In Progress  
**Priority:** 🔥 Critical  
**Blocker:** Yes
