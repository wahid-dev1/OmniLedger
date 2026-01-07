import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, Calendar, Package } from "lucide-react";
import { generatePDFReport } from "@/lib/pdfGenerator";
import { PDFPreviewDialog } from "./PDFPreviewDialog";
import { useCompanyCurrency } from "../../hooks/useCompanyCurrency";

interface BatchExpiryReportProps {
  companyId: string;
  dateRange: { from: string; to: string };
  onPrintPDF?: () => void;
}

interface Batch {
  id: string;
  batchNumber: string;
  quantity: number | string;
  availableQuantity: number | string;
  expiryDate: string | null;
  manufacturingDate: string | null;
  product: {
    id: string;
    sku: string;
    name: string;
  };
}

type ExpiryFilter = "all" | "expiring_soon" | "expired" | "no_expiry";

export function BatchExpiryReport({ companyId, dateRange, onPrintPDF }: BatchExpiryReportProps) {
  const { format } = useCompanyCurrency(companyId);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [company, setCompany] = useState<{ name: string; address?: string; phone?: string; email?: string } | null>(null);
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>("expiring_soon");
  const [daysAhead, setDaysAhead] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadCompany();
      loadBatches();
    }
  }, [companyId, expiryFilter, daysAhead]);

  const loadCompany = async () => {
    try {
      const result = await (window as any).electronAPI?.getCompany(companyId);
      if (result?.success && result.data) {
        setCompany({
          name: result.data.name,
          address: result.data.address,
          phone: result.data.phone,
          email: result.data.email,
        });
      }
    } catch (error) {
      console.error("Error loading company:", error);
    }
  };

  const loadBatches = async () => {
    setLoading(true);
    try {
      const result = await (window as any).electronAPI?.getAllBatches(companyId);
      
      if (result?.success && result.data) {
        let filtered = result.data;

        // Filter by expiry status
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + daysAhead);
        futureDate.setHours(23, 59, 59, 999);

        if (expiryFilter === "expiring_soon") {
          filtered = filtered.filter((b: Batch) => {
            if (!b.expiryDate) return false;
            const expiry = new Date(b.expiryDate);
            return expiry >= today && expiry <= futureDate;
          });
        } else if (expiryFilter === "expired") {
          filtered = filtered.filter((b: Batch) => {
            if (!b.expiryDate) return false;
            return new Date(b.expiryDate) < today;
          });
        } else if (expiryFilter === "no_expiry") {
          filtered = filtered.filter((b: Batch) => !b.expiryDate);
        }
        // "all" shows everything

        setBatches(filtered);
      }
    } catch (error) {
      console.error("Error loading batch expiry report:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilExpiry = (expiryDate: string | null): number | null => {
    if (!expiryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handlePrintPDF = async () => {
    if (!company) return;

    const reportData = {
      title: "Batch Expiry Report",
      company: company.name,
      address: company.address,
      phone: company.phone,
      email: company.email,
      filter: expiryFilter,
      data: batches.map((b) => {
        const quantity = typeof b.quantity === 'number' ? b.quantity : parseFloat(b.quantity.toString());
        const available = typeof b.availableQuantity === 'number' 
          ? b.availableQuantity 
          : parseFloat(b.availableQuantity.toString());
        const daysUntil = getDaysUntilExpiry(b.expiryDate);
        
        return {
          batchNumber: b.batchNumber,
          productSKU: b.product.sku,
          productName: b.product.name,
          quantity: quantity,
          availableQuantity: available,
          expiryDate: b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "N/A",
          daysUntilExpiry: daysUntil !== null ? `${daysUntil} days` : "N/A",
          status: daysUntil === null ? "No Expiry" : daysUntil < 0 ? "Expired" : daysUntil <= 30 ? "Expiring Soon" : "OK",
        };
      }),
    };

    await generatePDFReport(reportData);
    setPreviewOpen(true);
  };

  // Register PDF handler
  useEffect(() => {
    (window as any).currentReportPDF = handlePrintPDF;
    return () => {
      delete (window as any).currentReportPDF;
    };
  }, [batches, company, expiryFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const expiredCount = batches.filter((b) => {
    if (!b.expiryDate) return false;
    return new Date(b.expiryDate) < new Date();
  }).length;

  const expiringSoonCount = batches.filter((b) => {
    if (!b.expiryDate) return false;
    const daysUntil = getDaysUntilExpiry(b.expiryDate);
    return daysUntil !== null && daysUntil >= 0 && daysUntil <= daysAhead;
  }).length;

  return (
    <>
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expiry Status</Label>
                <Select value={expiryFilter} onValueChange={(value) => setExpiryFilter(value as ExpiryFilter)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="no_expiry">No Expiry Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {expiryFilter === "expiring_soon" && (
                <div className="space-y-2">
                  <Label>Days Ahead</Label>
                  <Select 
                    value={daysAhead.toString()} 
                    onValueChange={(value) => setDaysAhead(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="15">15 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{batches.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Expired
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{expiredCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-yellow-600" />
                Expiring Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{expiringSoonCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Batch List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Batch Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {batches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No batches found for the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-medium">Batch #</th>
                      <th className="text-left p-3 text-sm font-medium">Product</th>
                      <th className="text-left p-3 text-sm font-medium">SKU</th>
                      <th className="text-right p-3 text-sm font-medium">Quantity</th>
                      <th className="text-right p-3 text-sm font-medium">Available</th>
                      <th className="text-left p-3 text-sm font-medium">Expiry Date</th>
                      <th className="text-left p-3 text-sm font-medium">Days Until</th>
                      <th className="text-left p-3 text-sm font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((batch) => {
                      const quantity = typeof batch.quantity === 'number' 
                        ? batch.quantity 
                        : parseFloat(batch.quantity.toString());
                      const available = typeof batch.availableQuantity === 'number' 
                        ? batch.availableQuantity 
                        : parseFloat(batch.availableQuantity.toString());
                      const daysUntil = getDaysUntilExpiry(batch.expiryDate);
                      
                      let statusColor = "bg-gray-100 text-gray-800";
                      let statusText = "OK";
                      
                      if (daysUntil === null) {
                        statusColor = "bg-blue-100 text-blue-800";
                        statusText = "No Expiry";
                      } else if (daysUntil < 0) {
                        statusColor = "bg-red-100 text-red-800";
                        statusText = "Expired";
                      } else if (daysUntil <= 30) {
                        statusColor = "bg-yellow-100 text-yellow-800";
                        statusText = "Expiring Soon";
                      }

                      return (
                        <tr key={batch.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 text-sm font-mono">{batch.batchNumber}</td>
                          <td className="p-3 text-sm">{batch.product.name}</td>
                          <td className="p-3 text-sm font-mono text-muted-foreground">{batch.product.sku}</td>
                          <td className="p-3 text-sm text-right">{quantity}</td>
                          <td className="p-3 text-sm text-right">{available}</td>
                          <td className="p-3 text-sm">
                            {batch.expiryDate ? (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {new Date(batch.expiryDate).toLocaleDateString()}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </td>
                          <td className="p-3 text-sm">
                            {daysUntil !== null ? (
                              <span className={daysUntil < 0 ? 'text-red-600 font-semibold' : daysUntil <= 30 ? 'text-yellow-600 font-semibold' : ''}>
                                {daysUntil} days
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${statusColor}`}>
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PDFPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} />
    </>
  );
}

