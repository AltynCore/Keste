import { ZipReader } from './zip';
import { XmlSaxParser } from './xml_sax';
import type { WorkbookModel, SheetModel, CellData, CellXfsStyle, MergedRange, DefinedName } from './types';

export async function readXlsxToModel(buffer: ArrayBuffer): Promise<WorkbookModel> {
  const zip = new ZipReader(buffer);
  const entries = await zip.readEntries();

  const model: WorkbookModel = {
    id: crypto.randomUUID(),
    sheets: [],
    sharedStrings: [],
    numFmts: new Map(),
    styles: [],
    definedNames: [],
  };

  // 1. Parse sharedStrings
  const sstData = entries.get('xl/sharedStrings.xml');
  if (sstData) {
    model.sharedStrings = parseSharedStrings(sstData);
  }

  // 2. Parse styles
  const stylesData = entries.get('xl/styles.xml');
  if (stylesData) {
    const { numFmts, styles } = parseStyles(stylesData);
    model.numFmts = numFmts;
    model.styles = styles;
  }

  // 3. Parse workbook (sheets list, defined names)
  const wbData = entries.get('xl/workbook.xml');
  if (!wbData) {
    throw new Error('workbook.xml not found');
  }

  const { sheets, definedNames } = parseWorkbook(wbData);
  model.definedNames = definedNames;

  // 4. Parse each sheet
  for (const sheetInfo of sheets) {
    const sheetData = entries.get(`xl/worksheets/sheet${sheetInfo.sheetId}.xml`);
    if (sheetData) {
      const sheet = parseSheet(sheetData, sheetInfo.id, sheetInfo.name, sheetInfo.sheetId, model.sharedStrings);
      model.sheets.push(sheet);
    }
  }

  return model;
}

function parseSharedStrings(data: Uint8Array): string[] {
  const strings: string[] = [];
  const parser = new XmlSaxParser();
  let currentText = '';
  let inT = false;

  parser.parse(data, {
    onStartElement: (name) => {
      if (name === 't') {
        inT = true;
        currentText = '';
      }
    },
    onText: (text) => {
      if (inT) {
        currentText += text;
      }
    },
    onEndElement: (name) => {
      if (name === 't') {
        inT = false;
      } else if (name === 'si') {
        strings.push(currentText);
        currentText = '';
      }
    },
  });

  return strings;
}

function parseStyles(data: Uint8Array): { numFmts: Map<number, string>; styles: CellXfsStyle[] } {
  const numFmts = new Map<number, string>();
  const styles: CellXfsStyle[] = [];
  const parser = new XmlSaxParser();
  let inNumFmts = false;
  let inCellXfs = false;

  parser.parse(data, {
    onStartElement: (name, attrs) => {
      if (name === 'numFmts') {
        inNumFmts = true;
      } else if (name === 'cellXfs') {
        inCellXfs = true;
      } else if (name === 'numFmt' && inNumFmts) {
        const id = parseInt(attrs.get('numFmtId') || '0');
        const code = attrs.get('formatCode') || '';
        numFmts.set(id, code);
      } else if (name === 'xf' && inCellXfs) {
        const style: CellXfsStyle = {
          numFmtId: attrs.has('numFmtId') ? parseInt(attrs.get('numFmtId')!) : undefined,
          fontId: attrs.has('fontId') ? parseInt(attrs.get('fontId')!) : undefined,
          fillId: attrs.has('fillId') ? parseInt(attrs.get('fillId')!) : undefined,
          borderId: attrs.has('borderId') ? parseInt(attrs.get('borderId')!) : undefined,
          xfId: attrs.has('xfId') ? parseInt(attrs.get('xfId')!) : undefined,
        };
        styles.push(style);
      }
    },
    onEndElement: (name) => {
      if (name === 'numFmts') {
        inNumFmts = false;
      } else if (name === 'cellXfs') {
        inCellXfs = false;
      }
    },
  });

  return { numFmts, styles };
}

function parseWorkbook(data: Uint8Array): { sheets: Array<{ id: string; name: string; sheetId: number }>; definedNames: DefinedName[] } {
  const sheets: Array<{ id: string; name: string; sheetId: number }> = [];
  const definedNames: DefinedName[] = [];
  const parser = new XmlSaxParser();

  parser.parse(data, {
    onStartElement: (name, attrs) => {
      if (name === 'sheet') {
        sheets.push({
          id: attrs.get('r:id') || attrs.get('id') || '',
          name: attrs.get('name') || '',
          sheetId: parseInt(attrs.get('sheetId') || '1'),
        });
      } else if (name === 'definedName') {
        const dnName = attrs.get('name') || '';
        const localSheetId = attrs.has('localSheetId') ? parseInt(attrs.get('localSheetId')!) : undefined;
        definedNames.push({ name: dnName, ref: '', localSheetId });
      }
    },
  });

  return { sheets, definedNames };
}

function parseSheet(data: Uint8Array, id: string, name: string, sheetId: number, sharedStrings: string[]): SheetModel {
  const sheet: SheetModel = {
    id,
    name,
    sheetId,
    cells: new Map(),
    mergedRanges: [],
    rowProps: new Map(),
    colProps: new Map(),
  };

  const parser = new XmlSaxParser();
  let inSheetData = false;
  let currentCell: Partial<CellData> | null = null;
  let currentCellRef = '';

  parser.parse(data, {
    onStartElement: (name, attrs) => {
      if (name === 'sheetData') {
        inSheetData = true;
      } else if (name === 'row' && inSheetData) {
        const r = parseInt(attrs.get('r') || '0');
        const ht = attrs.get('ht');
        const hidden = attrs.get('hidden') === '1';
        if (ht || hidden) {
          sheet.rowProps.set(r, {
            row: r,
            height: ht ? parseFloat(ht) : undefined,
            hidden,
            customHeight: attrs.get('customHeight') === '1',
          });
        }
      } else if (name === 'c' && inSheetData) {
        currentCellRef = attrs.get('r') || '';
        const { row, col } = parseCellRef(currentCellRef);
        const type = (attrs.get('t') || 'n') as CellData['type'];
        const s = attrs.get('s');

        currentCell = {
          row,
          col,
          type,
          value: null,
          styleId: s ? parseInt(s) : undefined,
        };
      } else if (name === 'f' && currentCell) {
        // Formula will be captured in text
      } else if (name === 'mergeCell') {
        const ref = attrs.get('ref') || '';
        sheet.mergedRanges.push({ ref });
      } else if (name === 'col') {
        const min = parseInt(attrs.get('min') || '0');
        const width = attrs.get('width');
        const hidden = attrs.get('hidden') === '1';
        if (width || hidden) {
          sheet.colProps.set(min, {
            col: min,
            width: width ? parseFloat(width) : undefined,
            hidden,
            customWidth: attrs.get('customWidth') === '1',
          });
        }
      } else if (name === 'pane') {
        if (!sheet.sheetView) sheet.sheetView = {};
        sheet.sheetView.pane = {
          xSplit: attrs.has('xSplit') ? parseInt(attrs.get('xSplit')!) : undefined,
          ySplit: attrs.has('ySplit') ? parseInt(attrs.get('ySplit')!) : undefined,
          topLeftCell: attrs.get('topLeftCell'),
          state: attrs.get('state'),
        };
      }
    },
    onText: (text) => {
      if (currentCell) {
        if (currentCell.type === 's') {
          // Shared string index
          const idx = parseInt(text);
          currentCell.value = sharedStrings[idx] || '';
        } else if (currentCell.type === 'n') {
          currentCell.value = parseFloat(text);
        } else if (currentCell.type === 'b') {
          currentCell.value = text === '1';
        } else {
          currentCell.value = text;
        }
      }
    },
    onEndElement: (name) => {
      if (name === 'sheetData') {
        inSheetData = false;
      } else if (name === 'c' && currentCell) {
        sheet.cells.set(currentCellRef, currentCell as CellData);
        currentCell = null;
        currentCellRef = '';
      }
    },
  });

  return sheet;
}

function parseCellRef(ref: string): { row: number; col: number } {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { row: 0, col: 0 };

  const colStr = match[1];
  const rowStr = match[2];

  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }

  return { row: parseInt(rowStr), col };
}
