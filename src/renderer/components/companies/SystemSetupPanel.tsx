import { Database, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SAMPLE_CATEGORY_OPTIONS,
  type SampleCategory,
} from "@shared/sample-categories";

type SystemSetupPanelProps = {
  sampleCategory: SampleCategory;
  onSampleCategoryChange: (value: SampleCategory) => void;
  onLoadSampleCompany: () => void;
  onLoadAllSampleCompanies: () => void;
  onOpenDatabaseSettings: () => void;
  loadingSample: boolean;
};

export function SystemSetupPanel({
  sampleCategory,
  onSampleCategoryChange,
  onLoadSampleCompany,
  onLoadAllSampleCompanies,
  onOpenDatabaseSettings,
  loadingSample,
}: SystemSetupPanelProps) {
  return (
    <section
      aria-label="System setup"
      className="rounded-xl border border-border bg-muted/30 p-[18px] shadow-sm"
    >
      <h2 className="mb-3 text-sm font-semibold">System Setup</h2>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={sampleCategory}
          onValueChange={(v) => onSampleCategoryChange(v as SampleCategory)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Company type" />
          </SelectTrigger>
          <SelectContent>
            {SAMPLE_CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={onLoadSampleCompany}
            disabled={loadingSample}
          >
            {loadingSample ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Load Sample Company
          </Button>

          <Button
            variant="outline"
            onClick={onLoadAllSampleCompanies}
            disabled={loadingSample}
          >
            {loadingSample ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Load All Sample Companies
          </Button>

          <Button variant="ghost" onClick={onOpenDatabaseSettings}>
            <Database className="mr-2 h-4 w-4" />
            Database Settings
          </Button>
        </div>
      </div>
    </section>
  );
}
