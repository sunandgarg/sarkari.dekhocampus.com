import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpenCheck, Building2, FileCheck2, GraduationCap, Search, ShieldCheck } from "lucide-react";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type SarkariSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const browseActions = [
  { label: "Latest government jobs", hint: "Open vacancies and online forms", href: "/?category=Latest%20Jobs", icon: Building2 },
  { label: "Results", hint: "Recently declared exam results", href: "/?category=Results", icon: FileCheck2 },
  { label: "Admit cards", hint: "Hall tickets and exam-city updates", href: "/?category=Admit%20Card", icon: BookOpenCheck },
  { label: "Answer keys", hint: "Provisional and final answer keys", href: "/?category=Answer%20Key", icon: ShieldCheck },
  { label: "Admissions", hint: "Applications, counselling and seats", href: "/?category=Admissions", icon: GraduationCap },
];

const popularSearches = ["Railway", "SSC", "Banking", "UPSC", "Teaching"];

export function SarkariSearchDialog({ open, onOpenChange }: SarkariSearchDialogProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const go = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  const search = () => {
    const value = query.trim();
    go(value ? `/?q=${encodeURIComponent(value)}` : "/");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sarkari-search-dialog max-w-xl overflow-hidden rounded-xl border-border p-0 shadow-2xl">
        <DialogTitle className="sr-only">Search Sarkari updates</DialogTitle>
        <DialogDescription className="sr-only">Search government jobs, results, admit cards and other Sarkari updates.</DialogDescription>
        <Command className="rounded-xl" shouldFilter>
          <form onSubmit={(event) => { event.preventDefault(); search(); }}>
            <CommandInput value={query} onValueChange={setQuery} autoFocus placeholder="Search exam, department, post or notification..." aria-label="Search Sarkari updates" />
          </form>
          <CommandList className="max-h-[min(430px,70vh)] p-2">
            {query.trim() && (
              <CommandGroup heading="Search all updates">
                <CommandItem value={`Search ${query}`} onSelect={search} className="gap-3 rounded-lg px-3 py-3">
                  <Search className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">Search for “{query.trim()}”</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Browse by update type">
              {browseActions.map((action) => (
                <CommandItem key={action.href} value={`${action.label} ${action.hint}`} onSelect={() => go(action.href)} className="gap-3 rounded-lg px-3 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><action.icon className="h-4 w-4" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1"><strong className="block text-sm">{action.label}</strong><small className="block truncate text-xs text-muted-foreground">{action.hint}</small></span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Popular searches">
              {popularSearches.map((label) => (
                <CommandItem key={label} value={label} onSelect={() => go(`/?q=${encodeURIComponent(label)}`)} className="min-h-11 rounded-lg px-3 py-2.5">
                  <Search className="mr-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {label}
                  <CommandShortcut>Search</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="flex items-center justify-between border-t bg-muted/35 px-4 py-2 text-[11px] text-muted-foreground">
            <span>↑ ↓ to browse · Enter to open</span>
            <span>Esc to close</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
