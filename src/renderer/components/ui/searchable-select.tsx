import * as React from "react";
import { Search, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  placeholder,
  disabled,
  searchPlaceholder = "Search...",
  children,
  className,
  id,
}: SearchableSelectProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Helper function to extract text from React node
  const extractText = (node: React.ReactNode): string => {
    if (typeof node === "string" || typeof node === "number") {
      return String(node);
    }
    if (React.isValidElement(node)) {
      if (node.props.children) {
        return extractText(node.props.children);
      }
      // Try to get text from props if available
      if (node.props.value) {
        return String(node.props.value);
      }
    }
    if (Array.isArray(node)) {
      return node.map(extractText).join(" ");
    }
    return "";
  };

  // Filter children based on search query
  const filteredChildren = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return React.Children.toArray(children);
    }

    const query = searchQuery.toLowerCase().trim();
    return React.Children.toArray(children).filter((child) => {
      // Always show non-SelectItem children (like empty state messages)
      if (React.isValidElement(child) && child.type !== SelectItem) {
        return true;
      }
      
      if (React.isValidElement(child)) {
        const text = extractText(child.props.children).toLowerCase();
        // Also search by value prop if available (useful for codes, IDs, etc.)
        const value = child.props.value ? String(child.props.value).toLowerCase() : "";
        return text.includes(query) || value.includes(query);
      }
      return true;
    });
  }, [children, searchQuery]);

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (open && searchInputRef.current) {
      // Small delay to ensure the dropdown is fully rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery("");
    }
  }, [open]);

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      open={open}
      onOpenChange={setOpen}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div className="sticky top-0 z-10 bg-popover border-b px-2 py-1.5">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                // Prevent closing dropdown when typing
                e.stopPropagation();
                // Close on Escape
                if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              className="pl-8 pr-8 h-8 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {filteredChildren.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              No results found
            </div>
          ) : (
            filteredChildren
          )}
        </div>
      </SelectContent>
    </Select>
  );
}

