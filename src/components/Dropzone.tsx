import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, Loader2, Plus } from 'lucide-react';
import { readXlsxToModel } from '../core-ts/read_xlsx';
import type { WorkbookModel } from '../core-ts/types';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

interface DropzoneProps {
  onFileLoad: (workbook: WorkbookModel) => void;
  onError: (error: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

function Dropzone({ onFileLoad, onError, loading, setLoading }: DropzoneProps) {
  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.kst')) {
        onError('Please select an .xlsx or .kst file');
        return;
      }

      setLoading(true);
      try {
        const buffer = await file.arrayBuffer();
        const workbook = await readXlsxToModel(buffer);
        onFileLoad(workbook);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to parse file');
      } finally {
        setLoading(false);
      }
    },
    [onFileLoad, onError, setLoading]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleNewSpreadsheet = useCallback(() => {
    // Create empty workbook
    const emptyWorkbook: WorkbookModel = {
      id: crypto.randomUUID(),
      sheets: [{
        id: 'sheet1',
        name: 'Sheet1',
        sheetId: 1,
        cells: new Map(),
        mergedRanges: [],
        rowProps: new Map(),
        colProps: new Map(),
      }],
      sharedStrings: [],
      numFmts: new Map(),
      styles: [],
      definedNames: [],
    };
    onFileLoad(emptyWorkbook);
  }, [onFileLoad]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-block mb-6"
          >
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-6 rounded-2xl shadow-lg">
              <FileSpreadsheet className="w-16 h-16 text-white" strokeWidth={1.5} />
            </div>
          </motion.div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-3">
            Keste
          </h1>
          <p className="text-xl text-slate-600 mb-2">
            Modern Spreadsheet Editor
          </p>
          <p className="text-sm text-slate-500">
            Powered by SQLite • Work offline • Your data, your control
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="border-2 hover:border-primary transition-all hover:shadow-lg cursor-pointer"
                onClick={handleNewSpreadsheet}>
            <CardContent className="p-8 text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">New Spreadsheet</h3>
              <p className="text-sm text-muted-foreground">
                Start with a blank workbook
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-dashed border-slate-300 hover:border-primary transition-colors">
            <CardContent
              className="p-8"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {loading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-3"
                >
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  <p className="text-sm font-medium text-slate-900">Processing...</p>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Upload className="w-12 h-12 text-slate-400" />
                  <div className="text-center">
                    <p className="font-semibold mb-1">Import File</p>
                    <p className="text-xs text-muted-foreground mb-3">or drag & drop</p>
                  </div>
                  <label htmlFor="file-input">
                    <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                      <span>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Choose File
                      </span>
                    </Button>
                  </label>
                  <input
                    id="file-input"
                    type="file"
                    accept=".xlsx,.kst"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <p className="text-xs text-slate-500">
                    .xlsx or .kst files
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            {
              icon: '🔒',
              title: 'Privacy First',
              desc: '100% offline & local',
              color: 'from-blue-500/10 to-blue-600/10'
            },
            {
              icon: '⚡',
              title: 'Lightning Fast',
              desc: 'SQLite-powered performance',
              color: 'from-amber-500/10 to-orange-600/10'
            },
            {
              icon: '🎯',
              title: 'Google Sheets-like',
              desc: 'Familiar interface',
              color: 'from-emerald-500/10 to-teal-600/10'
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <Card className={`bg-gradient-to-br ${feature.color} border-0`}>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">{feature.icon}</div>
                  <h3 className="font-semibold text-sm text-slate-900 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-slate-600">{feature.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default Dropzone;
