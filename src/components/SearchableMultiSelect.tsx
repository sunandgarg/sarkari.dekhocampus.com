import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface SearchableMultiSelectProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
}

export function SearchableMultiSelect({ options, value, onChange, placeholder }: SearchableMultiSelectProps) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? options.filter((option) => option.toLowerCase().includes(query)) : options;
  }, [options, search]);

  const toggle = (option: string) => {
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  };

  return (
    <div className="space-y-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="h-10 w-full justify-between rounded-xl font-normal">
            <span className={value.length ? "text-foreground" : "text-muted-foreground"}>
              {value.length ? `${value.length} ${value.length === 1 ? "city" : "cities"} selected` : placeholder}
            </span>
            <Search className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(420px,calc(100vw-2rem))] p-0">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search any Indian city..." className="pl-8" />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {filtered.length ? filtered.map((option) => {
              const selected = value.includes(option);
              return (
                <button key={option} type="button" onClick={() => toggle(option)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted">
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                  <span>{option}</span>
                </button>
              );
            }) : <p className="p-4 text-center text-sm text-muted-foreground">No city found</p>}
          </div>
          {value.length > 0 && (
            <div className="border-t p-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>Clear all cities</Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
          {value.map((city) => (
            <Badge key={city} variant="secondary" className="gap-1">
              {city}
              <button type="button" onClick={() => toggle(city)} aria-label={`Remove ${city}`}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
