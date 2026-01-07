import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, X } from "lucide-react";

interface PDFPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: () => void;
  title?: string;
  subtitle?: string;
  dateRange?: { from: string; to: string };
  summary?: Array<{ label: string; value: string | number }>;
  columns?: Array<{ header: string; dataKey: string; align?: 'left' | 'center' | 'right' }>;
  data?: Array<{ [key: string]: string | number }>;
}

export function PDFPreviewDialog({
  open,
  onClose,
  onGenerate,
  title = 'Report Preview',
  subtitle,
  dateRange,
  summary,
  columns = [],
  data = [],
}: PDFPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            PDF Preview - {title}
          </DialogTitle>
          <DialogDescription>
            Review the report data before generating the PDF
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Preview Header */}
          <div className="text-center border-b pb-4">
            <h2 className="text-2xl font-bold">{title}</h2>
            {subtitle && (
              <p className="text-muted-foreground mt-1">{subtitle}</p>
            )}
            {dateRange && (
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(dateRange.from).toLocaleDateString()} - {new Date(dateRange.to).toLocaleDateString()}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Preview generated on {new Date().toLocaleString()}
            </p>
          </div>

          {/* Summary Cards */}
          {summary && summary.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {summary.map((item, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {item.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-xl font-bold">
                      {typeof item.value === 'number' 
                        ? (item.value % 1 === 0 ? item.value.toString() : item.value.toFixed(2))
                        : item.value}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Report Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {columns && columns.length > 0 ? columns.map((col, index) => (
                        <th
                          key={index}
                          className={`p-3 text-sm font-medium ${
                            col.align === 'right' ? 'text-right' :
                            col.align === 'center' ? 'text-center' :
                            'text-left'
                          }`}
                        >
                          {col.header}
                        </th>
                      )) : (
                        <th className="p-3 text-sm font-medium text-left">No columns defined</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {!data || data.length === 0 ? (
                      <tr>
                        <td
                          colSpan={columns?.length || 1}
                          className="text-center p-8 text-muted-foreground"
                        >
                          No data available
                        </td>
                      </tr>
                    ) : (
                      data.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className={`border-b ${rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}
                        >
                          {columns && columns.length > 0 ? columns.map((col, colIndex) => {
                            const value = row[col.dataKey];
                            const displayValue = value === null || value === undefined
                              ? '-'
                              : typeof value === 'number'
                              ? (value % 1 === 0 ? value.toString() : value.toFixed(2))
                              : value.toString();

                            return (
                              <td
                                key={colIndex}
                                className={`p-3 text-sm ${
                                  col.align === 'right' ? 'text-right' :
                                  col.align === 'center' ? 'text-center' :
                                  'text-left'
                                }`}
                              >
                                {displayValue}
                              </td>
                            );
                          }) : (
                            <td className="p-3 text-sm text-left">No columns defined</td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                  {data && data.length > 0 && columns && columns.length > 0 && (
                    <tfoot className="border-t-2 bg-muted/50">
                      <tr>
                        <td colSpan={columns.length} className="p-3 text-sm font-medium text-center">
                          Total Records: {data.length}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={onGenerate}>
            <Printer className="h-4 w-4 mr-2" />
            Generate PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

