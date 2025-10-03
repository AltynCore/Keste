export interface WorkbookModel {
  id: string;
  sheets: SheetModel[];
  sharedStrings: string[];
  numFmts: Map<number, string>;
  styles: CellXfsStyle[];
  definedNames: DefinedName[];
}

export interface SheetModel {
  id: string;
  name: string;
  sheetId: number;
  cells: Map<string, CellData>;
  mergedRanges: MergedRange[];
  rowProps: Map<number, RowProp>;
  colProps: Map<number, ColProp>;
  sheetView?: SheetView;
}

export interface CellData {
  row: number;
  col: number;
  type: 'n' | 's' | 'b' | 'd' | 'str' | 'e' | 'inlineStr';
  value: string | number | boolean | null;
  formula?: string;
  styleId?: number;
}

export interface CellXfsStyle {
  numFmtId?: number;
  fontId?: number;
  fillId?: number;
  borderId?: number;
  xfId?: number;
}

export interface MergedRange {
  ref: string; // e.g., "A1:B2"
}

export interface RowProp {
  row: number;
  height?: number;
  hidden?: boolean;
  customHeight?: boolean;
}

export interface ColProp {
  col: number;
  width?: number;
  hidden?: boolean;
  customWidth?: boolean;
}

export interface DefinedName {
  name: string;
  ref: string;
  localSheetId?: number;
}

export interface SheetView {
  pane?: {
    xSplit?: number;
    ySplit?: number;
    topLeftCell?: string;
    state?: string;
  };
}

export interface CellView {
  row: number;
  col: number;
  value: string;
  formula?: string;
  style?: CellXfsStyle;
}
