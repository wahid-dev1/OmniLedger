import {
  ChevronRight,
  Copy,
  ExternalLink,
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  Trash2,
} from "lucide-react";
import type { Company } from "@shared/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CompanyCardProps = {
  company: Company;
  onOpen: (company: Company) => void;
  onEdit: (company: Company) => void;
  onDuplicate?: (company: Company) => void;
  onDelete?: (company: Company) => void;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "CO";
}

function formatCreatedDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function CompanyCard({
  company,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
}: CompanyCardProps) {
  const handleOpen = () => onOpen(company);
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(company);
  };
  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate?.(company);
  };
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(company);
  };

  return (
    <article
      onClick={handleOpen}
      className="group flex cursor-pointer flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md"
      aria-label={`Open company ${company.name}`}
    >
      {/* Company Header: avatar (36px) + name (15px, font-600) | three-dot menu */}
      <header className="mb-1.5 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
            aria-hidden
          >
            {getInitials(company.name)}
          </div>
          <h2 className="truncate text-[15px] font-semibold leading-tight">
            {company.name}
          </h2>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={handleOpen}>
              <ExternalLink className="h-4 w-4" />
              Open Company
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="h-4 w-4" />
              Edit Company
            </DropdownMenuItem>
            {onDuplicate && (
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4" />
                Duplicate Company
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete Company
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Address: plain text, truncated */}
      {company.address && (
        <p className="mb-1.5 truncate text-sm text-muted-foreground">
          {company.address}
        </p>
      )}

      {/* Contact row: phone + email (icons only for these) */}
      {(company.phone || company.email) && (
        <div className="mb-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
          {company.phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              <span>{company.phone}</span>
            </span>
          )}
          {company.email && (
            <span className="flex min-w-0 items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="truncate">{company.email}</span>
            </span>
          )}
        </div>
      )}

      {/* Created date: muted */}
      <p className="text-xs text-muted-foreground/80">
        Created {formatCreatedDate(company.createdAt)}
      </p>

      {/* Subtle Open indicator */}
      <div className="mt-2 flex items-center justify-end">
        <span className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
          Open
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </article>
  );
}
