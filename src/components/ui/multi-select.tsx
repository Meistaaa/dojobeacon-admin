import * as React from "react";
import { cn } from "../../lib/utils";

type Option = {
  label: string;
  value: string;
};

type MultiSelectChange = (values: string[]) => void;

export interface MultiSelectProps {
  options: Option[];
  value: string[];
  onValueChange: MultiSelectChange;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select permissions",
  disabled,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const toggleValue = (nextValue: string) => {
    if (value.includes(nextValue)) {
      onValueChange(value.filter((val) => val !== nextValue));
    } else {
      onValueChange([...value, nextValue]);
    }
  };

  const summary =
    value.length === 0
      ? placeholder
      : value
          .map((val) => options.find((opt) => opt.value === val)?.label || val)
          .join(", ");

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "h-10 w-full rounded-lg border border-input bg-background px-3 text-left text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled && "opacity-60 cursor-not-allowed"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {summary}
      </button>
      {open && (
        <div
          className="absolute z-50 mt-2 w-full rounded-lg border border-border bg-card p-2 shadow-lg"
          role="listbox"
          aria-multiselectable="true"
        >
          <div className="max-h-56 overflow-auto">
            {options.map((option) => {
              const checked = value.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleValue(option.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted",
                    checked && "bg-muted"
                  )}
                  role="option"
                  aria-selected={checked}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border border-border text-[10px]",
                      checked && "bg-foreground text-background"
                    )}
                  >
                    {checked ? "✓" : ""}
                  </span>
                  <span>{option.label}</span>
                </button>
              );
            })}
            {options.length === 0 && (
              <div className="px-2 py-2 text-xs text-muted-foreground">
                No permissions available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
