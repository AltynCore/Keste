# 🧪 Formula Engine Testing Instructions

**Date:** October 5, 2025  
**Version:** Debug v0.7.0

---

## 📋 Цель тестирования

Выяснить почему `=SUM(A1:B1)` возвращает `0` вместо правильной суммы.

---

## 🔧 Текущая версия: С ПОДРОБНЫМИ ЛОГАМИ

В текущей версии добавлены **детальные логи** в консоль браузера для отладки:

### Логи в setCellValue:
```
💾 setCellValue called:
   Position: row=X, col=Y, sheet=...
   Value: "..."
   Cell key: "X-Y"
   → Saving as VALUE/FORMULA
```

### Логи в syncSheetToHyperFormula:
```
🔄 Starting HyperFormula sync...
  Sheet: ... ID: ...
  Total cells: N
  📝 Cell X-Y (row=X, col=Y):
     value: ...
     type: ...
     formula: ...
     → Setting VALUE/FORMULA: ...
✅ HyperFormula synced: N cells
```

### Логи в getCellDisplayValue (формулы):
```
🧮 Evaluating formula at row=X, col=Y
   Formula: =...
   Address: { sheet: 0, col: Y, row: X }
   Result from HyperFormula: ... (type: ...)
   ✅ Final result: ...
```

---

## 📝 Инструкция по тестированию

### Шаг 1: Откройте приложение

1. Dev сервер запущен на `http://localhost:1420`
2. Откройте в Chrome/Edge/Firefox
3. Откройте DevTools (F12)
4. Перейдите на вкладку **Console**

### Шаг 2: Выполните базовый тест

**Тест: `=SUM(A1:B1)` где A1=5, B1=3**

1. **Нажмите на ячейку A1**
   - Ожидаемые логи:
     ```
     (может быть пусто, это нормально)
     ```

2. **Введите `5` в A1 и нажмите Enter**
   - Ожидаемые логи:
     ```
     💾 setCellValue called:
        Position: row=1, col=1, sheet=...
        Value: "5"
        Cell key: "1-1"
        → Saving as VALUE:
           type: n
           value: 5 (number)
     ```
   
3. **Нажмите на ячейку B1**

4. **Введите `3` в B1 и нажмите Enter**
   - Ожидаемые логи:
     ```
     💾 setCellValue called:
        Position: row=1, col=2, sheet=...
        Value: "3"
        Cell key: "1-2"
        → Saving as VALUE:
           type: n
           value: 3 (number)
     ```

5. **Нажмите на ячейку C1**

6. **Введите `=SUM(A1:B1)` и нажмите Enter**
   - Ожидаемые логи:
     ```
     💾 setCellValue called:
        Position: row=1, col=3, sheet=...
        Value: "=SUM(A1:B1)"
        Cell key: "1-3"
        → Saving as FORMULA:
           formula: "SUM(A1:B1)"
           value: "=SUM(A1:B1)"
     
     🧮 Evaluating formula at row=1, col=3
        Formula: =SUM(A1:B1)
     
     🔄 Starting HyperFormula sync...
       Sheet: ... ID: ...
       Total cells: 3
       📝 Cell 1-1 (row=1, col=1):
          value: 5
          type: n
          formula: undefined
          → Setting VALUE: 5 (number)
       📝 Cell 1-2 (row=1, col=2):
          value: 3
          type: n
          formula: undefined
          → Setting VALUE: 3 (number)
       📝 Cell 1-3 (row=1, col=3):
          value: =SUM(A1:B1)
          type: str
          formula: SUM(A1:B1)
          → Setting FORMULA: "=SUM(A1:B1)"
     ✅ HyperFormula synced: 3 cells
     
        Address: { sheet: 0, col: 3, row: 1 }
        Result from HyperFormula: ??? (type: ???)
        ✅ Final result: ???
     ```

### Шаг 3: Анализ результатов

**⚠️ КРИТИЧЕСКИЕ ВОПРОСЫ:**

1. **Проверьте индексацию:**
   - Ячейка A1 должна быть `row=1, col=1` ИЛИ `row=0, col=0`?
   - Что показывают логи?

2. **Проверьте синхронизацию:**
   - Все ли 3 ячейки синхронизировались?
   - Правильные ли значения были переданы в HyperFormula?

3. **Проверьте результат HyperFormula:**
   - Что вернул `hf.getCellValue()`?
   - Если 0 → проблема в HyperFormula API
   - Если null/undefined → проблема в адресации
   - Если error object → проблема в формуле

---

## 🔍 Что искать в логах

### ✅ Хорошие признаки:
- `→ Setting VALUE: 5 (number)` - числа правильно конвертируются
- `→ Setting FORMULA: "=SUM(A1:B1)"` - формула с "="
- `Result from HyperFormula: 8 (type: number)` - правильный результат

### ❌ Плохие признаки:
- `→ Setting VALUE: "5" (string)` - числа остались строками
- `Row=0, col=0` для ячейки A1 - неправильная индексация
- `Result from HyperFormula: 0` - HyperFormula не видит данные
- `Result from HyperFormula: null` - адрес не найден
- `Result from HyperFormula: { type: 'ERROR', ... }` - ошибка в формуле

---

## 📊 Запись результатов

### Тест выполнен: [Дата/Время]

**Результат в ячейке C1:** ___________

**Логи из консоли:**
```
[Вставить сюда полные логи]
```

**Найденные проблемы:**
1. 
2. 
3. 

**Гипотезы:**
1. 
2. 
3. 

---

## 🎯 Дополнительные тесты

### Тест 2: Простая формула A1+B1
```
A1 = 5
B1 = 3
C1 = =A1+B1
Ожидается: 8
```

### Тест 3: Функция AVERAGE
```
A1 = 10
A2 = 20
A3 = 30
A4 = =AVERAGE(A1:A3)
Ожидается: 20
```

### Тест 4: IF функция
```
A1 = 10
B1 = =IF(A1>5, "Yes", "No")
Ожидается: "Yes"
```

---

## 🔧 Следующие шаги после тестирования

1. Скопировать логи в `FORMULA_ENGINE_INVESTIGATION.md`
2. Проанализировать находки
3. Определить root cause
4. Применить исправление
5. Повторить тест
6. Убрать debug логи из production

---

**Status:** 🟡 Awaiting Test Results  
**Priority:** 🔥 Critical
